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
  } catch {
    console.error("[push] setVapidDetails fallito");
    return false;
  }
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
}

export type PushUrgency = "very-low" | "low" | "normal" | "high";

export interface PushSendOptions {
  urgency?: PushUrgency;
  ttl?: number;
}

export interface PushSendResult {
  sent: number;
  failed: number;
  noSubscription: number;
}

function statusCodeOf(error: unknown): number | null {
  if (typeof error !== "object" || error === null || !("statusCode" in error)) return null;
  const status = (error as { statusCode?: unknown }).statusCode;
  return typeof status === "number" ? status : null;
}

// `supabase` deve essere un client service_role per leggere/cancellare tutte le righe.
export async function sendPushToUser(
  supabase: any,
  userId: string,
  payload: PushPayload,
  options?: PushSendOptions,
): Promise<PushSendResult> {
  const result: PushSendResult = { sent: 0, failed: 0, noSubscription: 0 };
  if (!ensureConfigured()) {
    result.failed = 1;
    return result;
  }

  try {
    const { data: subs, error } = await supabase
      .from("push_subscriptions")
      .select("id, endpoint, p256dh, auth")
      .eq("user_id", userId);
    if (error) {
      console.error("[push] lettura subscriptions fallita");
      result.failed = 1;
      return result;
    }
    if (!subs || subs.length === 0) {
      result.noSubscription = 1;
      return result;
    }

    const body = JSON.stringify(payload);
    const webPushOptions = options
      ? {
          ...(options.ttl !== undefined ? { TTL: options.ttl } : {}),
          ...(options.urgency ? { urgency: options.urgency } : {}),
        }
      : undefined;

    await Promise.all(
      subs.map(async (subscriptionRow: any) => {
        const subscription = {
          endpoint: subscriptionRow.endpoint,
          keys: { p256dh: subscriptionRow.p256dh, auth: subscriptionRow.auth },
        };
        try {
          if (webPushOptions) {
            await webpush.sendNotification(subscription, body, webPushOptions);
          } else {
            await webpush.sendNotification(subscription, body);
          }
          result.sent += 1;
        } catch (sendError: unknown) {
          const status = statusCodeOf(sendError);
          if (status === 404 || status === 410) {
            // Subscription scaduta: cleanup, vincolato anche all'utente destinatario.
            try {
              await supabase
                .from("push_subscriptions")
                .delete()
                .eq("id", subscriptionRow.id)
                .eq("user_id", userId);
            } catch {
              // Il cleanup non deve interrompere l'invio alle altre subscription.
            }
          } else {
            // Non registrare il body dell'errore: può contenere dati del provider.
            console.error(`[push] invio fallito (${status ?? "unknown"})`);
          }
          result.failed += 1;
        }
      }),
    );
  } catch {
    console.error("[push] errore inatteso durante l'invio");
    result.failed += 1;
  }

  return result;
}
