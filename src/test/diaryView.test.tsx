import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { addDays } from "date-fns";
import {
  buildDiaryDay,
  countdownFor,
  sortByWorkload,
  stripDays,
  taskProgress,
  type DiaryTask,
} from "@/components/piano/diaryUtils";
import { DiaryTaskCard } from "@/components/piano/DiaryTaskCard";
import { DiaryExamCard } from "@/components/piano/DiaryExamCard";
import { DiaryDayStrip } from "@/components/piano/DiaryDayStrip";
import { DiaryView } from "@/components/piano/DiaryView";
import type { Evaluation } from "@/hooks/useEvaluations";
import type { StudyEvent } from "@/hooks/useStudyEvents";

/**
 * 📔 P49 — collaudo del DIARIO SCOLASTICO.
 * Prima la logica (funzioni pure: conto alla rovescia, nastro, progresso,
 * costruzione della giornata), poi i tre pezzi di interfaccia.
 */

const OGGI = new Date(2026, 8, 16, 15, 30); // 16 settembre 2026
const iso = (d: Date) => d.toISOString();

function val(over: Partial<Evaluation> = {}): Evaluation {
  return {
    id: "e1",
    user_id: "u1",
    subject_id: null,
    type: "compito",
    title: "Esercizi di algebra",
    description: "Pagina 42, es. 1-6",
    date: iso(OGGI),
    topic_type: "free",
    topic_id: null,
    free_topic_title: null,
    goal: null,
    is_completed: false,
    created_at: iso(OGGI),
    ...over,
  };
}

function ev(over: Partial<StudyEvent> = {}): StudyEvent {
  return {
    id: "s1",
    subject: "Storia",
    title: "Ripasso capitolo 3",
    event_date: iso(OGGI).slice(0, 10),
    event_time: "17:00",
    event_type: "study",
    ...over,
  };
}

const materie = [
  { id: "sub1", user_id: "u1", name: "Matematica", color: null },
  { id: "sub2", user_id: "u1", name: "Storia", color: null },
];

describe("diaryUtils — la logica del diario", () => {
  it("il conto alla rovescia distingue oggi, domani, fra N giorni e passato", () => {
    expect(countdownFor(OGGI, OGGI)).toEqual({ days: 0, tone: "today" });
    expect(countdownFor(addDays(OGGI, 1), OGGI)).toEqual({ days: 1, tone: "tomorrow" });
    expect(countdownFor(addDays(OGGI, 4), OGGI).tone).toBe("soon");
    expect(countdownFor(addDays(OGGI, 4), OGGI).days).toBe(4);
    expect(countdownFor(addDays(OGGI, 30), OGGI).tone).toBe("later");
    expect(countdownFor(addDays(OGGI, -2), OGGI).tone).toBe("past");
  });

  it("il conto alla rovescia conta i GIORNI, non le ore: una verifica di domani resta 'Domani' anche a mezzanotte", () => {
    const tardi = new Date(2026, 8, 16, 23, 59);
    expect(countdownFor(new Date(2026, 8, 17, 8, 0), tardi).tone).toBe("tomorrow");
  });

  it("una data rotta non fa esplodere niente", () => {
    expect(countdownFor("non-una-data", OGGI).tone).toBe("today");
  });

  it("il nastro mostra 7 giorni centrati sul giorno scelto", () => {
    const days = stripDays(OGGI);
    expect(days).toHaveLength(7);
    expect(days[3].getDate()).toBe(16); // il giorno scelto è in mezzo
    expect(days[0].getDate()).toBe(13);
    expect(days[6].getDate()).toBe(19);
  });

  it("il progresso conta i compiti fatti", () => {
    expect(taskProgress([{ completed: true }, { completed: false }, { completed: true }]))
      .toEqual({ done: 2, total: 3, pct: 67 });
    expect(taskProgress([])).toEqual({ done: 0, total: 0, pct: 0 });
  });

  it("l'ordine mette davanti quello che non è ancora fatto", () => {
    const lista = sortByWorkload([
      { title: "Fatto", completed: true },
      { title: "Da fare senza orario", completed: false },
      { title: "Da fare alle 14", completed: false, time: "14:00" },
    ]);
    expect(lista.map((t) => t.title)).toEqual(["Da fare alle 14", "Da fare senza orario", "Fatto"]);
  });

  it("costruisce la giornata separando compiti, verifiche e sessioni", () => {
    const day = buildDiaryDay({
      date: OGGI,
      evaluations: [
        val({ id: "c1", type: "compito", subject_id: "sub1" }),
        val({ id: "v1", type: "scritta", title: "Verifica di storia", subject_id: "sub2", goal: 8 }),
      ],
      events: [ev()],
      subjects: materie,
      courses: [],
    });

    expect(day.tasks.map((t) => t.id)).toEqual(["c1"]);
    expect(day.tasks[0].subjectName).toBe("Matematica");
    expect(day.exams.map((e) => e.id)).toEqual(["v1"]);
    expect(day.exams[0].goal).toBe(8);
    expect(day.sessions.map((s) => s.id)).toEqual(["s1"]);
    expect(day.progress).toEqual({ done: 0, total: 1, pct: 0 });
    expect(day.isEmpty).toBe(false);
  });

  it("spunta i compiti completati e tiene il conto del progresso", () => {
    const day = buildDiaryDay({
      date: OGGI,
      evaluations: [val({ id: "c1", is_completed: true }), val({ id: "c2" })],
      events: [],
      subjects: materie,
      courses: [],
    });
    expect(day.progress).toEqual({ done: 1, total: 2, pct: 50 });
  });

  it("gli eventi di tipo assignment contano come compiti (e lo dichiara)", () => {
    const day = buildDiaryDay({
      date: OGGI,
      evaluations: [],
      events: [ev({ id: "a1", event_type: "assignment", subject: "Altro", title: "Allenamento" })],
      subjects: materie,
      courses: [],
      localCompletedIds: ["a1"],
    });
    expect(day.tasks).toHaveLength(1);
    expect(day.tasks[0].localOnly).toBe(true);
    expect(day.tasks[0].completed).toBe(true);
    expect(day.hasLocalOnlyTasks).toBe(true);
  });

  it("una verifica collegata a un percorso porta con sé il corso da aprire", () => {
    const day = buildDiaryDay({
      date: OGGI,
      evaluations: [val({ id: "v1", type: "orale", topic_type: "linked", topic_id: "corso9" })],
      events: [],
      subjects: materie,
      courses: [{ id: "corso9", file_name: "Storia — Risorgimento", created_at: iso(OGGI), lesson_count: 12 }],
    });
    expect(day.exams[0].courseId).toBe("corso9");
    expect(day.exams[0].courseTitle).toBe("Storia — Risorgimento");
  });

  it("le ore finte di mezzogiorno non vengono mostrate", () => {
    const mezzogiorno = new Date(2026, 8, 16, 12, 0);
    const day = buildDiaryDay({
      date: OGGI,
      evaluations: [val({ id: "v1", type: "scritta", date: iso(mezzogiorno) })],
      events: [],
      subjects: materie,
      courses: [],
    });
    expect(day.exams[0].time).toBeNull();
  });

  it("giornata senza niente: è vuota, e la vista lo dirà con garbo", () => {
    const day = buildDiaryDay({
      date: OGGI,
      evaluations: [],
      events: [],
      subjects: materie,
      courses: [],
    });
    expect(day.isEmpty).toBe(true);
    expect(day.progress.total).toBe(0);
  });
});

describe("DiaryTaskCard — il compito da spuntare", () => {
  const task: DiaryTask = {
    id: "c1",
    entry: { kind: "evaluation", evaluation: val() },
    title: "Esercizi di algebra",
    note: "Pagina 42, es. 1-6",
    subjectName: "Matematica",
    hex: "#2563EB",
    time: null,
    completed: false,
    localOnly: false,
  };

  it("la spunta è un vero checkbox accessibile e chiama onToggle", () => {
    const onToggle = vi.fn();
    render(
      <DiaryTaskCard
        task={task}
        onToggle={onToggle}
        onEdit={() => {}}
        onDelete={() => {}}
      />,
    );
    const box = screen.getByRole("checkbox", { name: "Segna come fatto" });
    expect(box.getAttribute("aria-checked")).toBe("false");
    fireEvent.click(box);
    expect(onToggle).toHaveBeenCalledWith(task);
  });

  it("da fatto: spunta accesa, testo barrato, badge 'Fatto'", () => {
    render(
      <DiaryTaskCard
        task={{ ...task, completed: true }}
        onToggle={() => {}}
        onEdit={() => {}}
        onDelete={() => {}}
      />,
    );
    const box = screen.getByRole("checkbox", { name: "Segna da fare" });
    expect(box.getAttribute("aria-checked")).toBe("true");
    expect(screen.getByText("Fatto")).toBeTruthy();
    const titolo = screen.getByText("Esercizi di algebra");
    expect(titolo.className).toContain("line-through");
  });

  it("il titolo si tocca per modificare (mai per cancellare)", () => {
    const onEdit = vi.fn();
    const onDelete = vi.fn();
    render(
      <DiaryTaskCard task={task} onToggle={() => {}} onEdit={onEdit} onDelete={onDelete} />,
    );
    fireEvent.click(screen.getByText("Esercizi di algebra"));
    expect(onEdit).toHaveBeenCalledWith(task);
    expect(onDelete).not.toHaveBeenCalled();
  });

  it("mostra la materia con il suo colore e la nota del compito", () => {
    const { container } = render(
      <DiaryTaskCard task={task} onToggle={() => {}} onEdit={() => {}} onDelete={() => {}} />,
    );
    expect(screen.getByText("Matematica")).toBeTruthy();
    expect(screen.getByText("Pagina 42, es. 1-6")).toBeTruthy();
    const puntino = container.querySelector('[data-task-id="c1"] span[aria-hidden="true"]');
    // jsdom normalizza i colori in rgb(...): accettiamo entrambe le forme.
    const stile = puntino?.getAttribute("style") ?? "";
    expect(stile.includes("#2563EB") || stile.includes("rgb(37, 99, 235)")).toBe(true);
  });

  it("senza materia non si rompe: dice 'Senza materia'", () => {
    render(
      <DiaryTaskCard
        task={{ ...task, subjectName: null, hex: "#94A3B8" }}
        onToggle={() => {}}
        onEdit={() => {}}
        onDelete={() => {}}
      />,
    );
    expect(screen.getByText("Senza materia")).toBeTruthy();
  });

  it("avvisa quando la spunta vive solo su questo dispositivo", () => {
    render(
      <DiaryTaskCard
        task={{ ...task, localOnly: true }}
        onToggle={() => {}}
        onEdit={() => {}}
        onDelete={() => {}}
      />,
    );
    expect(screen.getByText("Spunta solo su questo dispositivo")).toBeTruthy();
  });
});

describe("DiaryExamCard — la verifica con il conto alla rovescia", () => {
  const exam = {
    id: "v1",
    entry: { kind: "evaluation" as const, evaluation: val({ type: "scritta" }) },
    type: "scritta" as const,
    title: "Verifica sui Promessi Sposi",
    subjectName: "Italiano",
    hex: "#DC2626",
    date: addDays(OGGI, 1),
    time: "08:30",
    goal: 9,
    topicLabel: "Capitoli 1-8",
    courseId: null,
    courseTitle: null,
  };

  it("scrive il conto alla rovescia, il voto obiettivo e l'argomento", () => {
    render(<DiaryExamCard exam={exam} onEdit={() => {}} onDelete={() => {}} onOpenCourse={() => {}} />);
    expect(screen.getByText("Domani")).toBeTruthy();
    expect(screen.getByText("Obiettivo 9")).toBeTruthy();
    expect(screen.getByText("Argomento: Capitoli 1-8")).toBeTruthy();
    expect(screen.getByText("Verifica sui Promessi Sposi")).toBeTruthy();
    expect(document.querySelector('[data-exam-tone="tomorrow"]')).toBeTruthy();
  });

  it("oggi è urgente: la tonalità cambia", () => {
    render(
      <DiaryExamCard
        exam={{ ...exam, date: OGGI }}
        onEdit={() => {}}
        onDelete={() => {}}
        onOpenCourse={() => {}}
      />,
    );
    expect(screen.getByText("Oggi")).toBeTruthy();
    expect(document.querySelector('[data-exam-tone="today"]')).toBeTruthy();
  });

  it("collegata a un percorso, offre il tasto per aprirlo", () => {
    const onOpenCourse = vi.fn();
    render(
      <DiaryExamCard
        exam={{ ...exam, courseId: "corso9", courseTitle: "Italiano — Promessi Sposi" }}
        onEdit={() => {}}
        onDelete={() => {}}
        onOpenCourse={onOpenCourse}
      />,
    );
    const bottone = screen.getByText("Apri il percorso");
    fireEvent.click(bottone);
    expect(onOpenCourse).toHaveBeenCalledWith("corso9");
  });

  it("senza percorso collegato il tasto non compare", () => {
    render(<DiaryExamCard exam={exam} onEdit={() => {}} onDelete={() => {}} onOpenCourse={() => {}} />);
    expect(screen.queryByText("Apri il percorso")).toBeNull();
  });

  it("una verifica già passata lo dice, senza drammi", () => {
    render(
      <DiaryExamCard
        exam={{ ...exam, date: addDays(OGGI, -3) }}
        onEdit={() => {}}
        onDelete={() => {}}
        onOpenCourse={() => {}}
      />,
    );
    expect(screen.getByText("Già passata")).toBeTruthy();
  });
});

describe("DiaryDayStrip — il nastro dei giorni", () => {
  it("mostra 7 giorni, segna oggi e lascia scegliere un altro giorno", () => {
    const onSelect = vi.fn();
    const giorni = stripDays(OGGI);
    render(
      <DiaryDayStrip
        selectedDate={OGGI}
        onSelectDate={onSelect}
        days={giorni}
        dotsForDay={() => []}
      />,
    );
    const bottoni = screen.getAllByRole("button");
    // 7 giorni + 2 frecce
    expect(bottoni.length).toBe(9);
    const giornoScelto = document.querySelector('[aria-current="date"]');
    expect(giornoScelto?.textContent).toContain("16");
    fireEvent.click(screen.getByLabelText(/mercoledì 16 settembre/i));
    expect(onSelect).toHaveBeenCalled();
  });

  it("quando il giorno scelto non è oggi compare la scorciatoia per tornare a oggi", () => {
    const onSelect = vi.fn();
    const altroGiorno = addDays(OGGI, 3);
    render(
      <DiaryDayStrip
        selectedDate={altroGiorno}
        onSelectDate={onSelect}
        days={stripDays(altroGiorno)}
        dotsForDay={() => []}
      />,
    );
    fireEvent.click(screen.getByText("Torna a oggi"));
    expect(onSelect).toHaveBeenCalled();
  });

  it("le frecce spostano il nastro di una settimana", () => {
    const onSelect = vi.fn();
    render(
      <DiaryDayStrip
        selectedDate={OGGI}
        onSelectDate={onSelect}
        days={stripDays(OGGI)}
        dotsForDay={() => []}
      />,
    );
    fireEvent.click(screen.getByLabelText("Settimana successiva"));
    expect((onSelect.mock.calls[0][0] as Date).getDate()).toBe(23);
  });
});

describe("DiaryView — la giornata intera", () => {
  const day = buildDiaryDay({
    date: OGGI,
    evaluations: [
      val({ id: "c1", subject_id: "sub1", is_completed: true }),
      val({ id: "c2", subject_id: "sub1", title: "Tema di italiano" }),
      val({ id: "v1", type: "interrogazione", title: "Interrogazione di storia", subject_id: "sub2" }),
    ],
    events: [ev()],
    subjects: materie,
    courses: [],
  });

  const props = {
    day,
    onSelectDate: () => {},
    dotsForDay: () => [],
    hasContentForDay: () => true,
    togglingId: null,
    onToggleTask: () => {},
    onEditEntry: () => {},
    onDeleteEntry: () => {},
    onEditExam: () => {},
    onDeleteExam: () => {},
    onEditSession: () => {},
    onDeleteSession: () => {},
    onStartFocus: () => {},
    onOpenCourse: () => {},
    onAddTask: () => {},
    onAddExam: () => {},
  };

  it("mostra le tre sezioni e il progresso della giornata", () => {
    render(<DiaryView {...props} />);
    expect(screen.getByText("Verifiche e interrogazioni")).toBeTruthy();
    expect(screen.getByText("Compiti per il giorno")).toBeTruthy();
    expect(screen.getByText("Sessioni di studio")).toBeTruthy();
    expect(screen.getByText("1 di 2 compiti completati")).toBeTruthy();
    expect(screen.getByText("50%")).toBeTruthy();
  });

  it("i due tasti in fondo aggiungono compito e verifica nel giorno giusto", () => {
    const onAddTask = vi.fn();
    const onAddExam = vi.fn();
    render(<DiaryView {...props} onAddTask={onAddTask} onAddExam={onAddExam} />);
    fireEvent.click(screen.getByLabelText("Aggiungi compito"));
    fireEvent.click(screen.getByLabelText("Aggiungi verifica"));
    expect(onAddTask).toHaveBeenCalled();
    expect(onAddExam).toHaveBeenCalled();
  });

  it("la sessione di studio ha il suo tasto Focus", () => {
    const onStartFocus = vi.fn();
    render(<DiaryView {...props} onStartFocus={onStartFocus} />);
    fireEvent.click(screen.getByLabelText("Avvia una sessione Focus"));
    expect(onStartFocus).toHaveBeenCalled();
  });

  it("giornata vuota: nessuna lista ma un invito gentile", () => {
    const vuota = buildDiaryDay({ date: OGGI, evaluations: [], events: [], subjects: materie, courses: [] });
    render(<DiaryView {...props} day={vuota} />);
    expect(screen.getByText("Giornata libera")).toBeTruthy();
    expect(screen.getByText("Nessun compito per questo giorno.")).toBeTruthy();
    expect(screen.queryByText("Verifiche e interrogazioni")).toBeNull();
  });

  it("tutti i compiti fatti: sezione compiti 'in ordine' e nessun lamento", () => {
    const tuttiFatti = buildDiaryDay({
      date: OGGI,
      evaluations: [val({ id: "c1", subject_id: "sub1", is_completed: true })],
      events: [],
      subjects: materie,
      courses: [],
    });
    render(<DiaryView {...props} day={tuttiFatti} />);
    expect(screen.getByText("Compiti finiti, giornata in ordine.")).toBeTruthy();
    expect(screen.getByText("1 di 1 compiti completati")).toBeTruthy();
  });
});
