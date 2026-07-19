<script setup lang="ts">
const props = defineProps<{ package: Record<string, unknown> }>();

const pkg = computed(() => props.package);
const title = computed(() => (pkg.value.title as string) ?? "Untitled Package");
const image = computed(() => pkg.value.image as string | undefined);
const description = computed(() => (pkg.value.description as string) ?? "");
const location = computed(() => (pkg.value.location as string) ?? "");
const duration = computed(() => pkg.value.duration as number | undefined);
const cost = computed(() => pkg.value.cost as number | undefined);

const formattedCost = computed(() =>
  cost.value != null ? new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(cost.value) : null
);

function truncate(text: string, max = 120) {
  return text.length > max ? `${text.slice(0, max).trimEnd()}…` : text;
}
</script>

<template>
  <div class="rounded-xl border border-stone-200 bg-white overflow-hidden hover:shadow-md transition-shadow">
    <div v-if="image" class="h-40 w-full overflow-hidden bg-stone-100">
      <img :src="image" :alt="title" class="h-full w-full object-cover" />
    </div>
    <div v-else class="h-40 w-full flex items-center justify-center bg-stone-100 text-stone-400 text-sm">
      No Image
    </div>

    <div class="p-4 flex flex-col gap-2">
      <h3 class="text-base font-bold text-stone-900 line-clamp-2">{{ title }}</h3>
      <p v-if="description" class="text-sm text-stone-500 line-clamp-2">{{ truncate(description) }}</p>

      <div class="flex items-center gap-3 text-xs text-stone-500 mt-1">
        <span v-if="location">📍 {{ location }}</span>
        <span v-if="duration">🗓️ {{ duration }}D{{ duration > 1 ? `/${duration - 1}N` : "" }}</span>
      </div>

      <div class="flex items-center justify-between mt-2">
        <span v-if="formattedCost" class="text-lg font-bold text-orange-600">{{ formattedCost }}</span>
        <button class="rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600">
          View Package
        </button>
      </div>
    </div>
  </div>
</template>