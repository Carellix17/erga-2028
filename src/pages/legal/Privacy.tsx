import { PRIVACY_CONTACT_EMAIL } from "@/lib/legal";
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
    title: "Dati tecnici sull'uso dell'AI",
    body: (
      <>
        <p><strong>Statistiche sui costi dell'intelligenza artificiale</strong></p>
        <p>Per capire quanto ci costa far funzionare Erga e decidere prezzi e limiti dei piani, registriamo per ogni richiesta all'AI solo dati tecnici: funzione usata, modello, numero di parole elaborate (token), costo stimato, tipo di piano e data. <strong>In questi contatori non registriamo chi sei</strong> (nessun nome, email, id o codice che ti identifichi) <strong>né cosa scrivi o cosa ti risponde l'IA.</strong> Dal 24 novembre 2026 questi contatori non registrano chi sei. I dati raccolti prima di quella data vengono cancellati entro 90 giorni. Dopo 90 giorni i dati dei singoli conteggi vengono cancellati; teniamo solo totali settimanali, ciascuno formato da almeno 10 richieste, che non contengono nessun dato su chi le ha fatte. Non li usiamo per pubblicità né per decisioni che riguardano te. Base: il nostro interesse a gestire in modo sostenibile il servizio (art. 6.1.f GDPR). Puoi chiederci informazioni o opporti scrivendo a <strong>{PRIVACY_CONTACT_EMAIL}</strong>.</p>
        <p>Questi contatori registrano solo quanto costa ogni domanda all'IA: non sanno chi l'ha fatta né cosa hai scritto. Dopo 90 giorni li cancelliamo e teniamo solo i totali di ogni settimana, senza nessun dato su di te. (Le tue conversazioni con il tutor sono un'altra cosa: restano salvate nel tuo account, come spiegato sopra.)</p>
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
    body: <p>Conserviamo i dati finché il tuo account è attivo. Puoi eliminare singoli percorsi in qualsiasi momento: con il percorso si cancellano le lezioni. Se cancelli un percorso, le chat collegate non spariscono: le trovi ancora nella sezione chat e puoi cancellarle da lì. Per chiudere l'account scrivici.</p>,
  },
  {
    title: "Per quanto tempo conserviamo i tuoi dati",
    body: (
      <>
        <ul>
          <li><strong>Conversazioni con il tutor</strong> (chat generale e chat per argomento): restano nel tuo account finché non le cancelli tu, o finché non cancelli l'account. Se cancelli un percorso, le chat collegate non spariscono: le trovi ancora nella sezione chat e puoi cancellarle da lì.</li>
          <li><strong>Chat dentro le lezioni ed esercizi guidati in palestra:</strong> non le salviamo. Spariscono quando chiudi o ricarichi la pagina.</li>
          <li><strong>Profilo di studio</strong> (come preferisci studiare, ricavato dalle risposte all'onboarding e dai risultati, non da quello che scrivi in chat): resta finché hai l'account.</li>
          <li><strong>Contatori dei costi dell'IA:</strong> al massimo 90 giorni, come spiegato sopra.</li>
          <li><strong>Account:</strong> puoi chiederci in qualsiasi momento di cancellarlo scrivendo a <strong>{PRIVACY_CONTACT_EMAIL}</strong>. Lo cancelliamo entro 30 giorni, con tutte le conversazioni, il profilo di studio e i file caricati.</li>
        </ul>
        <p>Non creiamo riassunti o "memorie" delle tue conversazioni.</p>
      </>
    ),
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
    body: <p>Per domande scrivi a <strong>{PRIVACY_CONTACT_EMAIL}</strong>. Se cambiamo questa informativa in modo importante te lo comunicheremo nell'app o via email.</p>,
  },
];

export default function Privacy() {
  return (
    <LegalDocument
      title="Informativa sulla privacy"
      intro="Questa pagina spiega, in parole semplici, quali dati usa Erga, perché li usa e come puoi controllarli. È scritta per studenti e genitori."
      path="/privacy"
      description="Come Erga raccoglie, usa e protegge i dati di studenti e genitori."
      updated="19 novembre 2026"
      sections={sections}
      brief={{
        title: "In breve",
        body: "Le tue chat con il tutor restano finché non le cancelli. Per cancellare tutto l'account scrivici: lo facciamo entro 30 giorni.",
      }}
      otherLink={{ to: "/termini", label: "Termini di servizio" }}
    />
  );
}
