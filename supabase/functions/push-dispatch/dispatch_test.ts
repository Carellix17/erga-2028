import {
  constantTimeSecretEqual,
  createPushDispatchHandler,
  isQuietHours,
  romeDayRange,
  type ClaimedPush,
  type DispatchDependencies,
  type DispatchSummary,
  type PushPayload,
  type PushSendOptions,
  type PushSendResult,
  type PushSkipReason,
  type SentPushRow,
  type SleepRoutine,
  type UserPushPolicy,
} from "./dispatch.ts";

function assert(condition: unknown, message = "assertion failed"): asserts condition {
  if (!condition) throw new Error(message);
}

function assertEquals(actual: unknown, expected: unknown, message = "values differ"): void {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`${message}: expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}`);
  }
}

function fakeSecret(): string {
  return `${crypto.randomUUID()}${crypto.randomUUID()}`;
}

function row(overrides: Partial<ClaimedPush> = {}): ClaimedPush {
  return {
    id: crypto.randomUUID(),
    user_id: "test-user",
    kind: "slot_start",
    send_at: "2026-11-03T11:55:00.000Z",
    title: "Tra 5 minuti: Biologia",
    body: "Da Minilezione 1 a 7 · 15:00-16:58",
    url: "/app?tab=piano",
    tag: `erga-slot-${crypto.randomUUID()}`,
    focus_session_id: null,
    skip_reason: null,
    ...overrides,
  };
}

interface CapturedSkip {
  userId: string;
  rowId: string;
  reason: PushSkipReason;
}

interface CapturedSend {
  userId: string;
  payload: PushPayload;
  options: PushSendOptions;
}

function harness(
  rows: readonly ClaimedPush[] = [],
  overrides: Partial<DispatchDependencies> = {},
) {
  const secret = fakeSecret();
  const state: {
    claimCalls: number;
    claimLimit: number | null;
    skipUpdates: CapturedSkip[];
    sends: CapturedSend[];
    logs: DispatchSummary[];
  } = { claimCalls: 0, claimLimit: null, skipUpdates: [], sends: [], logs: [] };

  const defaults: DispatchDependencies = {
    getSecret: () => secret,
    claimDuePushes: async (limit) => {
      state.claimCalls += 1;
      state.claimLimit = limit;
      return rows;
    },
    updateSkipReason: async (userId, rowId, reason) => {
      state.skipUpdates.push({ userId, rowId, reason });
    },
    loadUserPolicy: async (): Promise<UserPushPolicy> => ({
      notifyTypes: {},
      sleepRoutines: [],
      ok: true,
    }),
    isFocusSessionOwned: async () => ({ owned: true, ok: true }),
    listSentToday: async (): Promise<{ rows: readonly SentPushRow[]; ok: boolean }> => ({ rows: [], ok: true }),
    sendPushToUser: async (
      userId: string,
      payload: PushPayload,
      options: PushSendOptions,
    ): Promise<PushSendResult> => {
      state.sends.push({ userId, payload, options });
      return { sent: 1, failed: 0, noSubscription: 0 };
    },
    now: () => new Date("2026-11-03T11:00:00.000Z"),
    logSummary: (counts) => state.logs.push(counts),
  };
  const dependencies = { ...defaults, ...overrides };
  return {
    secret,
    state,
    dependencies,
    handler: createPushDispatchHandler(dependencies),
  };
}

function request(secret?: string, options: { method?: string; body?: string } = {}): Request {
  const headers = new Headers();
  if (secret !== undefined) headers.set("x-dispatch-secret", secret);
  if (options.body !== undefined) {
    headers.set("content-type", "application/json");
    headers.set("content-length", String(new TextEncoder().encode(options.body).byteLength));
  }
  return new Request("https://edge.test/functions/v1/push-dispatch", {
    method: options.method ?? "POST",
    headers,
    ...(options.body !== undefined ? { body: options.body } : {}),
  });
}

Deno.test("dispatch rejects non-POST, missing/invalid secret, and missing configuration without claiming", async () => {
  const base = harness([row()]);
  const methodResponse = await base.handler(request(base.secret, { method: "GET" }));
  assertEquals(methodResponse.status, 405);

  const missingResponse = await base.handler(request());
  assertEquals(missingResponse.status, 401);
  const wrongResponse = await base.handler(request(`${base.secret}x`));
  assertEquals(wrongResponse.status, 401);

  const missingConfig = harness([row()], { getSecret: () => undefined });
  const unavailableResponse = await missingConfig.handler(request(missingConfig.secret));
  assertEquals(unavailableResponse.status, 503);
  const shortConfig = harness([row()], { getSecret: () => "short" });
  const shortResponse = await shortConfig.handler(request(shortConfig.secret));
  assertEquals(shortResponse.status, 503);
  assertEquals(base.state.claimCalls, 0);
  assertEquals(missingConfig.state.claimCalls, 0);
  assertEquals(shortConfig.state.claimCalls, 0);
});

Deno.test("secret comparison hashes both inputs and handles equal, unequal, and different lengths", async () => {
  const generated = fakeSecret();
  assert(await constantTimeSecretEqual(generated, generated));
  assert(!(await constantTimeSecretEqual(generated, `${generated.slice(0, -1)}x`)));
  assert(!(await constantTimeSecretEqual(generated, `${generated}longer`)));
});

Deno.test("dispatch claims at most 200 due rows and sends every valid claimed row", async () => {
  const items = [row({ user_id: "test-user-a" }), row({ user_id: "test-user-b", title: "Promemoria" })];
  const current = harness(items);
  const response = await current.handler(request(current.secret, { body: "{anything ignored}" }));
  const body = await response.json();
  assertEquals(response.status, 200);
  assertEquals(current.state.claimLimit, 200);
  assertEquals(current.state.sends.length, 2);
  assertEquals(current.state.skipUpdates.length, 0);
  assertEquals(current.state.sends[0].options, { urgency: "high", ttl: 3600 });
  assertEquals(body.claimed, 2);
  assertEquals(body.sent, 2);
  assertEquals(body.skipped, { daily_cap: 0, quiet_hours: 0, no_subscription: 0, send_error: 0 });
});

Deno.test("dispatch rejects bodies larger than 1 KB before reading them or claiming", async () => {
  const current = harness([row()]);
  let reads = 0;
  const bodyStream = new ReadableStream<Uint8Array>({
    pull(controller) {
      reads += 1;
      controller.enqueue(new TextEncoder().encode("unread notification content"));
      controller.close();
    },
  }, { highWaterMark: 0 });
  const oversizedRequest = new Request("https://edge.test/functions/v1/push-dispatch", {
    method: "POST",
    headers: {
      "x-dispatch-secret": current.secret,
      "content-length": "1025",
    },
    body: bodyStream,
  });
  const response = await current.handler(oversizedRequest);
  assertEquals(response.status, 413);
  assertEquals(reads, 0);
  assertEquals(current.state.claimCalls, 0);
});

Deno.test("dispatch refuses an unknown-length body without reading it", async () => {
  const current = harness([row()]);
  let reads = 0;
  const bodyStream = new ReadableStream<Uint8Array>({
    pull(controller) {
      reads += 1;
      controller.enqueue(new TextEncoder().encode("unread"));
      controller.close();
    },
  }, { highWaterMark: 0 });
  const unknownLengthRequest = new Request("https://edge.test/functions/v1/push-dispatch", {
    method: "POST",
    headers: { "x-dispatch-secret": current.secret },
    body: bodyStream,
  });
  const response = await current.handler(unknownLengthRequest);
  assertEquals(response.status, 413);
  assertEquals(reads, 0);
  assertEquals(current.state.claimCalls, 0);
});

Deno.test("dispatch enforces the 6-message daily cap but permits a timer push, and validates session ownership", async () => {
  const regular = row({ user_id: "cap-user", tag: "erga-slot-cap" });
  const timer = row({
    user_id: "cap-user",
    kind: "pomodoro_end",
    focus_session_id: "owned-session",
    tag: "erga-timer",
  });
  const foreignTimer = row({
    user_id: "cap-user",
    kind: "break_end",
    focus_session_id: "foreign-session",
    tag: "erga-timer",
  });
  const sent: SentPushRow[] = Array.from({ length: 6 }, (_, index) => ({
    id: `already-sent-${index}`,
    focus_session_id: null,
  }));
  const current = harness([regular, timer, foreignTimer], {
    listSentToday: async () => ({ rows: sent, ok: true }),
    isFocusSessionOwned: async (_userId, sessionId) => ({ owned: sessionId === "owned-session", ok: true }),
  });
  const response = await current.handler(request(current.secret, { body: "{}" }));
  const body = await response.json();
  assertEquals(response.status, 200);
  assertEquals(current.state.sends.length, 1);
  assertEquals(current.state.sends[0].payload.tag, "erga-timer");
  assertEquals(current.state.sends[0].options, { urgency: "high", ttl: 300 });
  assertEquals(body.sent, 1);
  assertEquals(body.skipped.daily_cap, 1);
  assertEquals(body.skipped.send_error, 1);
  assert(current.state.skipUpdates.some((update) => update.rowId === regular.id && update.reason === "daily_cap"));
  assert(current.state.skipUpdates.some((update) => update.rowId === foreignTimer.id && update.reason === "send_error"));
});

Deno.test("timer pushes have a separate technical cap of 40 per Rome day", async () => {
  const dueTimers = [
    row({ user_id: "timer-cap-user", kind: "pomodoro_end", focus_session_id: "session-40-a", tag: "erga-timer" }),
    row({ user_id: "timer-cap-user", kind: "break_end", focus_session_id: "session-40-b", tag: "erga-timer" }),
  ];
  const alreadySent: SentPushRow[] = Array.from({ length: 39 }, (_, index) => ({
    id: `timer-already-sent-${index}`,
    focus_session_id: `session-sent-${index}`,
  }));
  const current = harness(dueTimers, {
    listSentToday: async () => ({ rows: alreadySent, ok: true }),
  });
  const response = await current.handler(request(current.secret, { body: "{}" }));
  const body = await response.json();
  assertEquals(response.status, 200);
  assertEquals(current.state.sends.length, 1);
  assertEquals(current.state.sends[0].options, { urgency: "high", ttl: 300 });
  assertEquals(body.sent, 1);
  assertEquals(body.skipped.daily_cap, 1);
});

Deno.test("quiet hours cross midnight for slot reminders but never silence timer pushes", async () => {
  const overnightSleep: SleepRoutine[] = [{
    kind: "sleep",
    start_time: "21:30",
    end_time: "06:30",
    days_of_week: [2],
  }];
  const nowAfterMidnight = new Date("2026-11-04T01:30:00.000Z"); // 02:30 di mercoledì a Roma
  assert(isQuietHours(nowAfterMidnight, overnightSleep));
  assert(isQuietHours(new Date("2026-11-03T22:30:00.000Z"), overnightSleep));
  assert(!isQuietHours(new Date("2026-11-04T06:30:00.000Z"), overnightSleep));

  const slot = row({ user_id: "sleep-user", tag: "erga-slot-sleep" });
  const timer = row({
    user_id: "sleep-user",
    kind: "break_end",
    focus_session_id: "sleep-session",
    tag: "erga-timer",
  });
  const current = harness([slot, timer], {
    now: () => nowAfterMidnight,
    loadUserPolicy: async () => ({ notifyTypes: {}, sleepRoutines: overnightSleep, ok: true }),
  });
  const response = await current.handler(request(current.secret, { body: "{}" }));
  const body = await response.json();
  assertEquals(response.status, 200);
  assertEquals(current.state.sends.length, 1);
  assertEquals(current.state.sends[0].payload.tag, "erga-timer");
  assertEquals(body.skipped.quiet_hours, 1);
});

Deno.test("hide_subject replaces the row copy; missing/non-boolean setting keeps the subject", async () => {
  const privateRow = row({ title: "Biologia: tempo finito", body: "Materia Biologia" });
  const hidden = harness([privateRow], {
    loadUserPolicy: async () => ({ notifyTypes: { hide_subject: true }, sleepRoutines: [], ok: true }),
  });
  const hiddenResponse = await hidden.handler(request(hidden.secret, { body: "{}" }));
  assertEquals(hiddenResponse.status, 200);
  assert(!hidden.state.sends[0].payload.title.includes("Biologia"));
  assert(!hidden.state.sends[0].payload.body.includes("Biologia"));

  const defaultVisible = harness([privateRow], {
    loadUserPolicy: async () => ({ notifyTypes: { hide_subject: "true" }, sleepRoutines: [], ok: true }),
  });
  const visibleResponse = await defaultVisible.handler(request(defaultVisible.secret, { body: "{}" }));
  assertEquals(visibleResponse.status, 200);
  assert(defaultVisible.state.sends[0].payload.title.includes("Biologia"));

  const hiddenEnglish = harness([row({
    url: "/app?tab=piano&lang=en",
    title: "Biology slot",
    body: "Private lesson range",
  })], {
    loadUserPolicy: async () => ({ notifyTypes: { hide_subject: true }, sleepRoutines: [], ok: true }),
  });
  const englishResponse = await hiddenEnglish.handler(request(hiddenEnglish.secret, { body: "{}" }));
  assertEquals(englishResponse.status, 200);
  assertEquals(hiddenEnglish.state.sends[0].payload.title, "Study starts in 5 minutes");
});

Deno.test("notify_types disables every mapped push type before delivery", async () => {
  const disabledRows = [
    row({ user_id: "notify-user", kind: "slot_start" }),
    row({ user_id: "notify-user", kind: "evening_summary" }),
    row({ user_id: "notify-user", kind: "pomodoro_end", focus_session_id: "pomodoro-session", tag: "erga-timer" }),
    row({ user_id: "notify-user", kind: "break_end", focus_session_id: "break-session", tag: "erga-timer" }),
    row({ user_id: "notify-user", kind: "overrun", focus_session_id: "overrun-session", tag: "erga-timer" }),
  ];
  const current = harness(disabledRows, {
    loadUserPolicy: async () => ({
      notifyTypes: { slot_start: false, evening_summary: false, pomodoro: false, overrun: false },
      sleepRoutines: [],
      ok: true,
    }),
  });
  const response = await current.handler(request(current.secret, { body: "{}" }));
  const body = await response.json();
  assertEquals(response.status, 200);
  assertEquals(current.state.sends.length, 0);
  assertEquals(body.skipped.send_error, disabledRows.length);
  assertEquals(current.state.skipUpdates.map((update) => update.reason), Array(disabledRows.length).fill("send_error"));
});

Deno.test("missing and non-boolean notify_types remain enabled", async () => {
  for (const notifyTypes of [{}, { slot_start: "false" }]) {
    const current = harness([row()], {
      loadUserPolicy: async () => ({ notifyTypes, sleepRoutines: [], ok: true }),
    });
    const response = await current.handler(request(current.secret, { body: "{}" }));
    const body = await response.json();
    assertEquals(response.status, 200);
    assertEquals(current.state.sends.length, 1);
    assertEquals(body.sent, 1);
  }
});

Deno.test("disabled notification types are marked send_error before daily-cap evaluation", async () => {
  let sentCountQueries = 0;
  const alreadySent: SentPushRow[] = Array.from({ length: 6 }, (_, index) => ({
    id: `already-sent-${index}`,
    focus_session_id: null,
  }));
  const current = harness([row({ user_id: "cap-user", kind: "slot_start" })], {
    loadUserPolicy: async () => ({
      notifyTypes: { slot_start: false },
      sleepRoutines: [],
      ok: true,
    }),
    listSentToday: async () => {
      sentCountQueries += 1;
      return { rows: alreadySent, ok: true };
    },
  });
  const response = await current.handler(request(current.secret, { body: "{}" }));
  const body = await response.json();
  assertEquals(response.status, 200);
  assertEquals(current.state.sends.length, 0);
  assertEquals(body.skipped.send_error, 1);
  assertEquals(body.skipped.daily_cap, 0);
  assertEquals(current.state.skipUpdates[0].reason, "send_error");
  assertEquals(sentCountQueries, 0);
});

Deno.test("invalid payloads are skipped and responses/logs contain no user or notification content", async () => {
  const marker = "PRIVATE_SUBJECT_MARKER";
  const privateUserMarker = "private-user-marker";
  const invalidUrl = row({
    user_id: privateUserMarker,
    title: marker,
    body: `${marker} in the body`,
    url: "//evil.test/path",
  });
  const oversizedTitle = row({
    user_id: privateUserMarker,
    title: "T".repeat(81),
    body: "private body",
  });
  const oversizedBody = row({ user_id: privateUserMarker, body: "B".repeat(161) });
  const oversizedTag = row({ user_id: privateUserMarker, tag: "t".repeat(65) });
  const oversizedPayload = row({ user_id: privateUserMarker, url: `/${"x".repeat(3000)}` });
  const missingTimerSession = row({
    user_id: privateUserMarker,
    kind: "pomodoro_end",
    focus_session_id: "",
    tag: "erga-timer",
  });
  const current = harness([invalidUrl, oversizedTitle, oversizedBody, oversizedTag, oversizedPayload, missingTimerSession]);
  const response = await current.handler(request(current.secret, { body: "{}" }));
  const responseText = await response.text();
  const logText = JSON.stringify(current.state.logs);
  assertEquals(response.status, 200);
  assertEquals(current.state.sends.length, 0);
  assert(!responseText.includes(marker));
  assert(!responseText.includes(privateUserMarker));
  assert(!responseText.includes(current.secret));
  assert(!logText.includes(marker));
  assert(!logText.includes(privateUserMarker));
  assert(!logText.includes(current.secret));
  assertEquals(current.state.skipUpdates.map((update) => update.reason), [
    "send_error",
    "send_error",
    "send_error",
    "send_error",
    "send_error",
    "send_error",
  ]);
});

Deno.test("no subscriptions are recorded separately from delivery failures", async () => {
  const current = harness([row()], {
    sendPushToUser: async () => ({ sent: 0, failed: 0, noSubscription: 1 }),
  });
  const response = await current.handler(request(current.secret, { body: "{}" }));
  const body = await response.json();
  assertEquals(response.status, 200);
  assertEquals(body.skipped.no_subscription, 1);
  assertEquals(current.state.skipUpdates[0].reason, "no_subscription");
});

Deno.test("all subscription failures map to send_error", async () => {
  const current = harness([row()], {
    sendPushToUser: async () => ({ sent: 0, failed: 2, noSubscription: 0 }),
  });
  const response = await current.handler(request(current.secret, { body: "{}" }));
  const body = await response.json();
  assertEquals(response.status, 200);
  assertEquals(body.skipped.send_error, 1);
  assertEquals(current.state.skipUpdates[0].reason, "send_error");
});

Deno.test("Rome day bounds account for 23-hour and 25-hour DST days", () => {
  const springDay = romeDayRange(new Date("2026-03-29T12:00:00.000Z"));
  const autumnDay = romeDayRange(new Date("2026-10-25T12:00:00.000Z"));
  assertEquals(springDay.dayKey, "2026-03-29");
  assertEquals((springDay.until.getTime() - springDay.from.getTime()) / 3_600_000, 23);
  assertEquals(autumnDay.dayKey, "2026-10-25");
  assertEquals((autumnDay.until.getTime() - autumnDay.from.getTime()) / 3_600_000, 25);
});

Deno.test("dispatch never exceeds 20 concurrent sends", async () => {
  const rows = Array.from({ length: 45 }, (_, index) => row({
    id: `row-${index}`,
    user_id: `user-${index}`,
    tag: `erga-slot-${index}`,
  }));
  let active = 0;
  let maximum = 0;
  const current = harness(rows, {
    sendPushToUser: async () => {
      active += 1;
      maximum = Math.max(maximum, active);
      await new Promise((resolve) => setTimeout(resolve, 1));
      active -= 1;
      return { sent: 1, failed: 0, noSubscription: 0 };
    },
  });
  const response = await current.handler(request(current.secret, { body: "{}" }));
  assertEquals(response.status, 200);
  assert(maximum <= 20, `observed ${maximum} simultaneous sends`);
});
