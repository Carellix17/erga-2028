import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";
import { mcpPlugin } from "@lovable.dev/mcp-js/stacks/supabase/vite";

/**
 * Separazione dei chunk in gruppi stabili.
 *
 * Senza questo, un visitatore della landing scaricava un unico blocco
 * vendor che conteneva anche pdfjs, recharts e framer-motion: roba che
 * serve solo dentro /app. Raggruppare per libreria (invece di per route)
 * mantiene le firme dei file stabili tra build, quindi la cache del
 * browser sopravvive ai deploy.
 */
function manualChunks(id: string): string | undefined {
  if (!id.includes("node_modules")) return undefined;
  if (id.includes("react-router")) return "router";
  if (/[\\/]react-dom[\\/]|[\\/]react[\\/]|[\\/]scheduler[\\/]/.test(id)) return "react";
  if (id.includes("@supabase") || id.includes("@lovable.dev")) return "supabase";
  if (id.includes("@tanstack")) return "query";
  if (id.includes("pdfjs-dist")) return "pdf";
  if (id.includes("recharts") || id.includes("d3-")) return "charts";
  if (id.includes("framer-motion")) return "motion";
  if (id.includes("i18next")) return "i18n";
  if (id.includes("@radix-ui")) return "radix";
  if (id.includes("lucide-react")) return "icons";
  return "vendor";
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    allowedHosts: true, // dev-only: consente l'anteprima remota (nessun effetto in build)
    hmr: {
      overlay: false,
    },
  },
  build: {
    target: "es2020",
    cssCodeSplit: true,
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: { manualChunks },
    },
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    // Il bridge MCP serve all'editor, non agli utenti finali: fuori dalla
    // build di produzione.
    mode === "development" && mcpPlugin(),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: null, // We register manually with iframe/preview guards
      strategies: "injectManifest",
      srcDir: "src",
      filename: "sw.ts",
      includeAssets: ["favicon.ico", "apple-touch-icon.png", "icon-192.png", "icon-512.png"],
      devOptions: {
        enabled: false,
      },
      injectManifest: {
        globPatterns: ["**/*.{js,css,html,svg,png,ico,woff2}"],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
      },
      manifest: {
        name: "Erga - Ridefinisci lo studio",
        short_name: "Erga",
        description: "Erga rivoluziona l'apprendimento, organizzando il materiale su più livelli.",
        theme_color: "#0a0a0a",
        background_color: "#f5f5f5",
        display: "standalone",
        orientation: "portrait",
        scope: "/",
        start_url: "/",
        lang: "it",
        icons: [
          { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
          { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
          { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime"],
  },
}));
