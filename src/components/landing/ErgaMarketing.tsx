import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  BookOpen,
  Brain,
  CalendarDays,
  FileText,
  Globe2,
  Image as ImageIcon,
  Menu,
  Plus,
  X,
} from "lucide-react";
import { BrandMark } from "./BrandMark";
import { HexagonPlay } from "./HexagonPlay";
import { PhoneHero, PhoneLesson, PhonePiano, PhoneShell, PhoneStudio } from "./PhoneMocks";
import "./landing.css";

const PATHS = {
  fisica: {
    kicker: "Fisica · verifica",
    title: "Cinematica",
    meta: "4 tappe · interrogazione",
    badge: "Esempio di percorso · Tempo stimato: 18 min",
    steps: [
      { n: "1", title: "Concetto chiave", desc: "Moto rettilineo, v = s/t", time: "4 min" },
      { n: "2", title: "Quiz lampo sulle formule", desc: "8 domande, solo le basi", time: "3 min" },
      { n: "3", title: "Problema guidato", desc: "Auto in frenata, un esercizio", time: "7 min" },
      { n: "4", title: "Richiamo attivo per domani", desc: "4 carte, poi stop", time: "4 min" },
    ],
  },
  sposi: {
    kicker: "Italiano · capitoli 9–12",
    title: "I Promessi Sposi",
    meta: "4 tappe · orale",
    badge: "Esempio di percorso · Tempo stimato: 19 min",
    steps: [
      { n: "1", title: "Mappa del capitolo", desc: "Don Abbondio, i bravi, il filo", time: "5 min" },
      { n: "2", title: "Personaggi e mosse", desc: "Quiz lampo, niente riassunto", time: "4 min" },
      { n: "3", title: "Passo guidato", desc: "Il voto di Lucia, cosa chiede la prof", time: "6 min" },
      { n: "4", title: "Richiamo da interrogazione", desc: "5 domande ad alta voce", time: "4 min" },
    ],
  },
  latino: {
    kicker: "Latino · grammatica",
    title: "Sintassi dei casi",
    meta: "4 tappe · versione",
    badge: "Esempio di percorso · Tempo stimato: 18 min",
    steps: [
      { n: "1", title: "Schema dei casi", desc: "Dal nominativo all’ablativo", time: "4 min" },
      { n: "2", title: "Riconoscimento lampo", desc: "10 desinenze, un colpo d’occhio", time: "4 min" },
      { n: "3", title: "Versione guidata", desc: "4 proposizioni, un caso alla volta", time: "7 min" },
      { n: "4", title: "Richiamo per l’interrogazione", desc: "3 frasi, poi chiudi", time: "3 min" },
    ],
  },
} as const;

type PathKey = keyof typeof PATHS;
const SIGNUP_PATH = "/registrati";

const FAQ = [
  ["Per chi è pensato Erga?", "La beta è pensata soprattutto per studenti delle scuole superiori. Puoi usarla per verifiche, interrogazioni e ripassi partendo dai materiali che studi davvero."],
  ["Che cos’è l’Esagono cognitivo?", "È un profilo composto da sei aree: Logica, Memoria, Focus, Lessico, Calma e Pratica. Le risposte iniziali aiutano Erga ad adattare il modo in cui presenta lezioni ed esercizi; i risultati di alcuni quiz possono aggiornare gradualmente l’area Pratica."],
  ["Come vengono protetti i miei materiali?", "L’accesso richiede un account e il sistema separa i materiali dei diversi utenti. Erga usa i file per creare le tue lezioni. L’informativa completa su privacy, conservazione e cancellazione dei dati deve essere pubblicata prima del lancio commerciale."],
  ["Quali materie posso studiare?", "Non c’è un catalogo chiuso: puoi partire da PDF, documenti, foto o da una ricerca web. La qualità del percorso dipende anche dalla chiarezza e dalla completezza del materiale fornito."],
  ["Quanto costa?", "Durante la beta l’accesso è gratuito e non richiede una carta. Il piano Pro non è ancora acquistabile: funzionalità e prezzo saranno comunicati prima del lancio."],
] as const;

export function ErgaMarketing() {
  const [scrolled, setScrolled] = useState(false);
  const [progress, setProgress] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [path, setPath] = useState<PathKey>("fisica");
  const [faqOpen, setFaqOpen] = useState<number | null>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY || 0;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(max > 0 ? y / max : 0);
      setScrolled(y > 8);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const revealItems = document.querySelectorAll(".erga-lp .lp-reveal");
    if (!("IntersectionObserver" in window)) {
      revealItems.forEach((el) => el.classList.add("is-in"));
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-in");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -6% 0px" },
    );
    revealItems.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!menuOpen) return;

    const menu = menuRef.current;
    const links = Array.from(menu?.querySelectorAll<HTMLElement>("a[href]") ?? []);
    links[0]?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const desktopQuery = window.matchMedia("(min-width: 880px)");
    const onDesktop = (event: MediaQueryListEvent) => {
      if (event.matches) setMenuOpen(false);
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setMenuOpen(false);
        menuButtonRef.current?.focus();
        return;
      }
      if (event.key !== "Tab" || links.length === 0) return;
      const first = links[0];
      const last = links[links.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    desktopQuery.addEventListener("change", onDesktop);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
      desktopQuery.removeEventListener("change", onDesktop);
    };
  }, [menuOpen]);

  const data = PATHS[path];

  return (
    <div className="erga-lp">
      <a className="lp-skip" href="#contenuto">Salta al contenuto</a>
      <div className="lp-progress" style={{ transform: `scaleX(${progress})` }} aria-hidden />

      <header className={`lp-nav${scrolled ? " is-scrolled" : ""}`}>
        <div className="lp-nav-inner">
          <a className="lp-brand" href="#top" aria-label="Erga, vai all'inizio">
            <BrandMark />
            Erga
          </a>
          <nav className="lp-nav-links" aria-label="Principale">
            <a href="#prodotto">Prodotto</a>
            <a href="#esagono">Esagono</a>
            <a href="#piano">Piano</a>
            <a href="#prezzi">Accesso</a>
            <a href="#faq">FAQ</a>
          </nav>
          <div className="lp-nav-cta">
            <Link className="lp-btn lp-btn-ghost hidden sm:inline-flex" to="/login">Accedi</Link>
            <Link className="lp-btn lp-btn-primary lp-nav-primary" to={SIGNUP_PATH}>Inizia gratis</Link>
            <button
              ref={menuButtonRef}
              className="lp-burger"
              type="button"
              aria-expanded={menuOpen}
              aria-controls="lp-sheet"
              aria-label={menuOpen ? "Chiudi menu" : "Apri menu"}
              onClick={() => setMenuOpen((v) => !v)}
            >
              {menuOpen ? <X aria-hidden /> : <Menu aria-hidden />}
            </button>
          </div>
        </div>
      </header>
      {menuOpen && (
        <button
          type="button"
          className="lp-menu-backdrop"
          aria-label="Chiudi menu"
          tabIndex={-1}
          onClick={() => setMenuOpen(false)}
        />
      )}
      <nav ref={menuRef} className={`lp-sheet${menuOpen ? " is-open" : ""}`} id="lp-sheet" hidden={!menuOpen} aria-label="Menu mobile">
        <a href="#prodotto" onClick={() => setMenuOpen(false)}>Prodotto</a>
        <a href="#esagono" onClick={() => setMenuOpen(false)}>Esagono</a>
        <a href="#piano" onClick={() => setMenuOpen(false)}>Piano</a>
        <a href="#prezzi" onClick={() => setMenuOpen(false)}>Accesso</a>
        <a href="#faq" onClick={() => setMenuOpen(false)}>FAQ</a>
        <Link to="/login" onClick={() => setMenuOpen(false)}>Accedi</Link>
        <Link to={SIGNUP_PATH} onClick={() => setMenuOpen(false)}>Inizia gratis</Link>
      </nav>

      <main id="contenuto">
        <section className="lp-hero" id="top">
          <div className="lp-hero-bg" aria-hidden />
          <div className="lp-wrap lp-hero-grid">
            <div>
              <p className="lp-eyebrow">Beta gratuita per le scuole superiori</p>
              <h1 className="lp-display">
                Il tuo materiale.
                <br />
                Un percorso
                <br />
                da seguire.
              </h1>
              <p className="lp-lead">
                Carica un PDF, una foto o scegli un argomento. Erga organizza il contenuto in lezioni brevi, esercizi e un piano di studio adattato al tuo profilo.
              </p>
              <div className="lp-hero-actions">
                <Link className="lp-btn lp-btn-red" to={SIGNUP_PATH}>
                  Crea il profilo gratuito
                  <ArrowRight aria-hidden />
                </Link>
                <a className="lp-btn lp-btn-ghost" href="#prodotto">Guarda come funziona</a>
              </div>
              <p className="lp-hero-note">Beta gratuita · Nessuna carta richiesta · Pro in arrivo</p>
              <div className="lp-chooser">
                <span className="lp-chooser-label" id="chooser-label">Simula la verifica di domani</span>
                <div className="lp-pills" role="group" aria-labelledby="chooser-label">
                  {([
                    ["fisica", "Fisica · Cinematica"],
                    ["sposi", "Promessi Sposi · Cap. 9–12"],
                    ["latino", "Latino · Sintassi dei casi"],
                  ] as const).map(([key, label]) => (
                    <button
                      key={key}
                      type="button"
                      className="lp-pill"
                      aria-pressed={path === key}
                      onClick={() => setPath(key)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="lp-stage">
              <div className="lp-hex-orbit" aria-hidden>
                <svg viewBox="0 0 400 400">
                  <g fill="none" stroke="rgba(10,10,10,.12)" strokeWidth="1">
                    <polygon points="200,40 330,115 330,285 200,360 70,285 70,115" />
                  </g>
                  <polygon fill="none" stroke="rgba(196,135,139,.45)" strokeWidth="1.2" points="200,56 318,124 318,276 200,344 82,276 82,124" />
                </svg>
              </div>
              <PhoneShell tab="studio" tilt label={`Esempio Erga: percorso ${data.title} in quattro tappe`}>
                <PhoneHero
                  kicker={data.kicker}
                  title={data.title}
                  meta={data.meta}
                  pct={100}
                  badge={data.badge}
                  steps={data.steps}
                />
              </PhoneShell>
            </div>
          </div>
        </section>

        <div className="lp-proof">
          <div className="lp-wrap">
            <p className="lp-proof-label lp-reveal">Pensato per chi frequenta</p>
            <div className="lp-proof-row lp-reveal">
              <span>Liceo scientifico</span>
              <span>Liceo classico</span>
              <span>Linguistico</span>
              <span>Scienze umane</span>
              <span>ITIS · CAT</span>
              <span>Artistico</span>
            </div>
            <div className="lp-stats" aria-label="Funzioni principali">
              <div className="lp-stat lp-reveal"><b>PDF</b><span className="lp-small">documenti, testo e immagini</span></div>
              <div className="lp-stat lp-reveal"><b>AI</b><span className="lp-small">lezioni ed esercizi dal tuo materiale</span></div>
              <div className="lp-stat lp-reveal"><b>6</b><span className="lp-small">aree del profilo cognitivo</span></div>
              <div className="lp-stat lp-reveal"><b>Focus</b><span className="lp-small">sessioni e piano di studio</span></div>
            </div>
          </div>
        </div>

        <section id="prodotto">
          <div className="lp-wrap">
            <div className="lp-sec-head lp-reveal">
              <p className="lp-eyebrow">Il prodotto</p>
              <h2 className="lp-h2">Studio, pratica e piano in un solo posto.</h2>
              <p className="lp-lead">Il materiale diventa un percorso ordinato. Puoi ripassare, fare esercizi e distribuire le attività nella settimana.</p>
            </div>
            <div className="lp-feat-grid">
              <article className="lp-card lp-reveal">
                <div className="lp-icon red" aria-hidden>
                  <BookOpen />
                </div>
                <h3 className="lp-h3">Percorsi a tappe</h3>
                <p>Lezioni brevi, moduli ordinati e ripresa dal punto in cui avevi interrotto. Il percorso nasce dal materiale che hai caricato.</p>
                <span className="lp-tag">Tab Studio</span>
              </article>
              <article className="lp-card lp-reveal" id="piano">
                <div className="lp-icon" aria-hidden>
                  <CalendarDays />
                </div>
                <h3 className="lp-h3">Piano e modalità Focus</h3>
                <p>Inserisci verifiche e impegni, genera una proposta settimanale e usa il timer per concentrarti su un’attività alla volta.</p>
                <span className="lp-tag">Tab Piano</span>
              </article>
              <article className="lp-card lp-reveal">
                <div className="lp-icon line" aria-hidden>
                  <Brain />
                </div>
                <h3 className="lp-h3">Esagono cognitivo</h3>
                <p>Logica, Memoria, Focus, Lessico, Calma e Pratica aiutano a scegliere linguaggio, ritmo ed esempi più adatti al tuo profilo.</p>
                <span className="lp-tag">Il cuore</span>
              </article>
            </div>
          </div>
        </section>

        <section className="lp-show" id="app">
          <div className="lp-wrap">
            <div className="lp-sec-head lp-reveal">
              <p className="lp-eyebrow">Anteprima dell’app</p>
              <h2 className="lp-h2">Vedi subito cosa farai.</h2>
              <p className="lp-lead">Queste anteprime mostrano le aree principali di Erga: percorso, calendario e lezione. Alcuni dettagli possono cambiare durante la beta.</p>
            </div>
            <div className="lp-phones">
              <figure className="lp-reveal">
                <PhoneShell tab="studio" label="Percorso Studio con nodi a scacchiera">
                  <PhoneStudio />
                </PhoneShell>
                <figcaption className="lp-cap">Studio — il percorso a tappe</figcaption>
              </figure>
              <figure className="lp-reveal">
                <PhoneShell tab="piano" label="Tab Piano con genera piano e calendario">
                  <PhonePiano />
                </PhoneShell>
                <figcaption className="lp-cap">Piano — mese, settimana, Focus</figcaption>
              </figure>
              <figure className="lp-reveal">
                <PhoneShell tab="home" label="Lezione a tappe con box evidenziato">
                  <PhoneLesson />
                </PhoneShell>
                <figcaption className="lp-cap">Lezione — tappe, fonti, avanti</figcaption>
              </figure>
            </div>
          </div>
        </section>

        <section>
          <div className="lp-wrap">
            <div className="lp-sec-head lp-reveal">
              <p className="lp-eyebrow">Come funziona</p>
              <h2 className="lp-h2">Tre passaggi, dal materiale allo studio.</h2>
            </div>
            <div className="lp-steps">
              <article className="lp-step lp-reveal">
                <div className="lp-num">01</div>
                <h3 className="lp-h3">Carica o cerca</h3>
                <p className="lp-lead lp-step-copy">Aggiungi un PDF, un documento, una foto del quaderno oppure cerca un argomento sul web.</p>
              </article>
              <article className="lp-step lp-reveal">
                <div className="lp-num">02</div>
                <h3 className="lp-h3">Controlla il percorso</h3>
                <p className="lp-lead lp-step-copy">Erga organizza i concetti in moduli e lezioni. Tu scegli da dove iniziare e puoi aggiungere altro materiale.</p>
              </article>
              <article className="lp-step lp-reveal">
                <div className="lp-num">03</div>
                <h3 className="lp-h3">Studia e fai pratica</h3>
                <p className="lp-lead lp-step-copy">Segui le lezioni, genera esercizi e usa il piano o il timer Focus per organizzare il lavoro.</p>
              </article>
            </div>
            <div className="lp-mats">
              <div className="lp-mat lp-reveal"><span className="lp-mat-icon" aria-hidden><FileText /></span><div><b>Carica PDF</b><span>Dispense, slide e fotocopie.</span></div></div>
              <div className="lp-mat lp-reveal"><span className="lp-mat-icon" aria-hidden><ImageIcon /></span><div><b>Carica foto</b><span>Lavagna, quaderno e libro.</span></div></div>
              <div className="lp-mat lp-reveal"><span className="lp-mat-icon" aria-hidden><Globe2 /></span><div><b>Ricerca web</b><span>Wikipedia, manuali e altre fonti.</span></div></div>
            </div>
          </div>
        </section>

        <section className="lp-hex-sec" id="esagono">
          <div className="lp-wrap">
            <HexagonPlay />
          </div>
        </section>

        <section>
          <div className="lp-wrap">
            <div className="lp-sec-head lp-reveal">
              <p className="lp-eyebrow">Esempi d’uso</p>
              <h2 className="lp-h2">Tre situazioni in cui può aiutarti.</h2>
              <p className="lp-lead">Sono scenari dimostrativi, non testimonianze di utenti reali.</p>
            </div>
            <div className="lp-quotes">
              <article className="lp-quote lp-reveal">
                <span className="lp-scenario-label">Verifica di fisica</span>
                <h3 className="lp-h3">Dal capitolo agli esercizi</h3>
                <p>Carichi il materiale, controlli le lezioni generate e prepari un set di esercizi sugli argomenti della verifica.</p>
              </article>
              <article className="lp-quote lp-reveal">
                <span className="lp-scenario-label">Interrogazione di italiano</span>
                <h3 className="lp-h3">Ripasso e simulazione orale</h3>
                <p>Organizzi i capitoli in tappe e usi la modalità Interrogazione per allenarti a rispondere ad alta voce.</p>
              </article>
              <article className="lp-quote lp-reveal">
                <span className="lp-scenario-label">Settimana piena</span>
                <h3 className="lp-h3">Una proposta da adattare</h3>
                <p>Inserisci verifiche e impegni, poi controlli il piano suggerito prima di aggiungerlo al calendario.</p>
              </article>
            </div>
          </div>
        </section>

        <section id="prezzi">
          <div className="lp-wrap">
            <div className="lp-sec-head lp-reveal">
              <p className="lp-eyebrow">Accesso</p>
              <h2 className="lp-h2">La beta è gratuita.</h2>
              <p className="lp-lead">Non serve una carta. Il piano Pro non è ancora in vendita e non mostriamo un prezzo finché non sarà definito.</p>
            </div>
            <div className="lp-price-grid">
              <article className="lp-price feat lp-reveal">
                <p className="lp-small">Beta</p>
                <p className="amount">Gratis</p>
                <p className="lp-small">Accesso alle funzioni attualmente disponibili.</p>
                <ul>
                  <li>Caricamento di PDF, documenti e immagini</li>
                  <li>Lezioni, esercizi e simulazione orale</li>
                  <li>Piano di studio e modalità Focus</li>
                  <li>Profilo cognitivo personalizzato</li>
                </ul>
                <Link className="lp-btn lp-btn-primary" to={SIGNUP_PATH}>Partecipa alla beta</Link>
              </article>
              <article className="lp-price lp-reveal">
                <p className="lp-small">Pro</p>
                <p className="amount">In arrivo</p>
                <p className="lp-small">Prezzo e condizioni non ancora definiti.</p>
                <ul>
                  <li>Nessun acquisto disponibile oggi</li>
                  <li>Nessun addebito durante la beta</li>
                  <li>Dettagli comunicati prima del lancio</li>
                </ul>
                <span className="lp-btn lp-btn-disabled" aria-disabled="true">Non ancora disponibile</span>
              </article>
            </div>
          </div>
        </section>

        <section id="faq">
          <div className="lp-wrap">
            <div className="lp-sec-head lp-reveal">
              <p className="lp-eyebrow">Domande</p>
              <h2 className="lp-h2">Poche, nette.</h2>
            </div>
            <div className="lp-faq">
              {FAQ.map(([q, a], i) => (
                <div key={q} className={`lp-faq-item lp-reveal${faqOpen === i ? " is-open" : ""}`}>
                  <button
                    type="button"
                    aria-expanded={faqOpen === i}
                    aria-controls={`faq-answer-${i}`}
                    onClick={() => setFaqOpen(faqOpen === i ? null : i)}
                  >
                    {q}
                    <Plus className="lp-plus" aria-hidden />
                  </button>
                  {faqOpen === i && <div className="a" id={`faq-answer-${i}`}>{a}</div>}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="lp-final" id="inizia">
          <div className="lp-wrap">
            <div className="lp-final-box lp-reveal">
              <p className="lp-eyebrow lp-eyebrow-on-dark">Il primo passo</p>
              <h2 className="lp-h2">Crea il profilo e prova Erga con il tuo materiale.</h2>
              <p className="lp-lead">Dopo la registrazione completerai il questionario cognitivo e potrai aggiungere il primo argomento di studio.</p>
              <div className="lp-onboard-cta">
                <Link className="lp-btn lp-btn-red" to={SIGNUP_PATH}>Crea il profilo gratuito</Link>
                <span className="lp-onboard-note">Beta gratuita. Nessuna carta richiesta.</span>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer>
        <div className="lp-wrap">
          <div className="lp-foot">
            <div>
              <a className="lp-brand" href="#top" aria-label="Erga">
                <BrandMark />
                Erga
              </a>
              <p className="lp-small lp-foot-summary">
                Trasforma il tuo materiale in un percorso di studio personale.
              </p>
            </div>
            <div>
              <h2>Prodotto</h2>
              <a href="#prodotto">Studio</a>
              <a href="#piano">Piano</a>
              <a href="#esagono">Esagono cognitivo</a>
              <a href="#prezzi">Accesso</a>
            </div>
            <div>
              <h2>Inizia</h2>
              <Link to={SIGNUP_PATH}>Crea il tuo profilo</Link>
              <Link to="/login">Accedi</Link>
              <a href="#faq">FAQ</a>
            </div>
            <div>
              <h2>Trasparenza</h2>
              <span className="lp-foot-note">Beta gratuita</span>
              <span className="lp-foot-note">Pro non ancora disponibile</span>
              <span className="lp-foot-note">Privacy e termini in preparazione</span>
            </div>
          </div>
          <div className="lp-legal">
            <span>© {new Date().getFullYear()} Erga. Tutti i diritti riservati.</span>
            <span>Versione beta · Funzionalità in evoluzione</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
