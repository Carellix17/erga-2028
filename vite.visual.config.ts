import { fileURLToPath } from "node:url";
import path from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";

const root = path.dirname(fileURLToPath(import.meta.url));
const mock = (name: string) => path.resolve(root, "src/visual-preview/mocks", name);

/**
 * Isolated browser fixture config. Deliberately does not import the product's
 * vite.config.ts, Lovable MCP plugin, or PWA plugin; fixture requests are local
 * and the application backend is replaced with deterministic mocks.
 */
export default defineConfig({
  configFile: false,
  root,
  envDir: root,
  envPrefix: "VISUAL_",
  plugins: [react()],
  optimizeDeps: { entries: ["visual-preview.html"] },
  resolve: {
    alias: [
      { find: "@/hooks/useHomeDashboard", replacement: mock("useHomeDashboard.ts") },
      { find: "@/contexts/FocusContext", replacement: mock("focusContext.ts") },
      { find: "@/hooks/useHaptics", replacement: mock("haptics.ts") },
      { find: "@/contexts/AuthContext", replacement: mock("authContext.ts") },
      { find: "@/hooks/useSubscription", replacement: mock("subscription.ts") },
      { find: "@/hooks/useSubjectAccent", replacement: mock("subjectAccent.ts") },
      { find: "@/hooks/use-toast", replacement: mock("toast.ts") },
      { find: "@/hooks/useLessons", replacement: mock("lessons.ts") },
      { find: "@/hooks/useGenerationUsage", replacement: mock("generationUsage.ts") },
      { find: "@/hooks/usePushNotifications", replacement: mock("pushNotifications.ts") },
      { find: "@/hooks/useFileContexts", replacement: mock("fileContexts.ts") },
      { find: "@/integrations/supabase/client", replacement: mock("supabaseClient.ts") },
      { find: "@/lib/edgeFetch", replacement: mock("edgeFetch.ts") },
      { find: "@/lib/subjectFamily", replacement: mock("subjectFamily.ts") },
      { find: "@", replacement: path.resolve(root, "src") },
    ],
  },
  server: {
    host: "127.0.0.1",
    open: false,
    hmr: false,
  },
});
