import { defineConfig, Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

// Plugin to inject font preload links into the HTML at build time
function fontPreloadPlugin(): Plugin {
  return {
    name: "font-preload",
    enforce: "post",
    transformIndexHtml(html, ctx) {
      // Only in build mode when we have the bundle info
      if (!ctx.bundle) return html;
      const fontFiles: string[] = [];
      for (const [fileName] of Object.entries(ctx.bundle)) {
        if (fileName.endsWith(".woff2") && fileName.startsWith("assets/")) {
          fontFiles.push(fileName);
        }
      }
      const preloadTags = fontFiles
        .map(
          (f) =>
            `<link rel="preload" as="font" type="font/woff2" crossorigin="anonymous" href="/${f}" />`
        )
        .join("\n    ");
      // Insert preload tags right before </head>
      return html.replace("</head>", `    ${preloadTags}\n  </head>`);
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    fontPreloadPlugin(),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: "script-defer",
      includeAssets: ["favicon.ico", "apple-touch-icon.png", "pwa-192x192.png", "pwa-512x512.png"],
      manifest: {
         name: "BloodLyn - Diagnostics. Faster. Smarter.",
         short_name: "BloodLyn",
        description: "Book home health tests in 60 minutes. NABL-certified labs, AI-powered reports, and live tracking.",
        theme_color: "#4AB3F4",
        background_color: "#F8FAFC",
        display: "standalone",
        orientation: "portrait",
        scope: "/",
        start_url: "/",
        categories: ["health", "medical", "lifestyle"],
        icons: [
          {
            src: "pwa-192x192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any"
          },
          {
            src: "pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any"
          },
          {
            src: "pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable"
          }
        ]
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
        cleanupOutdatedCaches: true,
        skipWaiting: true,
        clientsClaim: true,
        runtimeCaching: [
          {
            // Cache bundled woff2 fonts from same origin for repeat visits
            urlPattern: /\/assets\/.*\.woff2$/i,
            handler: "CacheFirst",
            options: {
              cacheName: "local-fonts-cache",
              expiration: {
                maxEntries: 20,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts-cache",
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          }
        ]
      }
    })
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    // Keep chunks smaller to improve first-load and parallel caching.
    chunkSizeWarningLimit: 350,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return;

          if (
            id.includes("/react/") ||
            id.includes("/react-dom/") ||
            id.includes("/scheduler/")
          ) {
            return "vendor-react";
          }

          if (
            id.includes("/react-router/") ||
            id.includes("/react-router-dom/") ||
            id.includes("/@tanstack/react-query/")
          ) {
            return "vendor-routing-query";
          }

          if (id.includes("/@radix-ui/")) {
            return "vendor-radix";
          }

          if (id.includes("/framer-motion/")) {
            return "vendor-motion";
          }

          if (id.includes("/recharts/") || id.includes("/d3-")) {
            return "vendor-charts";
          }

          if (id.includes("/@supabase/")) {
            return "vendor-supabase";
          }

          return;
        },
      },
    },
  },
}));
