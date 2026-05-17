import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
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
      },
      manifest: {
        name: "Erga - Ridefinisci lo studio",
        short_name: "Erga",
        description: "Erga rivoluziona l'apprendimento, organizzando il materiale su più livelli.",
        theme_color: "#6D4FE8",
        background_color: "#ffffff",
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
