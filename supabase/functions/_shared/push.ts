// Helper per inviare notifiche Web Push a un utente.
// Itera sulle subscription della tabella `push_subscriptions` e rimuove
// quelle scadute (410/404). Non lancia mai: il fallimento dell'invio non
// deve compromettere il job principale (es. generazione lezione).
import webpush from "npm:web-push@3.6.7";

const VAPID_PUBLIC_KEY =
  "BAXm3i-O54rBBUA5ara0kvEMuzwLl1Rk-ZCdCczyxlJ9Mauni-KkzdXwYUpYnON0v9mrYzU3usm0sazZFMcEv2s";

let configured = false;
function ensureConfigured() {
  if (configured) return true;
  const privateKey = Deno.env.get("VAPID_PRIVATE_KEY");
  const subject = Deno.env.get("VAPID_SUBJECT") || "mailto:support@erga.app";
  if (!privateKey) {
    console.warn("[push] VAPID_PRIVATE_KEY non configurata, push disabilitate");
    return false;
  }
  try {
    webpush.setVapidDetails(subject, VAPID_PUBLIC_KEY, privateKey);
    configured = true;
    return true;
  } catch (err) {
    console.error("[push] setVapidDetails fallito:", err);
    return false;
  }
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
}

// supabase deve essere un client service_role per leggere/cancellare tutte le righe.
export async function sendPushToUser(
  supabase: any,
  userId: string,
  payload: PushPayload
): Promise<void> {
  if (!ensureConfigured()) return;
  try {
    const { data: subs, error } = await supabase
      .from("push_subscriptions")
      .select("id, endpoint, p256dh, auth")
      .eq("user_id", userId);
    if (error) {
      console.error("[push] lettura subscriptions fallita:", error.message);
      return;
    }
    if (!subs || subs.length === 0) return;

    const body = JSON.stringify(payload);
    await Promise.all(
      subs.map(async (s: any) => {
        const subscription = {
          endpoint: s.endpoint,
          keys: { p256dh: s.p256dh, auth: s.auth },
        };
        try {
          await webpush.sendNotification(subscription, body);
        } catch (err: any) {
          const status = err?.statusCode;
          if (status === 404 || status === 410) {
            // Subscription scaduta: cleanup
            await supabase.from("push_subscriptions").delete().eq("id", s.id);
          } else {
            console.error(`[push] invio fallito (${status}):`, err?.body || err?.message);
          }
        }
      })
    );
  } catch (err) {
    console.error("[push] errore inatteso:", err);
  }
}