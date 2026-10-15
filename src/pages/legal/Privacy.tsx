import { LegalDocument, type LegalSection } from "./LegalDocument";

const sections: LegalSection[] = [
  {
    title: "Chi gestisce i tuoi dati",
    body: (
      <>
        <p>Il titolare del trattamento è Erga. Per qualsiasi domanda sulla privacy puoi scriverci all'indirizzo indicato nella sezione «Contatti».</p>
      </>
    ),
  },
  {
    title: "Quali dati raccogliamo",
    body: (
      <ul>
        <li><strong>Account:</strong> email, nome e, se lo aggiungi, foto profilo e scuola. Se accedi con Google, Apple o Microsoft riceviamo da loro nome ed email.</li>
        <li><strong>Materiali di studio:</strong> PDF, documenti, foto di appunti e ricerche che carichi per creare i percorsi.</li>
        <li><strong>Contenuti generati:</strong> lezioni, esercizi, risultati dei test, conversazioni con il tutor e piani di studio.</li>
        <li><strong>Profilo di studio:</strong> le risposte al questionario dell'Esagono cognitivo e i punteggi che ne derivano.</li>
        <li><strong>Agenda e concentrazione:</strong> verifiche, compiti, eventi e sessioni di studio che registri.</li>
        <li><strong>Dati tecnici:</strong> informazioni necessarie al funzionamento e alla sicurezza, come registri degli errori e del numero di richieste.</li>
        <li><strong>Pagamenti:</strong> se passi a Pro, i dati della carta li gestisce il nostro rivenditore autorizzato; noi non li vediamo.</li>
      </ul>
    ),
  },
  {
    title: "Perché li usiamo",
    body: (
      <ul>
        <li>Farti accedere e salvare i tuoi progressi.</li>
        <li>Trasformare i tuoi materiali in lezioni, esercizi e piani di studio.</li>
        <li>Adattare le spiegazioni al tuo modo di studiare.</li>
        <li>Inviarti email di servizio (per esempio benvenuto o recupero password). Puoi disiscriverti dalle email non essenziali.</li>
        <li>Gestire l'abbonamento, proteggere il servizio e correggere errori.</li>
      </ul>
    ),
  },
  {
    title: "Intelligenza artificiale",
    body: (
      <>
        <p>Per generare lezioni e risposte, parti dei tuoi materiali e delle tue domande vengono inviate a fornitori di intelligenza artificiale (come Google, OpenAI, Groq e OpenRouter), che le elaborano per nostro conto.</p>
        <p>L'intelligenza artificiale può sbagliare: controlla sempre le informazioni importanti con il libro o con l'insegnante. Non caricare dati personali di altre persone o informazioni sensibili che non servono allo studio.</p>
      </>
    ),
  },
  {
    title: "Con chi condividiamo i dati",
    body: (
      <>
        <p>Non vendiamo i tuoi dati. Li condividiamo solo con i fornitori che ci servono per far funzionare Erga:</p>
        <ul>
          <li>hosting, database e archiviazione dei file (Lovable Cloud);</li>
          <li>fornitori di intelligenza artificiale e sintesi vocale;</li>
          <li>invio delle email;</li>
          <li>pagamenti (Paddle, che agisce come rivenditore);</li>
          <li>accesso con Google, Apple o Microsoft, se lo scegli.</li>
        </ul>
        <p>Alcuni di questi fornitori possono trattare i dati fuori dall'Unione Europea.</p>
      </>
    ),
  },
  {
    title: "Per quanto tempo li conserviamo",
    body: <p>Conserviamo i dati finché il tuo account è attivo. Puoi eliminare singoli percorsi in qualsiasi momento; eliminando un percorso vengono cancellati anche i contenuti collegati. Per chiudere l'account scrivici.</p>,
  },
  {
    title: "Studenti minorenni",
    body: <p>Erga è pensata per studenti, anche delle scuole superiori. Se hai meno dell'età minima prevista per iscriverti da solo, serve il consenso di un genitore o di chi ne fa le veci. I genitori possono contattarci per avere informazioni o chiedere la cancellazione dei dati del figlio.</p>,
  },
  {
    title: "I tuoi diritti",
    body: (
      <>
        <p>Puoi chiederci in qualsiasi momento di vedere, correggere, cancellare o ricevere una copia dei tuoi dati, oppure di limitarne o contestarne l'uso. Se pensi che i tuoi dati siano trattati male puoi rivolgerti al Garante per la protezione dei dati personali.</p>
      </>
    ),
  },
  {
    title: "Cookie e memoria del browser",
    body: <p>Usiamo solo strumenti tecnici necessari, per esempio per tenerti connesso e ricordare le tue preferenze. Non usiamo cookie pubblicitari.</p>,
  },
  {
    title: "Contatti e modifiche",
    body: <p>Per domande scrivi a <strong>privacy@erga-learning.app</strong>. Se cambiamo questa informativa in modo importante te lo comunicheremo nell'app o via email.</p>,
  },
];

export default function Privacy() {
  return (
    <LegalDocument
      title="Informativa sulla privacy"
      intro="Questa pagina spiega, in parole semplici, quali dati usa Erga, perché li usa e come puoi controllarli. È scritta per studenti e genitori."
      path="/privacy"
      description="Come Erga raccoglie, usa e protegge i dati di studenti e genitori."
      updated="15 ottobre 2026"
      sections={sections}
      otherLink={{ to: "/termini", label: "Termini di servizio" }}
    />
  );
}
