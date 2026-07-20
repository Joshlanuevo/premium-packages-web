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
      <!-- Title row: delete icon lives here now, not in the action buttons -->
      <div class="flex items-start justify-between gap-2">
        <h3 class="text-base font-bold text-stone-900 line-clamp-2">{{ title }}</h3>
        <button
          v-if="allowedActions.delete"
          class="flex-shrink-0 flex items-center justify-center w-9 h-9 rounded-lg border border-red-200 bg-red-50 hover:bg-red-100 transition-colors"
          aria-label="Delete Package"
          @click="emit('delete', id)"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>

      <p v-if="description" class="text-sm text-stone-500 line-clamp-2">{{ truncate(description) }}</p>

      <div class="flex items-center gap-3 text-xs text-stone-500 mt-1">
        <span v-if="location">📍 {{ location }}</span>
        <span v-if="duration">🗓️ {{ duration }}D{{ duration > 1 ? `/${duration - 1}N` : "" }}</span>
      </div>

      <span v-if="formattedCost" class="text-lg font-bold text-orange-600 mt-2">{{ formattedCost }}</span>

      <!-- 2x2 grid: each row is a flex pair, so a single surviving button in a
           row naturally takes the full width (no col-span juggling needed) -->
      <div class="mt-auto pt-3 flex flex-col gap-2">
        <div v-if="allowedActions.edit || allowedActions.reserveSlot" class="flex gap-2">
          <button
            v-if="allowedActions.edit"
            class="flex-1 rounded-lg bg-blue-600 px-3 py-2.5 text-xs font-semibold text-white hover:bg-blue-700"
            @click="emit('edit', id)"
          >
            Edit
          </button>
          <button
            v-if="allowedActions.reserveSlot"
            class="flex-1 rounded-lg bg-orange-500 px-3 py-2.5 text-xs font-semibold text-white hover:bg-orange-600"
            @click="emit('reserve', id)"
          >
            Reserve Slot
          </button>
        </div>
        <div v-if="allowedActions.generateReport || allowedActions.viewFlyers" class="flex gap-2">
          <button
            v-if="allowedActions.generateReport"
            class="flex-1 rounded-lg bg-red-600 px-3 py-2.5 text-xs font-semibold text-white hover:bg-red-700"
            @click="emit('generate-report', id)"
          >
            Generate Report
          </button>
          <button
            v-if="allowedActions.viewFlyers"
            class="flex-1 rounded-lg bg-yellow-500 px-3 py-2.5 text-xs font-semibold text-white hover:bg-yellow-600"
            @click="emit('view-flyers', id)"
          >
            View Flyers
          </button>
        </div>
      </div>
    </div>
  </div>
</template>