import { createClient } from "npm:@supabase/supabase-js@2.91.1";
import { sendPushToUser } from "../_shared/push.ts";
import {
  createPushDispatchHandler,
  type ClaimedPush,
  type SleepRoutine,
} from "./dispatch.ts";

function serviceClient() {
  const url = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceRoleKey) throw new Error("service configuration unavailable");
  return createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

const handler = createPushDispatchHandler({
  getSecret: () => Deno.env.get("PUSH_DISPATCH_SECRET"),
  claimDuePushes: async (limit) => {
    const { data, error } = await serviceClient().rpc("claim_due_pushes", { p_limit: limit });
    if (error) throw new Error("claim failed");
    return (data ?? []) as unknown as ClaimedPush[];
  },
  updateSkipReason: async (userId, rowId, reason) => {
    const { error } = await serviceClient()
      .from("scheduled_pushes")
      .update({ skip_reason: reason })
      .eq("id", rowId)
      .eq("user_id", userId);
    if (error) throw new Error("result update failed");
  },
  loadUserPolicy: async (userId) => {
    const client = serviceClient();
    const [settingsResult, routinesResult] = await Promise.all([
      client
        .from("planner_settings")
        .select("notify_types")
        .eq("user_id", userId)
        .maybeSingle(),
      client
        .from("user_routines")
        .select("kind, start_time, end_time, days_of_week")
        .eq("user_id", userId)
        .eq("kind", "sleep"),
    ]);
    if (settingsResult.error || routinesResult.error) {
      return { notifyTypes: null, sleepRoutines: [], ok: false };
    }
    return {
      notifyTypes: settingsResult.data?.notify_types ?? null,
      sleepRoutines: (routinesResult.data ?? []) as SleepRoutine[],
      ok: true,
    };
  },
  isFocusSessionOwned: async (userId, sessionId) => {
    const { data, error } = await serviceClient()
      .from("focus_sessions")
      .select("id")
      .eq("id", sessionId)
      .eq("user_id", userId)
      .maybeSingle();
    return { owned: !!data && !error, ok: !error };
  },
  listSentToday: async (userId, from, until) => {
    const { data, error } = await serviceClient()
      .from("scheduled_pushes")
      .select("id, focus_session_id")
      .eq("user_id", userId)
      .gte("sent_at", from)
      .lt("sent_at", until)
      .is("skip_reason", null);
    return {
      rows: (data ?? []) as { id: string; focus_session_id: string | null }[],
      ok: !error,
    };
  },
  sendPushToUser: async (userId, payload, options) =>
    sendPushToUser(serviceClient(), userId, payload, options),
  logSummary: (counts) => console.info("[push-dispatch] batch complete", counts),
});

Deno.serve(handler);
