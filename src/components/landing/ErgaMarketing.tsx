import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { BrandMark } from "./BrandMark";
import { HexagonPlay, StudyTimeline, buildDayPlan, DAYS } from "./HexagonPlay";
import { PhoneHero, PhoneHome, PhoneLesson, PhonePiano, PhoneShell, PhoneStudio } from "./PhoneMocks";
import { LanguageSwitcher } from "@/components/layout/LanguageSwitcher";
import "./landing.css";

const PATHS = {
  fisica: {
    kicker: "Fisica · verifica",
    title: "Cinematica",
    meta: "4 tappe · interrogazione",
    badge: "Tempo totale stimato: 18 min · Salvi il tuo pomeriggio",
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
    badge: "Tempo totale stimato: 19 min · Salvi il tuo pomeriggio",
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
    badge: "Tempo totale stimato: 18 min · Salvi il tuo pomeriggio",
    steps: [
      { n: "1", title: "Schema dei casi", desc: "Dal nominativo all’ablativo", time: "4 min" },
      { n: "2", title: "Riconoscimento lampo", desc: "10 desinenze, un colpo d’occhio", time: "4 min" },
      { n: "3", title: "Versione guidata", desc: "4 proposizioni, un caso alla volta", time: "7 min" },
      { n: "4", title: "Richiamo per l’interrogazione", desc: "3 frasi, poi chiudi", time: "3 min" },
    ],
  },
} as const;

type PathKey = keyof typeof PATHS;
const SCHOOLS = [
  ["scientifico", "Scientifico"],
  ["classico", "Classico"],
  ["linguistico", "Linguistico"],
  ["scienze-umane", "Scienze umane"],
  ["tecnico", "Tecnico / ITIS"],
  ["altro", "Altro"],
] as const;

const FAQ = [
  ["Funziona per le superiori, non solo “in teoria”?", "Sì. È fatto per verifiche, interrogazioni, compiti in classe e recuperi. Fisica, latino, italiano, storia dell’arte: carichi il materiale della prof e parti. Non serve un corso universitario."],
  ["Che cos’è l’Esagono cognitivo?", "Sei vertici — Logica, Memoria, Focus, Lessico, Calma, Pratica — aggiornati da come studi. Se l’ansia è alta, le tappe si accorciano. Se alle 17 hai allenamento, il piano chiude prima."],
  ["I miei dati restano miei?", "Sì. PDF, foto e ricerche servono solo a costruire i tuoi percorsi. Non vendiamo profili. Puoi esportare ed eliminare tutto, in qualsiasi momento."],
  ["Quali materie copre?", "Quelle che carichi. Fisica, latino, italiano, storia, matematica, diritto, chimica, inglese. Erga non impone un catalogo: parte dal PDF della prof, dalla foto del quaderno o da una fonte web."],
  ["Quanto costa, davvero?", "Parti da 0 €: un percorso, il piano settimanale, l’Esagono in lettura. Pro è 6,99 € al mese, disdici quando vuoi. Per classi e istituti il piano è su misura — carta non richiesta per iniziare."],
] as const;

export function ErgaMarketing() {
  const [scrolled, setScrolled] = useState(false);
  const [progress, setProgress] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [path, setPath] = useState<PathKey>("fisica");
  const [shown, setShown] = useState(0);
  const [faqOpen, setFaqOpen] = useState<number | null>(null);
  const [school, setSchool] = useState<string | null>(null);
  const [planDay, setPlanDay] = useState<(typeof DAYS)[number]["id"]>("mer");

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
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-in");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.16, rootMargin: "0px 0px -8% 0px" },
    );
    document.querySelectorAll(".erga-lp .lp-reveal").forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    setShown(0);
    const timers: number[] = [];
    PATHS[path].steps.forEach((_, i) => {
      timers.push(window.setTimeout(() => setShown(i + 1), 80 + i * 220));
    });
    return () => timers.forEach((t) => clearTimeout(t));
  }, [path]);

  const data = PATHS[path];
  const pct = Math.round((shown / data.steps.length) * 100);
  const signup = (from: string) =>
    school ? `/registrati?from=${from}&scuola=${school}` : `/registrati?from=${from}`;

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
            <a href="#prezzi">Prezzi</a>
            <a href="#faq">FAQ</a>
          </nav>
          <div className="lp-nav-cta">
            <LanguageSwitcher className="hidden sm:inline-flex text-[#6E6E73] hover:text-[#0A0A0A] hover:bg-black/5" />
            <Link className="lp-btn lp-btn-ghost hidden sm:inline-flex" to="/login">Accedi</Link>
            <Link className="lp-btn lp-btn-primary" to={signup("nav")}>Crea il tuo profilo</Link>
            <button
              className="lp-burger"
              type="button"
              aria-expanded={menuOpen}
              aria-controls="lp-sheet"
              aria-label={menuOpen ? "Chiudi menu" : "Apri menu"}
              onClick={() => setMenuOpen((v) => !v)}
            >
              <span />
            </button>
          </div>
        </div>
      </header>
      <div className={`lp-sheet${menuOpen ? " is-open" : ""}`} id="lp-sheet" hidden={!menuOpen}>
        <a href="#prodotto" onClick={() => setMenuOpen(false)}>Prodotto</a>
        <a href="#esagono" onClick={() => setMenuOpen(false)}>Esagono</a>
        <a href="#piano" onClick={() => setMenuOpen(false)}>Piano</a>
        <a href="#prezzi" onClick={() => setMenuOpen(false)}>Prezzi</a>
        <a href="#faq" onClick={() => setMenuOpen(false)}>FAQ</a>
        <Link to="/login" onClick={() => setMenuOpen(false)}>Accedi</Link>
        <Link to={signup("menu")} onClick={() => setMenuOpen(false)}>Crea il tuo profilo</Link>
      </div>

      <main id="contenuto">
        <section className="lp-hero" id="top">
          <div className="lp-hero-bg" aria-hidden />
          <div className="lp-wrap lp-hero-grid">
            <div>
              <p className="lp-eyebrow">Per licei e istituti tecnici</p>
              <h1 className="lp-display">
                La verifica
                <br />
                non ti mangia
                <br />
                il pomeriggio.
              </h1>
              <p className="lp-lead">
                Studia la metà del tempo, ricorda il doppio, non rinunciare a uscire. Tocca una materia: Erga scrive quattro tappe. Il resto della giornata resta tuo.
              </p>
              <div className="lp-hero-actions">
                <Link className="lp-btn lp-btn-red" to={signup("hero")}>
                  Inizia subito gratis
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
                    <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </Link>
                <a className="lp-btn lp-btn-ghost" href="#prodotto">Come funziona</a>
              </div>
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
                  <g className="lp-spin-slow" fill="none" stroke="rgba(10,10,10,.12)" strokeWidth="1">
                    <polygon points="200,40 330,115 330,285 200,360 70,285 70,115" />
                  </g>
                  <polygon className="lp-spin-rev" fill="none" stroke="rgba(196,135,139,.45)" strokeWidth="1.2" points="200,56 318,124 318,276 200,344 82,276 82,124" />
                </svg>
              </div>
              <PhoneShell tab="studio" tilt label="Simulatore Erga: genera un percorso a tappe">
                <PhoneHero
                  kicker={shown ? data.kicker : "Composizione…"}
                  title={data.title}
                  meta={shown ? data.meta : "Calcolo delle tappe"}
                  pct={pct}
                  badge={shown >= data.steps.length ? data.badge : null}
                  steps={data.steps.slice(0, Math.max(shown, 1))}
                />
              </PhoneShell>
            </div>
          </div>
        </section>

        <div className="lp-proof">
          <div className="lp-wrap">
            <p className="lp-proof-row lp-reveal">
              <span>Liceo scientifico</span>
              <span>Liceo classico</span>
              <span>Linguistico</span>
              <span>Scienze umane</span>
              <span>ITIS · CAT</span>
              <span>Artistico</span>
            </p>
            <div className="lp-stats">
              <div className="lp-stat lp-reveal"><b>18<em> min</em></b><span className="lp-small">una verifica, non il pomeriggio</span></div>
              <div className="lp-stat lp-reveal"><b>2<em>×</em></b><span className="lp-small">richiamo rispetto al rileggere</span></div>
              <div className="lp-stat lp-reveal"><b>17<em>:00</em></b><span className="lp-small">allenamento e uscita salvi</span></div>
              <div className="lp-stat lp-reveal"><b>6</b><span className="lp-small">vertici, un profilo vivo</span></div>
            </div>
          </div>
        </div>

        <section id="prodotto">
          <div className="lp-wrap">
            <div className="lp-sec-head lp-reveal">
              <p className="lp-eyebrow">Il prodotto</p>
              <h2 className="lp-h2">Studio. Piano. Esagono.</h2>
              <p className="lp-lead">Tre tab, un’intelligenza. Il capitolo diventa un albero. Il mercoledì, un orario che lascia stare campo e amici.</p>
            </div>
            <div className="lp-feat-grid">
              <article className="lp-card lp-reveal">
                <div className="lp-icon red" aria-hidden>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M6 4h9a3 3 0 013 3v13H8a2 2 0 01-2-2V4z" stroke="#fff" strokeWidth="1.7" /><path d="M9 9h6M9 13h4" stroke="#fff" strokeWidth="1.7" strokeLinecap="round" /></svg>
                </div>
                <h3 className="lp-h3">Percorsi a tappe</h3>
                <p>Come Duolingo, per la verifica di martedì. Nodi corti, quiz lampo, «Riprendi» esattamente dove hai chiuso il telefono ieri in corridoio.</p>
                <span className="lp-tag">Tab Studio</span>
              </article>
              <article className="lp-card lp-reveal">
                <div className="lp-icon" aria-hidden>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><rect x="4" y="5" width="16" height="15" rx="2" stroke="#fff" strokeWidth="1.7" /><path d="M8 3v4M16 3v4M4 10h16" stroke="#fff" strokeWidth="1.7" /></svg>
                </div>
                <h3 className="lp-h3">Piano e modalità Focus</h3>
                <p>Compiti, interrogazioni, allenamento alle 17. Erga scrive il pomeriggio intorno — e Focus toglie tutto il resto.</p>
                <span className="lp-tag">Tab Piano</span>
              </article>
              <article className="lp-card lp-reveal">
                <div className="lp-icon line" aria-hidden>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><polygon points="12,3 20,8 20,16 12,21 4,16 4,8" stroke="currentColor" strokeWidth="1.6" /></svg>
                </div>
                <h3 className="lp-h3">Esagono cognitivo</h3>
                <p>Logica, Memoria, Focus, Lessico, Calma, Pratica. Se l’ansia sale, i blocchi si spezzano. Se esci alle 17, il piano si riscrive.</p>
                <span className="lp-tag">Il cuore</span>
              </article>
            </div>
          </div>
        </section>

        <section className="lp-show" id="app">
          <div className="lp-wrap">
            <div className="lp-sec-head lp-reveal">
              <p className="lp-eyebrow">L’app</p>
              <h2 className="lp-h2">Così si presenta, sul telefono.</h2>
              <p className="lp-lead">Le stesse schermate che usi dentro Erga: home, percorso a nodi, calendario, lezione a tappe.</p>
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
              <h2 className="lp-h2">Entri con quello che hai.</h2>
            </div>
            <div className="lp-steps">
              <article className="lp-step lp-reveal">
                <div className="lp-num">01</div>
                <h3 className="lp-h3">Carica o cerca</h3>
                <p className="lp-lead" style={{ fontSize: "1rem" }}>PDF della prof, foto del quaderno, o una pagina sul web. Erga parte da lì — non da una libreria imposta.</p>
              </article>
              <article className="lp-step lp-reveal">
                <div className="lp-num">02</div>
                <h3 className="lp-h3">Segna la verifica</h3>
                <p className="lp-lead" style={{ fontSize: "1rem" }}>Compito in classe, interrogazione, recupero debito, partita alle 17. Il piano nasce intorno alla vita vera.</p>
              </article>
              <article className="lp-step lp-reveal">
                <div className="lp-num">03</div>
                <h3 className="lp-h3">Avanza sull’albero</h3>
                <p className="lp-lead" style={{ fontSize: "1rem" }}>Tappe corte. Se l’ansia sale, si spezzano. Se esci, si spostano. L’Esagono decide il taglio, non un orario fisso.</p>
              </article>
            </div>
            <div className="lp-mats">
              <div className="lp-mat lp-reveal"><i aria-hidden>PDF</i><div><b>Carica PDF</b><span>Dispense, slides, fotocopie.</span></div></div>
              <div className="lp-mat lp-reveal"><i aria-hidden>IMG</i><div><b>Carica foto</b><span>Lavagna, quaderno, libro.</span></div></div>
              <div className="lp-mat lp-reveal"><i aria-hidden>WEB</i><div><b>Ricerca web</b><span>Wikipedia, un manuale, una fonte.</span></div></div>
            </div>
          </div>
        </section>

        <section className="lp-hex-sec" id="esagono">
          <div className="lp-wrap">
            <HexagonPlay />
          </div>
        </section>

        <section id="piano">
          <div className="lp-wrap lp-plan-grid">
            <div className="lp-reveal">
              <p className="lp-eyebrow">Il piano</p>
              <h2 className="lp-h2">Il mercoledì, scritto al minuto.</h2>
              <p className="lp-lead" style={{ marginTop: "1rem" }}>
                Non una to-do. Una partitura. Scegli il giorno: lunedì è leggero, mercoledì è la verifica, il weekend è solo un richiamo. Se l’ansia sale i blocchi si spezzano; se alle 17 hai allenamento, Erga chiude prima.
              </p>
              <div style={{ marginTop: "1.4rem" }}>
                <PhoneShell tab="home" label="Home di Erga con prossima lezione e piano del giorno">
                  <PhoneHome />
                </PhoneShell>
              </div>
            </div>
            <div className="lp-reveal">
              <StudyTimeline
                day={planDay}
                onDay={setPlanDay}
                items={buildDayPlan(planDay, 18, 12, { log: 62, mem: 70, foc: 58, voc: 55, ans: 48, app: 64 })}
              />
            </div>
          </div>
        </section>

        <section>
          <div className="lp-wrap">
            <div className="lp-sec-head lp-reveal">
              <p className="lp-eyebrow">Voci</p>
              <h2 className="lp-h2">La verifica c’è. L’ansia, no.</h2>
            </div>
            <div className="lp-quotes">
              <figure className="lp-quote lp-reveal">
                <p>“Interrogazione di fisica il giorno dopo la partita. Erga mi ha chiuso alle 16:40. In campo c’ero. Il 7 l’ho preso lo stesso.”</p>
                <figcaption className="lp-who"><div className="lp-avatar">MB</div><div>Marco B.<small>3ª Liceo scientifico · calcio</small></div></figcaption>
              </figure>
              <figure className="lp-quote lp-reveal">
                <p>“I Promessi Sposi mi sembravano un muro. Quattro tappe, una sera. Il giorno dopo ho fatto l’orale senza rileggere tutto il capitolo.”</p>
                <figcaption className="lp-who"><div className="lp-avatar r">GL</div><div>Giulia L.<small>4ª Liceo classico</small></div></figcaption>
              </figure>
              <figure className="lp-quote lp-reveal">
                <p>“Quando alzo l’ansia, smette di chiedermi un’ora intera. Dieci minuti, pausa, altri dieci. Riesco a finire senza chiudere WhatsApp a metà.”</p>
                <figcaption className="lp-who"><div className="lp-avatar g">SR</div><div>Sara R.<small>5ª Scienze umane · pallavolo</small></div></figcaption>
              </figure>
            </div>
          </div>
        </section>

        <section id="prezzi">
          <div className="lp-wrap">
            <div className="lp-sec-head lp-reveal">
              <p className="lp-eyebrow">Piani</p>
              <h2 className="lp-h2">Inizia subito. Cresci se ti serve.</h2>
            </div>
            <div className="lp-price-grid">
              <article className="lp-price lp-reveal">
                <p className="lp-small">Libero</p>
                <p className="amount">0 € <span>/sempre</span></p>
                <p className="lp-small">Per la prossima verifica.</p>
                <ul>
                  <li>1 percorso attivo</li>
                  <li>Piano settimanale</li>
                  <li>Esagono in lettura</li>
                </ul>
                <Link className="lp-btn lp-btn-ghost" to="/registrati?from=piano-libero&plan=free">Inizia subito gratis</Link>
              </article>
              <article className="lp-price feat lp-reveal">
                <p className="lp-small">Pro</p>
                <p className="amount">6,99 € <span>/mese</span></p>
                <p className="lp-small">Lo strumento, senza tetto.</p>
                <ul>
                  <li>Percorsi illimitati</li>
                  <li>PDF, foto, ricerca web</li>
                  <li>Piano + modalità Focus</li>
                  <li>Esagono vivo, ogni giorno</li>
                </ul>
                <Link className="lp-btn lp-btn-primary" to="/registrati?from=piano-pro&plan=pro">Crea il tuo profilo</Link>
              </article>
              <article className="lp-price lp-reveal">
                <p className="lp-small">Classe / Istituto</p>
                <p className="amount">Su misura</p>
                <p className="lp-small">Per la prof, il cdc, la scuola.</p>
                <ul>
                  <li>Licenze multiple</li>
                  <li>Privacy e gestione classi</li>
                  <li>Onboarding docenti</li>
                </ul>
                <a className="lp-btn lp-btn-ghost" href="mailto:iris.p@example.org">Parla con noi</a>
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
                  <button type="button" aria-expanded={faqOpen === i} onClick={() => setFaqOpen(faqOpen === i ? null : i)}>
                    {q}
                    <span className="lp-plus" aria-hidden />
                  </button>
                  {faqOpen === i && <div className="a">{a}</div>}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="lp-final" id="inizia">
          <div className="lp-wrap">
            <div className="lp-final-box lp-reveal">
              <p className="lp-eyebrow" style={{ color: "#A1A1A6" }}>Onboarding · 60 secondi</p>
              <h2 className="lp-h2">Scegli la scuola. Crea la prima mappa.</h2>
              <p className="lp-lead">Niente liste, niente attese. Profilo, materia, prima verifica. Il pomeriggio resta tuo.</p>
              <div className="lp-schools" role="group" aria-label="Tipo di scuola">
                {SCHOOLS.map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    className="lp-school"
                    aria-pressed={school === id}
                    onClick={() => setSchool(id)}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <div className="lp-onboard-cta">
                <Link className="lp-btn lp-btn-red" to={signup("onboarding")}>Crea il tuo profilo</Link>
                <span className="lp-onboard-note">Gratis. Carta non richiesta. Pronto in un minuto.</span>
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
              <p className="lp-small" style={{ marginTop: "0.7rem", maxWidth: "28ch" }}>
                Studia la metà del tempo. Ricorda il doppio. Esci lo stesso.
              </p>
              <div className="lp-socials" aria-label="Social">
                <a href="https://instagram.com/erga" rel="noopener" aria-label="Instagram">IG</a>
                <a href="https://tiktok.com/@erga" rel="noopener" aria-label="TikTok">TT</a>
                <a href="mailto:iris.p@example.org" aria-label="Email">@</a>
              </div>
            </div>
            <div>
              <h4>Prodotto</h4>
              <a href="#prodotto">Studio</a>
              <a href="#piano">Piano</a>
              <a href="#esagono">Esagono cognitivo</a>
              <a href="#prezzi">Prezzi</a>
            </div>
            <div>
              <h4>Inizia</h4>
              <Link to={signup("footer")}>Crea il tuo profilo</Link>
              <a href="#faq">FAQ</a>
              <a href="mailto:iris.p@example.org">Contatti</a>
            </div>
            <div>
              <h4>Legale</h4>
              <Link to="/app/impostazioni/termini">Privacy</Link>
              <Link to="/app/impostazioni/termini">Termini</Link>
              <Link to="/app/impostazioni/termini">Cookie</Link>
            </div>
          </div>
          <div className="lp-legal">
            <span>© {new Date().getFullYear()} Erga. Tutti i diritti riservati.</span>
            <span>Attivo ora · licei e istituti tecnici</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
