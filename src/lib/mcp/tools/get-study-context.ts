import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";

function sb(ctx: ToolContext) {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export default defineTool({
  name: "get_study_context",
  title: "Get study context",
  description: "Return the extracted text content of a single study context owned by the signed-in user.",
  inputSchema: {
    id: z.string().uuid().describe("Study context id."),
    maxChars: z.number().int().min(500).max(200000).default(20000).describe("Truncate the returned content to this many characters."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ id, maxChars }, ctx) => {
    if (!ctx.isAuthenticated()) return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    const { data, error } = await sb(ctx)
      .from("study_contexts")
      .select("id, file_name, content, processing_status")
      .eq("id", id)
      .maybeSingle();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    if (!data) return { content: [{ type: "text", text: "Not found" }], isError: true };
    const content = (data.content ?? "").slice(0, maxChars);
    return {
      content: [{ type: "text", text: content }],
      structuredContent: { id: data.id, file_name: data.file_name, processing_status: data.processing_status, content, truncated: (data.content ?? "").length > maxChars },
    };
  },
});