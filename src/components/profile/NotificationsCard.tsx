import { useState } from "react";
import { Bell, BellOff, Loader2, CheckCircle2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { supabase } from "@/integrations/supabase/client";

export function NotificationsCard() {
  const { supported, permission, subscribe } = usePushNotifications();
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);
  const [testing, setTesting] = useState(false);

  const handleEnable = async () => {
    setBusy(true);
    const ok = await subscribe();
    setBusy(false);
    if (ok) {
      toast({ title: "Notifiche attivate", description: "Ti avviseremo quando i tuoi materiali sono pronti." });
    } else {
      toast({
        title: "Non è stato possibile attivare",
        description: Notification.permission === "denied"
          ? "Hai bloccato le notifiche nel browser. Sbloccale dalle impostazioni del sito."
          : "Riprova tra un istante.",
        variant: "destructive",
      });
    }
  };

  const handleTest = async () => {
    setTesting(true);
    try {
      // Assicurati di essere iscritto
      await subscribe();
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error("Non autenticato");
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/push-test`,
        { method: "POST", headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Errore");
      if ((data?.subscriptions ?? 0) === 0) {
        toast({
          title: "Nessun dispositivo iscritto",
          description: "Attiva prima le notifiche per ricevere il test.",
          variant: "destructive",
        });
      } else {
        toast({ title: "Test inviato 🚀", description: "Dovresti riceverlo a momenti." });
      }
    } catch (e) {
      toast({
        title: "Errore invio test",
        description: e instanceof Error ? e.message : "Riprova",
        variant: "destructive",
      });
    } finally {
      setTesting(false);
    }
  };

  if (!supported) {
    return (
      <div className="m3-card-elevated rounded-3xl p-5 space-y-3">
        <div className="flex items-center gap-2">
          <BellOff className="w-5 h-5 text-muted-foreground" />
          <h2 className="title-medium font-display text-foreground">Notifiche push</h2>
        </div>
        <p className="body-small text-muted-foreground">
          Le notifiche non sono disponibili in questo contesto. Apri l'app dal dominio pubblicato
          (o installala sul telefono come PWA dal menu del browser → "Aggiungi a schermata Home")
          per riceverle quando lezioni ed esercizi sono pronti.
        </p>
      </div>
    );
  }

  const granted = permission === "granted";
  const denied = permission === "denied";

  return (
    <div className="m3-card-elevated rounded-3xl p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Bell className="w-5 h-5 text-primary" />
        <h2 className="title-medium font-display text-foreground">Notifiche push</h2>
      </div>
      <p className="body-small text-muted-foreground -mt-2">
        Ricevi un avviso sul dispositivo quando le tue lezioni o esercizi sono pronti — anche se hai chiuso l'app.
      </p>

      {denied ? (
        <div className="rounded-2xl bg-error-container/40 p-3 body-small text-foreground">
          Hai bloccato le notifiche. Per riattivarle, apri le impostazioni del sito nel browser e consenti le notifiche.
        </div>
      ) : granted ? (
        <div className="flex items-center gap-2 rounded-2xl bg-success-container/60 px-3 py-2">
          <CheckCircle2 className="w-4 h-4 text-success" />
          <span className="body-small text-foreground">Notifiche attive su questo dispositivo</span>
        </div>
      ) : null}

      <div className="flex gap-2 flex-wrap">
        {!granted && !denied && (
          <Button onClick={handleEnable} disabled={busy} className="rounded-full">
            {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Bell className="w-4 h-4 mr-2" />}
            Attiva notifiche
          </Button>
        )}
        <Button onClick={handleTest} disabled={testing || denied} variant="outline" className="rounded-full">
          {testing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
          Invia notifica di test
        </Button>
      </div>
    </div>
  );
}