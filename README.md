# premium-packages-web

Nuxt 3 + TypeScript frontend for the standalone Premium Packages product.

## Setup

```
npm install
cp .env.example .env
npm run dev
```

Visit `http://localhost:3000`.

## Structure

- `pages/index.vue`, `pages/packages/[id].vue` — public, SEO-facing routes. `[id].vue` shows the `useAsyncData` + `useSeoMeta` pattern for SSR'd package detail pages.
- `middleware/auth.global.ts` — route guard; everything under `/packages` and `/` stays public, everything else requires a session. Add auth-gated pages (reservation, payment management, admin) outside those prefixes.
- `stores/auth.ts` — Pinia auth store. The `setSession`/token handoff from core POTB still needs to be wired up — see the comment in that file.
- `composables/useApi.ts` — fetch wrapper pointed at the Express API, attaches the bearer token automatically.

## Porting the legacy Vue components

`ShortHaulSOA`, `GuestDetailsForm`, `AgencyDetailsForm`, the installment modal, etc. port over largely as-is (same `<script setup>`/Composition API), with two things to watch for:

1. Anything touching `window` directly (`window.Swal`, `window.loading()`) needs a `process.client` guard or `<ClientOnly>` wrapper, since Nuxt renders on the server first.
2. Prefer Nuxt's `useAsyncData`/`useFetch` over raw `onMounted` + axios for any data that should be present at SSR time (mainly the public package pages) — auth-gated pages can keep the `onMounted` pattern you already use if SSR doesn't matter there.
