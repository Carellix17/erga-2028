import { useMemo } from "react";

/**
 * Tipo per il messaggio di benvenuto
 */
export interface WelcomeMessage {
  /** Prima riga del saluto (es. "Buonasera,") */
  greeting: string;
  /** Seconda riga con il nome (es. "Alessandro") */
  name: string;
  /** Messaggio motivazionale opzionale */
  subtitle?: string;
}

/**
 * Tipo per le categorie di saluto
 */
type GreetingCategory =
  | "time"
  | "day"
  | "week"
  | "season"
  | "progress"
  | "motivation"
  | "special";

/**
 * Interfaccia per le opzioni del hook
 */
interface UseWelcomeMessageOptions {
  userName: string;
  streakDays?: number;
  dailyProgress?: number;
  lessonsCompleted?: number;
}

/**
 * Festival e ricorrenze speciali italiane
 */
const SPECIAL_DATES: Array<{
  month: number;
  day: number;
  greeting: string;
  subtitle?: string;
}> = [
  // Capodanno
  { month: 0, day: 1, greeting: "Buon Anno!", subtitle: "Nuovi traguardi ti aspettano" },
  // Epifania
  { month: 0, day: 6, greeting: "Buona Befana!", subtitle: "Inizia con il piede giusto" },
  // San Valentino
  { month: 1, day: 14, greeting: "Buon San Valentino!", subtitle: "L'amore per lo studio inizia oggi" },
  // Carnevale (varia, usiamo un periodo)
  { month: 1, day: 13, greeting: "Buon Carnevale!", subtitle: "Un pizzico di allegria" },
  // Giorno della Memoria
  { month: 0, day: 27, greeting: "Memoria e Futuro", subtitle: "Imparare dal passato" },
  // Giornata della Donna
  { month: 2, day: 8, greeting: "Buona Festa della Donna!", subtitle: "Forza e determinazione" },
  // 25 Aprile
  { month: 3, day: 25, greeting: "Buona Liberazione!", subtitle: "Libertà di imparare" },
  // 1 Maggio
  { month: 4, day: 1, greeting: "Buon Primo Maggio!", subtitle: "Il lavoro onora la mente" },
  // Ferragosto
  { month: 7, day: 15, greeting: "Buon Ferragosto!", subtitle: "Un momento di respiro" },
  // Ognissanti
  { month: 10, day: 1, greeting: "Ognissanti", subtitle: "Celebra ogni piccola vittoria" },
  // Immacolata Concezione
  { month: 11, day: 8, greeting: "Immacolata Concezione", subtitle: "Mente fresca e libera" },
  // Natale
  { month: 11, day: 25, greeting: "Buon Natale!", subtitle: "Il regalo più grande? Lo sai tu" },
  // Santo Stefano
  { month: 11, day: 26, greeting: "Santo Stefano", subtitle: "Il secondo giorno di magia" },
  // Ultimo dell'anno
  { month: 11, day: 31, greeting: "Ultimo dell'anno!", subtitle: "Cosa hai imparato quest'anno?" },
];

/**
 * Controlla se è una data speciale
 */
function getSpecialDateMessage(now: Date): { greeting: string; subtitle?: string } | null {
  const month = now.getMonth();
  const day = now.getDate();

  for (const special of SPECIAL_DATES) {
    if (special.month === month && special.day === day) {
      return { greeting: special.greeting, subtitle: special.subtitle };
    }
  }
  return null;
}

/**
 * Frasi per periodo dell'anno
 */
function getSeasonMessage(month: number): { greeting: string; subtitle?: string } | null {
  // Autunno (Settembre - Novembre)
  if (month >= 8 && month <= 10) {
    return {
      greeting: "Autunno di sapere",
      subtitle: "Le foglie cadono, la conoscenza resta",
    };
  }
  // Inverno (Dicembre - Febbraio)
  if (month === 11 || month === 0 || month === 1) {
    return {
      greeting: "Inverno studioso",
      subtitle: "Il freddo non ferma chi vuole imparare",
    };
  }
  // Primavera (Marzo - Maggio)
  if (month >= 2 && month <= 4) {
    return {
      greeting: "Primavera di idee",
      subtitle: "La mente fiorisce con la conoscenza",
    };
  }
  // Estate (Giugno - Agosto)
  if (month >= 5 && month <= 7) {
    return {
      greeting: "Estate di studio",
      subtitle: "Anche al sole, la mente cerca nuove sfide",
    };
  }
  return null;
}

/**
 * Frasi per giorno della settimana
 */
function getDayMessage(dayOfWeek: number, streakDays: number): { greeting: string; subtitle?: string } | null {
  // Weekend
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    const messages = [
      { greeting: "Weekend studio", subtitle: "Il sabato e la domenica, nessuna scusa" },
      { greeting: "Sabato studioso", subtitle: "Weekend attivo!" },
      { greeting: "Domenica riflessiva", subtitle: "Prepara la settimana con calma" },
      { greeting: "Weekend = studio", subtitle: "Weekend produttivo!" },
      { greeting: "Buon weekend!", subtitle: "Un po' di studio e poi relax" },
    ];
    return messages[Math.floor(Math.random() * messages.length)];
  }

  // Settimana
  if (streakDays > 0) {
    const messages = [
      { greeting: "Serie attiva!", subtitle: `Oggi è il giorno ${streakDays}` },
      { greeting: "Momentum!", subtitle: "Non fermarti ora" },
      { greeting: "Inizia in scioltezza", subtitle: "La serie continua" },
      { greeting: "Sulla cresta dell'onda", subtitle: `Giorno ${streakDays} di fila` },
      { greeting: "In bocca al lupo!", subtitle: "Anche oggi ce la farai" },
    ];
    return messages[Math.floor(Math.random() * messages.length)];
  }

  return null;
}

/**
 * Frasi per orario del giorno
 */
function getTimeMessage(hour: number): { greeting: string; subtitle?: string } | null {
  // Notte tardi (22-24, 0-4)
  if (hour >= 22 || hour < 5) {
    return {
      greeting: "Studio notturno",
      subtitle: "La notte è lunga, approfittane",
    };
  }
  // Mattina presto (5-7)
  if (hour >= 5 && hour < 7) {
    return {
      greeting: "Alba studiosa",
      subtitle: "I mattutini sono i migliori",
    };
  }
  // Mattina (7-12)
  if (hour >= 7 && hour < 12) {
    return {
      greeting: "Mattina produttiva",
      subtitle: "L'energia è dalla tua parte",
    };
  }
  // Pomeriggio (12-17)
  if (hour >= 12 && hour < 17) {
    return {
      greeting: "Pomeriggio attivo",
      subtitle: "Continua così!",
    };
  }
  // Sera (17-20)
  if (hour >= 17 && hour < 20) {
    return {
      greeting: "Studio Serale",
      subtitle: "La sera porta consiglio",
    };
  }
  // Sera tardi (20-22)
  if (hour >= 20 && hour < 22) {
    return {
      greeting: "Sera studiosa",
      subtitle: "Un ultimo sforzo",
    };
  }
  return null;
}

/**
 * Frasi per progresso
 */
function getProgressMessage(dailyProgress: number, lessonsCompleted: number): { greeting: string; subtitle?: string } | null {
  // Obiettivo raggiunto
  if (dailyProgress >= 100) {
    const messages = [
      { greeting: "Obiettivo raggiunto!", subtitle: "Che fenomeno!" },
      { greeting: "Missione compiuta!", subtitle: "Oggi hai dato il massimo" },
      { greeting: "Perfetto!", subtitle: "Hai superato ogni aspettativa" },
      { greeting: "Campione!", subtitle: "100% completato" },
      { greeting: "Eccellenza!", subtitle: "Non potevi fare meglio" },
    ];
    return messages[Math.floor(Math.random() * messages.length)];
  }
  // Quasi lì
  if (dailyProgress >= 80) {
    const messages = [
      { greeting: "Quasi lì!", subtitle: "Un ultimo sforzo" },
      { greeting: "Obiettivo in vista!", subtitle: "Mancano pochi minuti" },
      { greeting: "Straordinario!", subtitle: "L'80% è già tantissimo" },
    ];
    return messages[Math.floor(Math.random() * messages.length)];
  }
  // In progresso
  if (dailyProgress >= 50) {
    const messages = [
      { greeting: "A metà strada!", subtitle: "Continua così" },
      { greeting: "Buon ritmo!", subtitle: "Sei sulla buona strada" },
      { greeting: "Procede tutto bene", subtitle: "Il 50% è passato" },
    ];
    return messages[Math.floor(Math.random() * messages.length)];
  }
  // Appena iniziato
  if (dailyProgress < 20 && lessonsCompleted > 0) {
    const messages = [
      { greeting: "Si ricomincia!", subtitle: "Nuovo slancio, nuovi traguardi" },
      { greeting: "Ripartiamo!", subtitle: "Ogni giorno è un'opportunità" },
      { greeting: "Nuovo giorno, nuove sfide", subtitle: "L'energia è con te" },
    ];
    return messages[Math.floor(Math.random() * messages.length)];
  }
  return null;
}

/**
 * Frasi motivazionali generiche con varianza
 */
function getMotivationalMessage(): { greeting: string; subtitle?: string } {
  const messages = [
    { greeting: "Cosa studiamo oggi?", subtitle: "Ogni giorno è un'opportunità" },
    { greeting: "Pronto per studiare?", subtitle: "La conoscenza ti aspetta" },
    { greeting: "Via allo studio!", subtitle: "Oggi scriviamo la tua storia" },
    { greeting: "Tutto pronto?", subtitle: "L'avventura inizia ora" },
    { greeting: "Bentornato!", subtitle: "Ti aspettavamo" },
    { greeting: "È ora di brillare!", subtitle: "Mostra il tuo potenziale" },
    { greeting: "Nuova avventura!", subtitle: "Ogni pagina è una scoperta" },
    { greeting: "Concentrazione massima!", subtitle: "L'obiettivo è chiaro" },
    { greeting: "Mente in azione!", subtitle: "Attiva la modalità studio" },
    { greeting: "Focus totale!", subtitle: "Zero distrazioni, solo studio" },
    { greeting: "Sfida il tuo limite!", subtitle: "Superati ogni giorno" },
    { greeting: "Costruisci il tuo futuro!", subtitle: "Un passo alla volta" },
    { greeting: "Accendi la fiamma!", subtitle: "La motivazione è dentro di te" },
    { greeting: "Sblocca il tuo potenziale!", subtitle: "Ogni lezione conta" },
    { greeting: "Dai, si comincia!", subtitle: "Il tempo vola quando studi" },
    { greeting: "Un passo alla volta", subtitle: "La costanza vince" },
    { greeting: "La cultura è potere!", subtitle: "Armati di conoscenza" },
    { greeting: "Oggi impariamo qualcosa di nuovo!", subtitle: "Curiosità al potere" },
    { greeting: "知识的海洋", subtitle: "Il mare della conoscenza ti attende" },
    { greeting: "Wissenschaft wartet!", subtitle: "La scienza ti aspetta!" },
    { greeting: "Let's learn!", subtitle: "L'inglese non sarà un problema" },
    { greeting: "Buona navigazione!", subtitle: "Nel mare della conoscenza" },
    { greeting: "L'esperto sei tu!", subtitle: "O quasi..." },
    { greeting: "Stelle o stelle?", subtitle: "Oggi vediamo le costellazioni" },
    { greeting: "Forza e luce!", subtitle: "Come una lampada che illumina" },
    { greeting: "Viaggio nella conoscenza", subtitle: "Destinazione: il tuo futuro" },
    { greeting: "Il sapere non ha limiti!", subtitle: "Esplora senza confini" },
    { greeting: "Prepariamoci!", subtitle: "La lezione sta per iniziare" },
    { greeting: "Silenzio, si studia!", subtitle: "Concentrazione al massimo" },
    { greeting: "Mente aperta!", subtitle: "Pronto ad assorbire tutto" },
  ];
  return messages[Math.floor(Math.random() * messages.length)];
}

/**
 * Saluti classici basati sull'orario
 */
function getClassicGreeting(hour: number): string {
  if (hour < 5) return "Buonanotte";
  if (hour < 12) return "Buongiorno";
  if (hour < 17) return "Buon pomeriggio";
  if (hour < 20) return "Buonasera";
  return "Buonasera";
}

/**
 * Hook per generare messaggi di benvenuto variabili
 */
export function useWelcomeMessage(options: UseWelcomeMessageOptions): WelcomeMessage {
  const { userName, streakDays = 0, dailyProgress = 0, lessonsCompleted = 0 } = options;

  return useMemo(() => {
    const now = new Date();
    const hour = now.getHours();
    const dayOfWeek = now.getDay();
    const month = now.getMonth();
    const dayOfMonth = now.getDate();

    // Ordine di priorità: date speciali > stagioni > progressi > giorno > orario > motivazionali

    // 1. Controlla date speciali
    const specialMessage = getSpecialDateMessage(now);
    if (specialMessage) {
      return {
        greeting: specialMessage.greeting,
        name: userName,
        subtitle: specialMessage.subtitle,
      };
    }

    // 2. Controlla le stagioni (con un po' di casualità)
    if (Math.random() < 0.3) {
      const seasonMessage = getSeasonMessage(month);
      if (seasonMessage) {
        return {
          greeting: seasonMessage.greeting,
          name: userName,
          subtitle: seasonMessage.subtitle,
        };
      }
    }

    // 3. Controlla il progresso (se c'è stato un progresso significativo)
    if (dailyProgress > 0 || lessonsCompleted > 0) {
      if (Math.random() < 0.4) {
        const progressMessage = getProgressMessage(dailyProgress, lessonsCompleted);
        if (progressMessage) {
          return {
            greeting: progressMessage.greeting,
            name: userName,
            subtitle: progressMessage.subtitle,
          };
        }
      }
    }

    // 4. Controlla il giorno della settimana (più frequente durante la settimana)
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    if (Math.random() < (isWeekend ? 0.6 : 0.4)) {
      const dayMessage = getDayMessage(dayOfWeek, streakDays);
      if (dayMessage) {
        return {
          greeting: dayMessage.greeting,
          name: userName,
          subtitle: dayMessage.subtitle,
        };
      }
    }

    // 5. Controlla l'orario (specialmente la sera)
    if (hour >= 17 && Math.random() < 0.5) {
      const timeMessage = getTimeMessage(hour);
      if (timeMessage) {
        return {
          greeting: timeMessage.greeting,
          name: userName,
          subtitle: timeMessage.subtitle,
        };
      }
    }

    // 6. Messaggio motivazionale casuale
    if (Math.random() < 0.3) {
      const motivational = getMotivationalMessage();
      return {
        greeting: motivational.greeting,
        name: userName,
        subtitle: motivational.subtitle,
      };
    }

    // 7. Fallback: saluto classico su due righe
    return {
      greeting: getClassicGreeting(hour) + ",",
      name: userName,
      subtitle: undefined,
    };
  }, [userName, streakDays, dailyProgress, lessonsCompleted]);
}

/**
 * Hook semplificato per il saluto classico (sempre basato solo sull'orario)
 */
export function useClassicGreeting(userName: string): WelcomeMessage {
  return useMemo(() => {
    const hour = new Date().getHours();
    return {
      greeting: getClassicGreeting(hour) + ",",
      name: userName,
      subtitle: undefined,
    };
  }, [userName]);
}
