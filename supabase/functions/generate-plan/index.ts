import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { withCors, validateAuth, errorResponse, successResponse } from "../_shared/auth.ts";
import { callAIText } from "../_shared/ai.ts";

serve(withCors(async (req) => {
  try {
    const body = await req.json();
    const auth = await validateAuth(req, body);
    const { userId, supabase } = auth;

    console.log(`Generating study plan for user: ${userId} (authenticated: ${auth.isAuthenticated})`);

    const { data: contexts } = await supabase.from("study_contexts").select("content, file_name").eq("user_id", userId);
    const { data: events } = await supabase.from("study_events").select("*").eq("user_id", userId).order("event_date", { ascending: true });

    if (!contexts || contexts.length === 0) {
      return errorResponse("Nessun contenuto di studio trovato. Carica dei PDF.", 400);
    }

    const { data: userProfile } = await supabase.from("user_profiles").select("institute_type, subject_levels").eq("user_id", userId).maybeSingle();

    // ============================================================
    // Calibration: compute per-subject load factor from session logs
    // Factor = avg(actual_duration) / avg(estimated_duration)
    // Clamped to [0.5, 2.5] to prevent outliers from skewing plans.
    // ============================================================
    const CALIB_MIN = 0.5;
    const CALIB_MAX = 2.5;
    const calibrationFactors: Record<string, number> = {};
    try {
      const { data: logs } = await supabase
        .from("study_sessions_logs")
        .select("subject_name, estimated_duration, actual_duration")
        .eq("user_id", userId)
        .not("subject_name", "is", null)
        .not("estimated_duration", "is", null)
        .gt("estimated_duration", 0);

      const agg: Record<string, { est: number; act: number; n: number }> = {};
      for (const l of (logs ?? []) as Array<{ subject_name: string; estimated_duration: number; actual_duration: number }>) {
        const k = l.subject_name;
        if (!agg[k]) agg[k] = { est: 0, act: 0, n: 0 };
        agg[k].est += l.estimated_duration;
        agg[k].act += l.actual_duration;
        agg[k].n += 1;
      }
      for (const [subject, v] of Object.entries(agg)) {
        if (v.est <= 0) continue;
        const avgEst = v.est / v.n;
        const avgAct = v.act / v.n;
        const raw = avgAct / avgEst;
        calibrationFactors[subject] = Math.min(CALIB_MAX, Math.max(CALIB_MIN, raw));
      }
    } catch (e) {
      console.error("Calibration lookup failed:", (e as Error).message);
    }
    console.log("Calibration factors:", calibrationFactors);

    const calibrationInfo = Object.keys(calibrationFactors).length > 0
      ? `\nFATTORI DI CALIBRAZIONE PERSONALI (Rapporto di Carico reale/stimato per materia):
${Object.entries(calibrationFactors).map(([s, f]) => `- ${s}: ${f.toFixed(2)}x`).join("\n")}
ISTRUZIONE OBBLIGATORIA: per ogni sessione, calcola prima il tempo teorico standard per il compito, poi MOLTIPLICALO per il fattore della materia corrispondente ed usa il risultato come "durationMinutes". Se una materia non ha un fattore, usa 1.0. Non scendere sotto 15 minuti né superare 120 minuti per singola sessione.`
      : "\nNessun log storico disponibile: usa il tempo teorico standard (fattore 1.0) per ogni sessione.";

    const instituteMap: Record<string, string> = {
      liceo_scientifico: "Liceo Scientifico", liceo_classico: "Liceo Classico",
      liceo_linguistico: "Liceo Linguistico", istituto_tecnico: "Istituto Tecnico",
    };
    let profileInfo = "";
    if (userProfile) {
      profileInfo = `\nPROFILO STUDENTE: ${instituteMap[userProfile.institute_type] || userProfile.institute_type}`;
      if (userProfile.subject_levels && typeof userProfile.subject_levels === "object") {
        const levels = userProfile.subject_levels as Record<string, number>;
        profileInfo += "\nLivelli: " + Object.entries(levels).map(([s, l]) => `${s}: ${l}/10`).join(", ");
      }
      profileInfo += "\nDai più tempo alle materie dove lo studente ha un livello basso.";
    }

    const contextSummary = contexts
      .map((c: { file_name: string; content: string }) => `File: ${c.file_name}\nContenuto: ${c.content.substring(0, 2000)}...`)
      .join("\n\n").substring(0, 10000);

    const today = new Date().toISOString().split("T")[0];
    const eventsText = events && events.length > 0
      ? events.map((e: { event_type: string; title: string; subject: string; event_date: string }) => `- ${e.event_type}: ${e.title} (${e.subject}) - ${e.event_date}`).join("\n")
      : "Nessun evento programmato";

    const prompt = `Sei un tutor esperto che crea piani di studio personalizzati.
${profileInfo}${calibrationInfo}

IMPORTANTE: Rispondi SOLO con un oggetto JSON valido, senza markdown.

JSON richiesto:
{
  "explanation": "Ti propongo questo piano perché...",
  "studySessions": [
    { "subject": "nome materia", "title": "cosa studiare", "date": "YYYY-MM-DD", "time": "HH:MM", "estimatedMinutes": 30, "durationMinutes": 42 }
  ]
}

"estimatedMinutes" = tempo teorico standard prima della calibrazione.
"durationMinutes" = tempo effettivo pianificato = estimatedMinutes * fattoreDiCalibrazione della materia (arrotondato a 5 minuti).

Crea 3-5 sessioni nei prossimi 7 giorni. Data di oggi: ${today}

Eventi esistenti:
${eventsText}

Contenuti di studio:
${contextSummary}`;

    console.log("Calling AI for plan generation");

    const responseContent = await callAIText([{ role: "user", content: prompt }], 0.7, 4096);
    if (!responseContent) throw new Error("Risposta AI vuota");

    console.log("AI response:", responseContent.substring(0, 500));

    let plan;
    try {
      const cleaned = responseContent.replace(/```json\s*/gi, "").replace(/```/g, "").trim();
      try {
        plan = JSON.parse(cleaned);
      } catch {
        const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error("no json");
        plan = JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      console.error("Parse error, raw response:", responseContent);
      throw new Error("Errore nel parsing del piano generato");
    }

    // Server-side safety: re-apply the calibration factor so the returned
    // durations always respect the user's real load, even if the LLM ignores
    // the instruction. Clamp per-session between 15 and 120 minutes.
    const rawSessions: Array<Record<string, unknown>> = Array.isArray(plan.studySessions) ? plan.studySessions : [];
    const calibratedSessions = rawSessions.map((s) => {
      const subject = String(s.subject ?? "");
      const factor = calibrationFactors[subject] ?? 1;
      const est = Number(s.estimatedMinutes) > 0 ? Number(s.estimatedMinutes) : 30;
      const modelDuration = Number(s.durationMinutes);
      const computed = est * factor;
      const chosen = Number.isFinite(modelDuration) && modelDuration > 0 ? modelDuration : computed;
      const clamped = Math.min(120, Math.max(15, Math.round(chosen / 5) * 5));
      return {
        ...s,
        estimatedMinutes: est,
        calibrationFactor: factor,
        durationMinutes: clamped,
      };
    });

    return successResponse({
      success: true,
      plan: {
        explanation: plan.explanation || "Ti propongo questo piano basato sui tuoi materiali di studio.",
        studySessions: calibratedSessions,
        calibrationFactors,
      },
    });

  } catch (error) {
    console.error("Error:", error);
    return errorResponse("Errore nella generazione del piano. Riprova.");
  }
}));
