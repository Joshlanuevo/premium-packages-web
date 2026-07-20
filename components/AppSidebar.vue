<script setup lang="ts">
interface NavItem {
  label: string;
  path: string;
  built: boolean;
}

defineProps<{ isOpen: boolean }>();
const emit = defineEmits<{ (e: "close"): void }>();

const route = useRoute();
const auth = useAuthStore();

const canManage = computed(() => canManagePackages(auth.user?.role));

const mainItems: NavItem[] = [
  { label: "Home", path: "/", built: true },
  { label: "Reservations", path: "/reservations", built: false },
  { label: "Bookings", path: "/bookings", built: false },
  { label: "Transactions", path: "/transactions", built: false },
  { label: "Summary", path: "/summary", built: false },
];

const adminItems: NavItem[] = [
  { label: "Availability Report", path: "/availability-report", built: false },
  { label: "Create Package", path: "/packages/create", built: false },
  { label: "Master File", path: "/master-file", built: false },
  { label: "Settings", path: "/settings", built: false },
  { label: "Vouchers", path: "/vouchers", built: false },
];

function isActive(path: string) {
  return route.path === path;
}
</script>

<template>
  <!-- Backdrop only on small screens — on md+ the sidebar pushes content
       over via margin instead of overlaying it, so no dimming needed there. -->
  <div v-if="isOpen" class="fixed inset-0 bg-black/30 z-40 md:hidden" @click="emit('close')" />

  <aside
    class="fixed inset-y-0 left-0 z-50 w-60 flex-shrink-0 bg-white border-r border-stone-200 flex flex-col transition-transform duration-200"
    :class="isOpen ? 'translate-x-0' : '-translate-x-full'"
  >
    <div class="h-16 flex items-center gap-2.5 px-5 border-b border-stone-200">
      <img src="/images/gladex-logo.jpg" alt="Gladex" class="h-8 w-auto" />
      <span class="font-semibold text-stone-800 text-sm">Premium Packages</span>
    </div>

    <nav class="flex-1 overflow-y-auto px-3 py-4 space-y-1">
      <template v-for="item in mainItems" :key="item.path">
        <NuxtLink
          v-if="item.built"
          :to="item.path"
          class="block rounded-lg px-3 py-2.5 text-sm font-medium transition-colors"
          :class="isActive(item.path) ? 'bg-orange-50 text-orange-600' : 'text-stone-600 hover:bg-stone-50'"
          @click="emit('close')"
        >
          {{ item.label }}
        </NuxtLink>
        <div v-else class="flex items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-stone-400 cursor-not-allowed">
          <span>{{ item.label }}</span>
          <span class="text-[9px] font-semibold uppercase tracking-wide bg-stone-100 text-stone-400 px-1.5 py-0.5 rounded">Soon</span>
        </div>
      </template>

      <div v-if="canManage" class="pt-4 mt-2 border-t border-stone-100">
        <p class="px-3 pb-2 text-[10px] font-semibold uppercase tracking-wide text-stone-400">Admin Tools</p>
        <template v-for="item in adminItems" :key="item.path">
          <NuxtLink
            v-if="item.built"
            :to="item.path"
            class="block rounded-lg px-3 py-2.5 text-sm font-medium transition-colors"
            :class="isActive(item.path) ? 'bg-orange-50 text-orange-600' : 'text-stone-600 hover:bg-stone-50'"
            @click="emit('close')"
          >
            {{ item.label }}
          </NuxtLink>
          <div v-else class="flex items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-stone-400 cursor-not-allowed">
            <span>{{ item.label }}</span>
            <span class="text-[9px] font-semibold uppercase tracking-wide bg-stone-100 text-stone-400 px-1.5 py-0.5 rounded">Soon</span>
          </div>
        </template>
      </div>
    </nav>
  </aside>
</template>