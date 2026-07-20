<script setup lang="ts">
interface AllowedActions {
  edit: boolean;
  generateReport: boolean;
  viewFlyers: boolean;
  delete: boolean;
  reserveSlot: boolean;
}

const props = defineProps<{ package: Record<string, unknown> }>();
const emit = defineEmits<{
  (e: "edit", id: string): void;
  (e: "delete", id: string): void;
  (e: "generate-report", id: string): void;
  (e: "view-flyers", id: string): void;
  (e: "reserve", id: string): void;
}>();

const pkg = computed(() => props.package);
const id = computed(() => pkg.value.id as string);
const title = computed(() => (pkg.value.title as string) ?? "Untitled Package");
const image = computed(() => pkg.value.image as string | undefined);
const description = computed(() => (pkg.value.description as string) ?? "");
const location = computed(() => (pkg.value.location as string) ?? "");
const duration = computed(() => pkg.value.duration as number | undefined);
const cost = computed(() => pkg.value.cost as number | undefined);

// Comes from the API's computeAllowedActions — server-decided per the
// requesting user's role. Defaults to the most restrictive set (Reserve Slot
// only) if it's ever missing, rather than silently showing management
// actions to someone who shouldn't have them.
const allowedActions = computed<AllowedActions>(
  () =>
    (pkg.value.allowedActions as AllowedActions) ?? {
      edit: false,
      generateReport: false,
      viewFlyers: false,
      delete: false,
      reserveSlot: true,
    }
);

const formattedCost = computed(() =>
  cost.value != null ? new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(cost.value) : null
);

function truncate(text: string, max = 120) {
  return text.length > max ? `${text.slice(0, max).trimEnd()}…` : text;
}
</script>

<template>
  <div class="rounded-xl border border-stone-200 bg-white overflow-hidden hover:shadow-md transition-shadow flex flex-col">
    <div v-if="image" class="h-40 w-full overflow-hidden bg-stone-100">
      <img :src="image" :alt="title" class="h-full w-full object-cover" />
    </div>
    <div v-else class="h-40 w-full flex items-center justify-center bg-stone-100 text-stone-400 text-sm">
      No Image
    </div>

    <div class="p-4 flex flex-col gap-2 flex-1">
      <h3 class="text-base font-bold text-stone-900 line-clamp-2">{{ title }}</h3>
      <p v-if="description" class="text-sm text-stone-500 line-clamp-2">{{ truncate(description) }}</p>

      <div class="flex items-center gap-3 text-xs text-stone-500 mt-1">
        <span v-if="location">📍 {{ location }}</span>
        <span v-if="duration">🗓️ {{ duration }}D{{ duration > 1 ? `/${duration - 1}N` : "" }}</span>
      </div>

      <span v-if="formattedCost" class="text-lg font-bold text-orange-600 mt-2">{{ formattedCost }}</span>

      <!-- Gated by server-computed allowedActions, not a client-side role guess -->
      <div class="mt-auto pt-3 flex flex-wrap gap-2">
        <button
          v-if="allowedActions.edit"
          class="rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700"
          @click="emit('edit', id)"
        >
          Edit
        </button>
        <button
          v-if="allowedActions.generateReport"
          class="rounded-lg bg-stone-700 px-3 py-2 text-xs font-semibold text-white hover:bg-stone-800"
          @click="emit('generate-report', id)"
        >
          Generate Report
        </button>
        <button
          v-if="allowedActions.viewFlyers"
          class="rounded-lg bg-yellow-500 px-3 py-2 text-xs font-semibold text-white hover:bg-yellow-600"
          @click="emit('view-flyers', id)"
        >
          View Flyers
        </button>
        <button
          v-if="allowedActions.delete"
          class="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-100"
          @click="emit('delete', id)"
        >
          Delete
        </button>
        <button
          v-if="allowedActions.reserveSlot"
          class="ml-auto rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600"
          @click="emit('reserve', id)"
        >
          Reserve Slot
        </button>
      </div>
    </div>
  </div>
</template>