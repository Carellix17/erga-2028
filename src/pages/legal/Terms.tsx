import { LegalDocument, type LegalSection } from "./LegalDocument";

const sections: LegalSection[] = [
  {
    title: "Cos'è Erga",
    body: <p>Erga è un'app che ti aiuta a studiare: trasforma i materiali che carichi (PDF, documenti, foto di appunti, ricerche) in lezioni, esercizi, test e piani di studio. Il servizio è in versione beta e può cambiare.</p>,
  },
  {
    title: "Chi può usarla",
    body: <p>Per creare un account devi fornire dati veri e tenere al sicuro la tua password. Se sei minorenne e non hai l'età per iscriverti da solo, serve il consenso di un genitore o di chi ne fa le veci, che è responsabile del tuo uso dell'app.</p>,
  },
  {
    title: "I tuoi materiali",
    body: (
      <>
        <p>I materiali che carichi restano tuoi. Ci permetti di usarli solo per offrirti il servizio, cioè per creare i tuoi contenuti di studio.</p>
        <p>Carica solo materiali che hai il diritto di usare. Non caricare contenuti illegali, offensivi o dati personali di altre persone senza permesso.</p>
      </>
    ),
  },
  {
    title: "Contenuti creati dall'intelligenza artificiale",
    body: <p>Lezioni, esercizi e risposte sono generati dall'intelligenza artificiale a partire dai tuoi materiali e possono contenere errori. Erga è un aiuto allo studio e non sostituisce libri, insegnanti o il tuo giudizio. Usala in modo onesto e rispetta le regole della tua scuola.</p>,
  },
  {
    title: "Piano Free e piano Pro",
    body: (
      <>
        <p>Il piano Free ha dei limiti di utilizzo indicati nell'app. Il piano Pro costa 4,99 € al mese e si rinnova ogni mese finché non lo disdici.</p>
        <ul>
          <li>Puoi disdire quando vuoi: mantieni Pro fino alla fine del periodo già pagato.</li>
          <li>I pagamenti sono gestiti da Paddle, che agisce come rivenditore e si occupa di fatture e tasse.</li>
          <li>Il diritto di recesso e i rimborsi seguono le regole indicate da Paddle al momento dell'acquisto e la legge applicabile.</li>
        </ul>
      </>
    ),
  },
  {
    title: "Uso corretto",
    body: <p>Non è consentito cercare di aggirare i limiti, accedere ai dati di altri utenti, sovraccaricare il servizio o usarlo per scopi illegali. In questi casi possiamo sospendere o chiudere l'account.</p>,
  },
  {
    title: "Disponibilità e responsabilità",
    body: <p>Facciamo del nostro meglio perché Erga funzioni sempre, ma possono esserci interruzioni o errori, soprattutto durante la beta. Nei limiti consentiti dalla legge non rispondiamo di danni indiretti, per esempio un voto basso dovuto a un contenuto sbagliato.</p>,
  },
  {
    title: "Chiusura dell'account",
    body: <p>Puoi smettere di usare Erga quando vuoi ed eliminare i tuoi percorsi. Per chiudere definitivamente l'account scrivici.</p>,
  },
  {
    title: "Modifiche e legge applicabile",
    body: <p>Possiamo aggiornare questi termini; se le modifiche sono importanti ti avviseremo. Si applica la legge italiana, fatti salvi i diritti che ti riconosce la legge come consumatore.</p>,
  },
  {
    title: "Contatti",
    body: <p>Per domande scrivi a <strong>info@erga-learning.app</strong>.</p>,
  },
];

export default function Terms() {
  return (
    <LegalDocument
      title="Termini di servizio"
      intro="Queste sono le regole per usare Erga. Le abbiamo scritte in modo semplice perché studenti e genitori possano capirle davvero."
      path="/termini"
      description="Le regole per usare Erga: account, materiali, intelligenza artificiale, piano Pro."
      updated="15 ottobre 2026"
      sections={sections}
      otherLink={{ to: "/privacy", label: "Informativa sulla privacy" }}
    />
  );
}
