<script setup lang="ts">
useHead({
  link: [{ rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" }],
});

const auth = useAuthStore();
const router = useRouter();
const isSidebarOpen = ref(true);
const { displayName, displayRole } = useCurrentUser();

function logout() {
  auth.clear();
  router.push("/login");
}
</script>

<template>
  <div class="min-h-screen bg-stone-50" style="font-family: 'Inter', system-ui, sans-serif">
    <AppSidebar :is-open="isSidebarOpen" @close="isSidebarOpen = false" />

    <div class="flex flex-col min-h-screen transition-[margin] duration-200" :class="isSidebarOpen ? 'md:ml-60' : 'md:ml-0'">
      <header class="h-16 bg-white border-b border-stone-200 px-4 md:px-6 flex items-center justify-between gap-4">
        <button
          class="w-9 h-9 flex items-center justify-center rounded-lg border border-stone-200 hover:bg-stone-50"
          @click="isSidebarOpen = !isSidebarOpen"
        >
          ☰
        </button>
        <div class="flex-1" />
        <div class="flex items-center gap-3">
          <div class="text-right leading-tight">
            <p class="text-sm font-semibold text-stone-800">{{ displayName }}</p>
            <p class="text-xs text-stone-400">{{ displayRole }}</p>
          </div>
          <button
            class="rounded-lg border border-stone-200 px-3.5 py-2 text-sm font-semibold text-stone-700 hover:bg-stone-50"
            @click="logout"
          >
            Logout
          </button>
        </div>
      </header>

      <main class="flex-1 overflow-y-auto">
        <slot />
      </main>
    </div>
  </div>
</template>