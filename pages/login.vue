<script setup lang="ts">
// Premium Packages has its own login page, but no accounts of its own — this
// posts to Premium Packages' own /auth/login, which proxies server-to-server
// to LakbayHub's auth API. Same accounts, same passwords, just no redirect
// to another domain.
//
// Layout matches the existing LakbayHub sign-in design (photo + warm
// gradient card), rebranded with Gladex's logo/colors. Rebuilt with Tailwind
// and a decorative sun/palm watermark so the gradient panel reads as
// designed rather than a card floating in empty space.

interface LoginResponse {
  status: boolean;
  message?: string;
  data?: { token: string };
}

useHead({
  link: [
    {
      rel: "stylesheet",
      href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap",
    },
  ],
});

const auth = useAuthStore();
const router = useRouter();
const { request } = useApi();

const email = ref("");
const password = ref("");
const showPassword = ref(false);
const error = ref<string | null>(null);
const isSubmitting = ref(false);

async function submit() {
  error.value = null;

  if (!email.value || !password.value) {
    error.value = "Email and password are required.";
    return;
  }

  isSubmitting.value = true;

  try {
    const result = await request<LoginResponse>("/auth/login", {
      method: "POST",
      body: { email: email.value, password: password.value },
    });

    if (!result.data?.token) {
      throw new Error("Login response was missing a token.");
    }

    auth.setToken(result.data.token);
    router.push("/");
  } catch (err) {
    const fetchError = err as { data?: { error?: string }; message?: string };
    error.value = fetchError?.data?.error || fetchError?.message || "Login failed. Please check your credentials.";
  } finally {
    isSubmitting.value = false;
  }
}
</script>

<template>
  <main class="min-h-screen grid grid-cols-1 md:grid-cols-2 font-sans text-stone-900" style="font-family: 'Inter', system-ui, sans-serif">
    <!-- Photo (left, hidden on mobile) -->
    <div class="relative hidden md:block overflow-hidden bg-neutral-900">
      <img src="/images/login-photo.png" alt="" class="absolute inset-0 h-full w-full object-cover" />
    </div>

    <!-- Gradient panel (right) -->
    <div
      class="relative flex flex-col items-center justify-center overflow-hidden px-6 py-12"
      style="background: linear-gradient(160deg, #fff8ed 0%, #fde7c8 30%, #f7b955 65%, #f2954a 100%)"
    >
      <!-- Decorative watermark: oversized sun + palm silhouettes, low opacity,
           fills the panel with texture instead of leaving flat dead space -->
      <svg
        class="pointer-events-none absolute -right-24 -top-24 h-[560px] w-[560px] opacity-[0.14] md:h-[720px] md:w-[720px]"
        viewBox="0 0 800 800"
        fill="none"
      >
        <circle cx="400" cy="400" r="260" fill="#B5490A" />
      </svg>
      <svg
        class="pointer-events-none absolute -bottom-16 -left-16 h-72 w-72 opacity-[0.16] md:h-96 md:w-96"
        viewBox="0 0 400 400"
        fill="none"
      >
        <path
          d="M200 400C196 320 206 260 220 220C224 240 218 270 212 296C238 272 268 262 292 266C270 278 246 296 230 318C252 310 278 308 298 320C270 322 244 334 226 352C216 366 210 380 206 394 Z"
          fill="#B5490A"
        />
      </svg>

      <div class="relative w-full max-w-md">
        <div class="rounded-2xl border border-white/60 bg-white/90 backdrop-blur-sm shadow-[0_30px_60px_-15px_rgba(120,72,20,0.35)] px-8 py-9 sm:px-10 sm:py-11">
          <img src="/images/gladex-logo.jpg" alt="Gladex Travel and Tours Corp." class="h-14 w-auto mb-6" />

          <h1 class="text-2xl font-bold text-orange-600 mb-1">Welcome to Gladex!</h1>
          <p class="text-sm text-stone-500 mb-8">Sign in to your account</p>

          <form class="flex flex-col gap-5" @submit.prevent="submit" novalidate>
            <div class="flex flex-col gap-1.5">
              <label for="email" class="text-sm font-semibold text-stone-800">Email Address</label>
              <input
                id="email"
                v-model="email"
                type="email"
                autocomplete="email"
                placeholder="Enter your email"
                required
                class="w-full rounded-lg border border-stone-200 bg-white px-3.5 py-3 text-sm text-stone-900 placeholder-stone-400 transition-colors hover:border-stone-300 focus:border-orange-400 focus:outline-none focus:ring-4 focus:ring-orange-400/15"
              />
            </div>

            <div class="flex flex-col gap-1.5">
              <label for="password" class="text-sm font-semibold text-stone-800">Password</label>
              <div class="relative">
                <input
                  id="password"
                  v-model="password"
                  :type="showPassword ? 'text' : 'password'"
                  autocomplete="current-password"
                  placeholder="Enter your password"
                  required
                  class="w-full rounded-lg border border-stone-200 bg-white px-3.5 py-3 pr-11 text-sm text-stone-900 placeholder-stone-400 transition-colors hover:border-stone-300 focus:border-orange-400 focus:outline-none focus:ring-4 focus:ring-orange-400/15"
                />
                <button
                  type="button"
                  class="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 text-stone-400 transition-colors hover:text-stone-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-orange-400"
                  :aria-label="showPassword ? 'Hide password' : 'Show password'"
                  @click="showPassword = !showPassword"
                >
                  <svg v-if="!showPassword" width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7Z"
                      stroke="currentColor"
                      stroke-width="1.8"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    />
                    <circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="1.8" />
                  </svg>
                  <svg v-else width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M3 3l18 18M10.6 10.6a3 3 0 0 0 4.24 4.24M9.9 5.1A11 11 0 0 1 12 5c7 0 11 7 11 7a13.2 13.2 0 0 1-3.1 3.9M6.6 6.6C3.6 8.5 1 12 1 12s4 7 11 7a10.6 10.6 0 0 0 3.9-.75"
                      stroke="currentColor"
                      stroke-width="1.8"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    />
                  </svg>
                </button>
              </div>
            </div>

            <p v-if="error" role="alert" class="rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-700">
              {{ error }}
            </p>

            <button
              type="submit"
              :disabled="isSubmitting"
              class="mt-1 flex items-center justify-center gap-2 rounded-lg bg-orange-500 px-4 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-orange-600 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-600"
            >
              <span
                v-if="isSubmitting"
                class="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white motion-reduce:animate-[spin_1.4s_linear_infinite]"
                aria-hidden="true"
              />
              {{ isSubmitting ? "Signing in…" : "Sign in" }}
            </button>
          </form>
        </div>

        <p class="relative mt-8 text-center text-sm text-stone-900/55">
          &copy; {{ new Date().getFullYear() }} Gladex Travel and Tours Corp. All rights reserved.
        </p>
      </div>
    </div>
  </main>
</template>