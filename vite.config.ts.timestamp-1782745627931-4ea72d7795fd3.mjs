// vite.config.ts
import { defineConfig } from "file:///C:/Users/anike/Pictures/original-partner-main/healthswift-mobile-design/node_modules/vite/dist/node/index.js";
import react from "file:///C:/Users/anike/Pictures/original-partner-main/healthswift-mobile-design/node_modules/@vitejs/plugin-react-swc/index.js";
import path from "path";
import { componentTagger } from "file:///C:/Users/anike/Pictures/original-partner-main/healthswift-mobile-design/node_modules/lovable-tagger/dist/index.js";
import { VitePWA } from "file:///C:/Users/anike/Pictures/original-partner-main/healthswift-mobile-design/node_modules/vite-plugin-pwa/dist/index.js";
var __vite_injected_original_dirname = "C:\\Users\\anike\\Pictures\\original-partner-main\\healthswift-mobile-design";
function fontPreloadPlugin() {
  return {
    name: "font-preload",
    enforce: "post",
    transformIndexHtml(html, ctx) {
      if (!ctx.bundle) return html;
      const fontFiles = [];
      for (const [fileName] of Object.entries(ctx.bundle)) {
        if (fileName.endsWith(".woff2") && fileName.startsWith("assets/")) {
          fontFiles.push(fileName);
        }
      }
      const preloadTags = fontFiles.map(
        (f) => `<link rel="preload" as="font" type="font/woff2" crossorigin="anonymous" href="/${f}" />`
      ).join("\n    ");
      return html.replace("</head>", `    ${preloadTags}
  </head>`);
    }
  };
}
var vite_config_default = defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080
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
                maxAgeSeconds: 60 * 60 * 24 * 365
                // 1 year
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
                maxAgeSeconds: 60 * 60 * 24 * 365
                // 1 year
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
      "@": path.resolve(__vite_injected_original_dirname, "./src")
    }
  },
  build: {
    // Keep chunks smaller to improve first-load and parallel caching.
    chunkSizeWarningLimit: 350,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return;
          if (id.includes("/react/") || id.includes("/react-dom/") || id.includes("/scheduler/")) {
            return "vendor-react";
          }
          if (id.includes("/react-router/") || id.includes("/react-router-dom/") || id.includes("/@tanstack/react-query/")) {
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
        }
      }
    }
  }
}));
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxhbmlrZVxcXFxQaWN0dXJlc1xcXFxvcmlnaW5hbC1wYXJ0bmVyLW1haW5cXFxcaGVhbHRoc3dpZnQtbW9iaWxlLWRlc2lnblwiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiQzpcXFxcVXNlcnNcXFxcYW5pa2VcXFxcUGljdHVyZXNcXFxcb3JpZ2luYWwtcGFydG5lci1tYWluXFxcXGhlYWx0aHN3aWZ0LW1vYmlsZS1kZXNpZ25cXFxcdml0ZS5jb25maWcudHNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL0M6L1VzZXJzL2FuaWtlL1BpY3R1cmVzL29yaWdpbmFsLXBhcnRuZXItbWFpbi9oZWFsdGhzd2lmdC1tb2JpbGUtZGVzaWduL3ZpdGUuY29uZmlnLnRzXCI7aW1wb3J0IHsgZGVmaW5lQ29uZmlnLCBQbHVnaW4gfSBmcm9tIFwidml0ZVwiO1xyXG5pbXBvcnQgcmVhY3QgZnJvbSBcIkB2aXRlanMvcGx1Z2luLXJlYWN0LXN3Y1wiO1xyXG5pbXBvcnQgcGF0aCBmcm9tIFwicGF0aFwiO1xyXG5pbXBvcnQgeyBjb21wb25lbnRUYWdnZXIgfSBmcm9tIFwibG92YWJsZS10YWdnZXJcIjtcclxuaW1wb3J0IHsgVml0ZVBXQSB9IGZyb20gXCJ2aXRlLXBsdWdpbi1wd2FcIjtcclxuXHJcbi8vIFBsdWdpbiB0byBpbmplY3QgZm9udCBwcmVsb2FkIGxpbmtzIGludG8gdGhlIEhUTUwgYXQgYnVpbGQgdGltZVxyXG5mdW5jdGlvbiBmb250UHJlbG9hZFBsdWdpbigpOiBQbHVnaW4ge1xyXG4gIHJldHVybiB7XHJcbiAgICBuYW1lOiBcImZvbnQtcHJlbG9hZFwiLFxyXG4gICAgZW5mb3JjZTogXCJwb3N0XCIsXHJcbiAgICB0cmFuc2Zvcm1JbmRleEh0bWwoaHRtbCwgY3R4KSB7XHJcbiAgICAgIC8vIE9ubHkgaW4gYnVpbGQgbW9kZSB3aGVuIHdlIGhhdmUgdGhlIGJ1bmRsZSBpbmZvXHJcbiAgICAgIGlmICghY3R4LmJ1bmRsZSkgcmV0dXJuIGh0bWw7XHJcbiAgICAgIGNvbnN0IGZvbnRGaWxlczogc3RyaW5nW10gPSBbXTtcclxuICAgICAgZm9yIChjb25zdCBbZmlsZU5hbWVdIG9mIE9iamVjdC5lbnRyaWVzKGN0eC5idW5kbGUpKSB7XHJcbiAgICAgICAgaWYgKGZpbGVOYW1lLmVuZHNXaXRoKFwiLndvZmYyXCIpICYmIGZpbGVOYW1lLnN0YXJ0c1dpdGgoXCJhc3NldHMvXCIpKSB7XHJcbiAgICAgICAgICBmb250RmlsZXMucHVzaChmaWxlTmFtZSk7XHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcbiAgICAgIGNvbnN0IHByZWxvYWRUYWdzID0gZm9udEZpbGVzXHJcbiAgICAgICAgLm1hcChcclxuICAgICAgICAgIChmKSA9PlxyXG4gICAgICAgICAgICBgPGxpbmsgcmVsPVwicHJlbG9hZFwiIGFzPVwiZm9udFwiIHR5cGU9XCJmb250L3dvZmYyXCIgY3Jvc3NvcmlnaW49XCJhbm9ueW1vdXNcIiBocmVmPVwiLyR7Zn1cIiAvPmBcclxuICAgICAgICApXHJcbiAgICAgICAgLmpvaW4oXCJcXG4gICAgXCIpO1xyXG4gICAgICAvLyBJbnNlcnQgcHJlbG9hZCB0YWdzIHJpZ2h0IGJlZm9yZSA8L2hlYWQ+XHJcbiAgICAgIHJldHVybiBodG1sLnJlcGxhY2UoXCI8L2hlYWQ+XCIsIGAgICAgJHtwcmVsb2FkVGFnc31cXG4gIDwvaGVhZD5gKTtcclxuICAgIH0sXHJcbiAgfTtcclxufVxyXG5cclxuLy8gaHR0cHM6Ly92aXRlanMuZGV2L2NvbmZpZy9cclxuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQ29uZmlnKCh7IG1vZGUgfSkgPT4gKHtcclxuICBzZXJ2ZXI6IHtcclxuICAgIGhvc3Q6IFwiOjpcIixcclxuICAgIHBvcnQ6IDgwODAsXHJcbiAgfSxcclxuICBwbHVnaW5zOiBbXHJcbiAgICByZWFjdCgpLFxyXG4gICAgbW9kZSA9PT0gXCJkZXZlbG9wbWVudFwiICYmIGNvbXBvbmVudFRhZ2dlcigpLFxyXG4gICAgZm9udFByZWxvYWRQbHVnaW4oKSxcclxuICAgIFZpdGVQV0Eoe1xyXG4gICAgICByZWdpc3RlclR5cGU6IFwiYXV0b1VwZGF0ZVwiLFxyXG4gICAgICBpbmplY3RSZWdpc3RlcjogXCJzY3JpcHQtZGVmZXJcIixcclxuICAgICAgaW5jbHVkZUFzc2V0czogW1wiZmF2aWNvbi5pY29cIiwgXCJhcHBsZS10b3VjaC1pY29uLnBuZ1wiLCBcInB3YS0xOTJ4MTkyLnBuZ1wiLCBcInB3YS01MTJ4NTEyLnBuZ1wiXSxcclxuICAgICAgbWFuaWZlc3Q6IHtcclxuICAgICAgICAgbmFtZTogXCJCbG9vZEx5biAtIERpYWdub3N0aWNzLiBGYXN0ZXIuIFNtYXJ0ZXIuXCIsXHJcbiAgICAgICAgIHNob3J0X25hbWU6IFwiQmxvb2RMeW5cIixcclxuICAgICAgICBkZXNjcmlwdGlvbjogXCJCb29rIGhvbWUgaGVhbHRoIHRlc3RzIGluIDYwIG1pbnV0ZXMuIE5BQkwtY2VydGlmaWVkIGxhYnMsIEFJLXBvd2VyZWQgcmVwb3J0cywgYW5kIGxpdmUgdHJhY2tpbmcuXCIsXHJcbiAgICAgICAgdGhlbWVfY29sb3I6IFwiIzRBQjNGNFwiLFxyXG4gICAgICAgIGJhY2tncm91bmRfY29sb3I6IFwiI0Y4RkFGQ1wiLFxyXG4gICAgICAgIGRpc3BsYXk6IFwic3RhbmRhbG9uZVwiLFxyXG4gICAgICAgIG9yaWVudGF0aW9uOiBcInBvcnRyYWl0XCIsXHJcbiAgICAgICAgc2NvcGU6IFwiL1wiLFxyXG4gICAgICAgIHN0YXJ0X3VybDogXCIvXCIsXHJcbiAgICAgICAgY2F0ZWdvcmllczogW1wiaGVhbHRoXCIsIFwibWVkaWNhbFwiLCBcImxpZmVzdHlsZVwiXSxcclxuICAgICAgICBpY29uczogW1xyXG4gICAgICAgICAge1xyXG4gICAgICAgICAgICBzcmM6IFwicHdhLTE5MngxOTIucG5nXCIsXHJcbiAgICAgICAgICAgIHNpemVzOiBcIjE5MngxOTJcIixcclxuICAgICAgICAgICAgdHlwZTogXCJpbWFnZS9wbmdcIixcclxuICAgICAgICAgICAgcHVycG9zZTogXCJhbnlcIlxyXG4gICAgICAgICAgfSxcclxuICAgICAgICAgIHtcclxuICAgICAgICAgICAgc3JjOiBcInB3YS01MTJ4NTEyLnBuZ1wiLFxyXG4gICAgICAgICAgICBzaXplczogXCI1MTJ4NTEyXCIsXHJcbiAgICAgICAgICAgIHR5cGU6IFwiaW1hZ2UvcG5nXCIsXHJcbiAgICAgICAgICAgIHB1cnBvc2U6IFwiYW55XCJcclxuICAgICAgICAgIH0sXHJcbiAgICAgICAgICB7XHJcbiAgICAgICAgICAgIHNyYzogXCJwd2EtNTEyeDUxMi5wbmdcIixcclxuICAgICAgICAgICAgc2l6ZXM6IFwiNTEyeDUxMlwiLFxyXG4gICAgICAgICAgICB0eXBlOiBcImltYWdlL3BuZ1wiLFxyXG4gICAgICAgICAgICBwdXJwb3NlOiBcIm1hc2thYmxlXCJcclxuICAgICAgICAgIH1cclxuICAgICAgICBdXHJcbiAgICAgIH0sXHJcbiAgICAgIHdvcmtib3g6IHtcclxuICAgICAgICBnbG9iUGF0dGVybnM6IFtcIioqLyoue2pzLGNzcyxodG1sLGljbyxwbmcsc3ZnLHdvZmYyfVwiXSxcclxuICAgICAgICBjbGVhbnVwT3V0ZGF0ZWRDYWNoZXM6IHRydWUsXHJcbiAgICAgICAgc2tpcFdhaXRpbmc6IHRydWUsXHJcbiAgICAgICAgY2xpZW50c0NsYWltOiB0cnVlLFxyXG4gICAgICAgIHJ1bnRpbWVDYWNoaW5nOiBbXHJcbiAgICAgICAgICB7XHJcbiAgICAgICAgICAgIC8vIENhY2hlIGJ1bmRsZWQgd29mZjIgZm9udHMgZnJvbSBzYW1lIG9yaWdpbiBmb3IgcmVwZWF0IHZpc2l0c1xyXG4gICAgICAgICAgICB1cmxQYXR0ZXJuOiAvXFwvYXNzZXRzXFwvLipcXC53b2ZmMiQvaSxcclxuICAgICAgICAgICAgaGFuZGxlcjogXCJDYWNoZUZpcnN0XCIsXHJcbiAgICAgICAgICAgIG9wdGlvbnM6IHtcclxuICAgICAgICAgICAgICBjYWNoZU5hbWU6IFwibG9jYWwtZm9udHMtY2FjaGVcIixcclxuICAgICAgICAgICAgICBleHBpcmF0aW9uOiB7XHJcbiAgICAgICAgICAgICAgICBtYXhFbnRyaWVzOiAyMCxcclxuICAgICAgICAgICAgICAgIG1heEFnZVNlY29uZHM6IDYwICogNjAgKiAyNCAqIDM2NSAvLyAxIHllYXJcclxuICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgIGNhY2hlYWJsZVJlc3BvbnNlOiB7XHJcbiAgICAgICAgICAgICAgICBzdGF0dXNlczogWzAsIDIwMF1cclxuICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgIH0sXHJcbiAgICAgICAgICB7XHJcbiAgICAgICAgICAgIHVybFBhdHRlcm46IC9eaHR0cHM6XFwvXFwvZm9udHNcXC5nb29nbGVhcGlzXFwuY29tXFwvLiovaSxcclxuICAgICAgICAgICAgaGFuZGxlcjogXCJDYWNoZUZpcnN0XCIsXHJcbiAgICAgICAgICAgIG9wdGlvbnM6IHtcclxuICAgICAgICAgICAgICBjYWNoZU5hbWU6IFwiZ29vZ2xlLWZvbnRzLWNhY2hlXCIsXHJcbiAgICAgICAgICAgICAgZXhwaXJhdGlvbjoge1xyXG4gICAgICAgICAgICAgICAgbWF4RW50cmllczogMTAsXHJcbiAgICAgICAgICAgICAgICBtYXhBZ2VTZWNvbmRzOiA2MCAqIDYwICogMjQgKiAzNjUgLy8gMSB5ZWFyXHJcbiAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICBjYWNoZWFibGVSZXNwb25zZToge1xyXG4gICAgICAgICAgICAgICAgc3RhdHVzZXM6IFswLCAyMDBdXHJcbiAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgXVxyXG4gICAgICB9XHJcbiAgICB9KVxyXG4gIF0uZmlsdGVyKEJvb2xlYW4pLFxyXG4gIHJlc29sdmU6IHtcclxuICAgIGFsaWFzOiB7XHJcbiAgICAgIFwiQFwiOiBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCBcIi4vc3JjXCIpLFxyXG4gICAgfSxcclxuICB9LFxyXG4gIGJ1aWxkOiB7XHJcbiAgICAvLyBLZWVwIGNodW5rcyBzbWFsbGVyIHRvIGltcHJvdmUgZmlyc3QtbG9hZCBhbmQgcGFyYWxsZWwgY2FjaGluZy5cclxuICAgIGNodW5rU2l6ZVdhcm5pbmdMaW1pdDogMzUwLFxyXG4gICAgcm9sbHVwT3B0aW9uczoge1xyXG4gICAgICBvdXRwdXQ6IHtcclxuICAgICAgICBtYW51YWxDaHVua3MoaWQpIHtcclxuICAgICAgICAgIGlmICghaWQuaW5jbHVkZXMoXCJub2RlX21vZHVsZXNcIikpIHJldHVybjtcclxuXHJcbiAgICAgICAgICBpZiAoXHJcbiAgICAgICAgICAgIGlkLmluY2x1ZGVzKFwiL3JlYWN0L1wiKSB8fFxyXG4gICAgICAgICAgICBpZC5pbmNsdWRlcyhcIi9yZWFjdC1kb20vXCIpIHx8XHJcbiAgICAgICAgICAgIGlkLmluY2x1ZGVzKFwiL3NjaGVkdWxlci9cIilcclxuICAgICAgICAgICkge1xyXG4gICAgICAgICAgICByZXR1cm4gXCJ2ZW5kb3ItcmVhY3RcIjtcclxuICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICBpZiAoXHJcbiAgICAgICAgICAgIGlkLmluY2x1ZGVzKFwiL3JlYWN0LXJvdXRlci9cIikgfHxcclxuICAgICAgICAgICAgaWQuaW5jbHVkZXMoXCIvcmVhY3Qtcm91dGVyLWRvbS9cIikgfHxcclxuICAgICAgICAgICAgaWQuaW5jbHVkZXMoXCIvQHRhbnN0YWNrL3JlYWN0LXF1ZXJ5L1wiKVxyXG4gICAgICAgICAgKSB7XHJcbiAgICAgICAgICAgIHJldHVybiBcInZlbmRvci1yb3V0aW5nLXF1ZXJ5XCI7XHJcbiAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgaWYgKGlkLmluY2x1ZGVzKFwiL0ByYWRpeC11aS9cIikpIHtcclxuICAgICAgICAgICAgcmV0dXJuIFwidmVuZG9yLXJhZGl4XCI7XHJcbiAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgaWYgKGlkLmluY2x1ZGVzKFwiL2ZyYW1lci1tb3Rpb24vXCIpKSB7XHJcbiAgICAgICAgICAgIHJldHVybiBcInZlbmRvci1tb3Rpb25cIjtcclxuICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICBpZiAoaWQuaW5jbHVkZXMoXCIvcmVjaGFydHMvXCIpIHx8IGlkLmluY2x1ZGVzKFwiL2QzLVwiKSkge1xyXG4gICAgICAgICAgICByZXR1cm4gXCJ2ZW5kb3ItY2hhcnRzXCI7XHJcbiAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgaWYgKGlkLmluY2x1ZGVzKFwiL0BzdXBhYmFzZS9cIikpIHtcclxuICAgICAgICAgICAgcmV0dXJuIFwidmVuZG9yLXN1cGFiYXNlXCI7XHJcbiAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH0sXHJcbiAgICAgIH0sXHJcbiAgICB9LFxyXG4gIH0sXHJcbn0pKTtcclxuIl0sCiAgIm1hcHBpbmdzIjogIjtBQUFtWixTQUFTLG9CQUE0QjtBQUN4YixPQUFPLFdBQVc7QUFDbEIsT0FBTyxVQUFVO0FBQ2pCLFNBQVMsdUJBQXVCO0FBQ2hDLFNBQVMsZUFBZTtBQUp4QixJQUFNLG1DQUFtQztBQU96QyxTQUFTLG9CQUE0QjtBQUNuQyxTQUFPO0FBQUEsSUFDTCxNQUFNO0FBQUEsSUFDTixTQUFTO0FBQUEsSUFDVCxtQkFBbUIsTUFBTSxLQUFLO0FBRTVCLFVBQUksQ0FBQyxJQUFJLE9BQVEsUUFBTztBQUN4QixZQUFNLFlBQXNCLENBQUM7QUFDN0IsaUJBQVcsQ0FBQyxRQUFRLEtBQUssT0FBTyxRQUFRLElBQUksTUFBTSxHQUFHO0FBQ25ELFlBQUksU0FBUyxTQUFTLFFBQVEs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
