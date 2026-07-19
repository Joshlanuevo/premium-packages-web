export default defineNuxtConfig({
  compatibilityDate: "2024-08-01",
  devtools: { enabled: true },
  modules: ["@pinia/nuxt", "@nuxtjs/tailwindcss"],

  runtimeConfig: {
    public: {
      apiBase: process.env.NUXT_PUBLIC_API_BASE || "http://localhost:4000/api",
    },
  },

  // Public package pages get pre-rendered/SSR'd for SEO; authenticated app
  // pages (reservation, payments, admin) can stay client-rendered per-route
  // via `definePageMeta({ ssr: false })` once you're ready to draw that line.
  nitro: {
    prerender: {
      routes: [],
    },
  },
});
