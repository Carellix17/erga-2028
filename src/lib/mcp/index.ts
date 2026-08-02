import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listStudyContexts from "./tools/list-study-contexts";
import getStudyContext from "./tools/get-study-context";
import listLessons from "./tools/list-lessons";
import getLesson from "./tools/get-lesson";

const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "erga-mcp",
  title: "Erga Study MCP",
  version: "0.1.0",
  instructions:
    "Tools for the Erga study app. Use `list_study_contexts` to see the user's uploaded study materials, `get_study_context` to read the extracted text of one, `list_lessons` to enumerate mini-lessons for a context, and `get_lesson` to read a single mini-lesson in full.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [listStudyContexts, getStudyContext, listLessons, getLesson],
});