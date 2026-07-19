import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { edgeFetch } from "@/lib/edgeFetch";
import { useTrackedMutation } from "./useTrackedMutation";

export interface StudyEvent {
  id: string;
  subject: string;
  title: string;
  event_date: string;
  event_time?: string;
  event_type: "test" | "assignment" | "study";
}

export const studyEventsKeys = {
  all: (userId: string | null) => ["study-events", userId] as const,
};

export function useStudyEventsQuery(enabled: boolean) {
  const { currentUser } = useAuth();
  return useQuery<StudyEvent[]>({
    queryKey: studyEventsKeys.all(currentUser),
    queryFn: async () => {
      const data = await edgeFetch<{ events?: StudyEvent[] }>("save-event", {
        userId: currentUser,
        action: "list",
      });
      return data.events ?? [];
    },
    enabled: enabled && !!currentUser,
  });
}

interface AddEventInput {
  subject: string;
  title: string;
  date: string;
  time?: string;
  type: "test" | "assignment" | "study";
}

export function useAddStudyEvents() {
  const { currentUser } = useAuth();
  const qc = useQueryClient();
  return useTrackedMutation<unknown, Error, AddEventInput[]>({
    mutationFn: (events) =>
      edgeFetch("save-event", { userId: currentUser, action: "add", events }),
    onSuccess: () => qc.invalidateQueries({ queryKey: studyEventsKeys.all(currentUser) }),
  });
}

export function useDeleteStudyEvent() {
  const { currentUser } = useAuth();
  const qc = useQueryClient();
  return useTrackedMutation<unknown, Error, string, { previous?: StudyEvent[] }>({
    mutationFn: (eventId) =>
      edgeFetch("save-event", { userId: currentUser, action: "delete", events: [eventId] }),
    onMutate: async (eventId) => {
      const qk = studyEventsKeys.all(currentUser);
      await qc.cancelQueries({ queryKey: qk });
      const previous = qc.getQueryData<StudyEvent[]>(qk);
      if (previous) {
        qc.setQueryData<StudyEvent[]>(qk, previous.filter((e) => e.id !== eventId));
      }
      return { previous };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.previous) qc.setQueryData(studyEventsKeys.all(currentUser), ctx.previous);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: studyEventsKeys.all(currentUser) }),
  });
}

export interface UpdateStudyEventInput {
  id: string;
  subject?: string;
  title?: string;
  date?: string;
  time?: string | null;
  type?: "test" | "assignment" | "study";
}

export function useUpdateStudyEvent() {
  const { currentUser } = useAuth();
  const qc = useQueryClient();
  return useTrackedMutation<unknown, Error, UpdateStudyEventInput, { previous?: StudyEvent[] }>({
    mutationFn: (event) =>
      edgeFetch("save-event", { userId: currentUser, action: "update", event }),
    onMutate: async (event) => {
      const qk = studyEventsKeys.all(currentUser);
      await qc.cancelQueries({ queryKey: qk });
      const previous = qc.getQueryData<StudyEvent[]>(qk);
      if (previous) {
        qc.setQueryData<StudyEvent[]>(
          qk,
          previous.map((e) =>
            e.id === event.id
              ? {
                  ...e,
                  subject: event.subject ?? e.subject,
                  title: event.title ?? e.title,
                  event_date: event.date ?? e.event_date,
                  event_time: event.time === undefined ? e.event_time : (event.time ?? undefined),
                  event_type: event.type ?? e.event_type,
                }
              : e,
          ),
        );
      }
      return { previous };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.previous) qc.setQueryData(studyEventsKeys.all(currentUser), ctx.previous);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: studyEventsKeys.all(currentUser) }),
  });
}

export function useDeleteStudyEventsByType() {
  const { currentUser } = useAuth();
  const qc = useQueryClient();
  return useTrackedMutation<unknown, Error, "study" | "test" | "assignment">({
    mutationFn: (eventType) =>
      edgeFetch("save-event", { userId: currentUser, action: "deleteByType", eventType }),
    onSuccess: () => qc.invalidateQueries({ queryKey: studyEventsKeys.all(currentUser) }),
  });
}

export function useDeleteAllStudyEvents() {
  const { currentUser } = useAuth();
  const qc = useQueryClient();
  return useTrackedMutation<unknown, Error, void>({
    mutationFn: () =>
      edgeFetch("save-event", { userId: currentUser, action: "deleteAll" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: studyEventsKeys.all(currentUser) }),
  });
}