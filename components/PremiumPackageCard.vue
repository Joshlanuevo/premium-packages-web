<script setup lang="ts">
interface AllowedActions {
  edit: boolean;
  generateReport: boolean;
  viewFlyers: boolean;
  delete: boolean;
  reserveSlot: boolean;
}

interface AvailabilityLog {
  changed_at: string;
  changed_by: string;
  old_value: number;
  new_value: number;
}
interface Blocking {
  id: string;
  group_name?: string;
  start_date: string;
  end_date: string;
  availability?: number;
  booked_count?: number;
  original_availability?: number;
  availability_logs?: AvailabilityLog[];
  variation_id?: string;
  hidden?: boolean;
}
interface PackageDetailResponse {
  status: boolean;
  data?: { availability?: { blockings: Blocking[] } };
}
interface AvailabilityGroup {
  key: string;
  groupName: string;
  startDate: string;
  endDate: string;
  totalAvailability: number;
  totalBooked: number;
  totalOriginal: number;
  variationIds: string[];
  blockings: Blocking[];
}
interface Submission {
  transactionId: string;
  totalPax: number;
  status: string;
}
interface SubmissionsResponse {
  status: boolean;
  data?: { totalBooked: number; submissions: Submission[] };
}

const props = defineProps<{ package: Record<string, unknown> }>();
const emit = defineEmits<{
  (e: "edit", id: string): void;
  (e: "delete", id: string): void;
  (e: "generate-report", id: string): void;
  (e: "view-flyers", id: string): void;
  (e: "reserve", id: string): void;
}>();

const { request } = useApi();

const pkg = computed(() => props.package);
const id = computed(() => pkg.value.id as string);
const title = computed(() => (pkg.value.title as string) ?? "Untitled Package");
const image = computed(() => pkg.value.image as string | undefined);
const description = computed(() => (pkg.value.description as string) ?? "");
const location = computed(() => (pkg.value.location as string) ?? "");
const duration = computed(() => pkg.value.duration as number | undefined);

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

function truncate(text: string, max = 120) {
  return text.length > max ? `${text.slice(0, max).trimEnd()}…` : text;
}

function formatDateRange(start: string, end: string) {
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  const startStr = new Date(start).toLocaleDateString("en-US", opts);
  const endStr = new Date(end).toLocaleDateString("en-US", { ...opts, year: "numeric" });
  return `${startStr} – ${endStr}`;
}
function formatDate(date: string) {
  return new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
function formatLogDate(date: string) {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: true,
  });
}

const rawBlockings = ref<Blocking[]>([]);
const isLoadingAvailability = ref(true);

async function fetchAvailability() {
  isLoadingAvailability.value = true;
  try {
    const result = await request<PackageDetailResponse>(`/packages/${id.value}`);
    const now = new Date();
    rawBlockings.value = (result.data?.availability?.blockings ?? []).filter((b) => {
      if (b.hidden) return false;
      if (!b.group_name?.trim()) return false;
      if (new Date(b.end_date) < now || new Date(b.start_date) < now) return false;
      return true;
    });
  } catch {
    rawBlockings.value = [];
  } finally {
    isLoadingAvailability.value = false;
  }
}

// requireAvailable=true -> the compact card preview (sold-out groups hidden).
// requireAvailable=false -> "View All" (sold-out groups shown, red badge) —
// matches legacy's distinction between the card's own groupedBlockings
// (available only) and the modal's modalRegularGroups (everything).
function buildGroups(blockings: Blocking[], requireAvailable: boolean): AvailabilityGroup[] {
  const groups = new Map<string, AvailabilityGroup>();
  for (const blocking of blockings) {
    const name = blocking.group_name!.trim();
    const key = `${name}|${blocking.start_date.slice(0, 10)}|${blocking.end_date.slice(0, 10)}`;
    const existing = groups.get(key);
    if (existing) {
      existing.totalAvailability += blocking.availability ?? 0;
      existing.totalBooked += blocking.booked_count ?? 0;
      existing.totalOriginal += blocking.original_availability ?? 0;
      existing.blockings.push(blocking);
      if (blocking.variation_id && !existing.variationIds.includes(blocking.variation_id)) {
        existing.variationIds.push(blocking.variation_id);
      }
    } else {
      groups.set(key, {
        key,
        groupName: name,
        startDate: blocking.start_date,
        endDate: blocking.end_date,
        totalAvailability: blocking.availability ?? 0,
        totalBooked: blocking.booked_count ?? 0,
        totalOriginal: blocking.original_availability ?? 0,
        variationIds: blocking.variation_id ? [blocking.variation_id] : [],
        blockings: [blocking],
      });
    }
  }
  const all = Array.from(groups.values());
  return requireAvailable ? all.filter((g) => g.totalAvailability > 0) : all;
}

const availabilityGroups = computed(() => buildGroups(rawBlockings.value, true));
const allAvailabilityGroups = computed(() => buildGroups(rawBlockings.value, false));

const allAvailabilityModal = ref<HTMLDialogElement | null>(null);
const submissionsModal = ref<HTMLDialogElement | null>(null);
const selectedGroup = ref<AvailabilityGroup | null>(null);
const submissions = ref<Submission[]>([]);
const isLoadingSubmissions = ref(false);

async function openSubmissionsOverview(group: AvailabilityGroup) {
  selectedGroup.value = group;
  submissions.value = [];
  submissionsModal.value?.showModal();

  if (group.variationIds.length === 0) return;

  isLoadingSubmissions.value = true;
  try {
    const idsParam = encodeURIComponent(group.variationIds.join(","));
    const result = await request<SubmissionsResponse>(`/submissions?package_id=${id.value}&variation_ids=${idsParam}`);
    submissions.value = result.data?.submissions ?? [];
  } catch {
    submissions.value = [];
  } finally {
    isLoadingSubmissions.value = false;
  }
}

function statusBadgeClass(status: string) {
  const s = status.toLowerCase();
  if (s === "confirmed") return "bg-green-100 text-green-700";
  if (s === "cancelled") return "bg-red-100 text-red-700";
  if (s === "reserved") return "bg-yellow-100 text-yellow-700";
  return "bg-stone-100 text-stone-600";
}

onMounted(fetchAvailability);
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

      <div class="mt-2 pt-2 border-t border-stone-100">
        <div class="flex items-center justify-between mb-1.5">
          <h4 class="text-xs font-semibold text-stone-600">Availability</h4>
          <button
            v-if="allAvailabilityGroups.length > 0"
            class="text-[10px] font-semibold text-blue-600 hover:underline"
            @click="allAvailabilityModal?.showModal()"
          >
            View All
          </button>
        </div>

        <div v-if="isLoadingAvailability" class="space-y-1.5">
          <div v-for="i in 2" :key="i" class="h-7 rounded-md bg-stone-200 animate-pulse" />
        </div>

        <div
          v-else-if="availabilityGroups.length > 0"
          class="space-y-1.5 max-h-[136px] overflow-y-auto pr-1"
          style="scrollbar-width: thin"
        >
          <div
            v-for="group in availabilityGroups"
            :key="group.key"
            class="flex items-center justify-between gap-2 border border-stone-200 rounded-md px-2.5 py-1.5"
          >
            <div class="min-w-0">
              <div class="text-xs font-medium text-stone-700 truncate">{{ group.groupName }}</div>
              <div class="text-[10px] text-stone-400">{{ formatDateRange(group.startDate, group.endDate) }}</div>
            </div>
            <span class="flex-shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700 whitespace-nowrap">
              {{ group.totalAvailability }} left
            </span>
          </div>
        </div>

        <p v-else class="text-xs text-stone-400 italic py-2">No availability found.</p>
      </div>

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

  <!-- All Availability modal -->
  <dialog
    ref="allAvailabilityModal"
    class="fixed inset-0 z-50 m-auto max-h-[85vh] w-[92vw] max-w-lg rounded-xl bg-white p-0 shadow-2xl backdrop:bg-black/40 backdrop:backdrop-blur-sm"
    @click="(e) => { if (e.target === allAvailabilityModal) allAvailabilityModal?.close(); }"
  >
    <div class="flex items-center justify-between px-5 py-4 border-b border-stone-200">
      <h3 class="font-bold text-base text-stone-800">All Availability</h3>
      <button
        class="w-8 h-8 flex items-center justify-center rounded-full text-stone-400 hover:text-stone-600 hover:bg-stone-100"
        @click="allAvailabilityModal?.close()"
      >
        ✕
      </button>
    </div>

    <div class="p-5 space-y-2 max-h-[55vh] overflow-y-auto">
      <div
        v-for="group in allAvailabilityGroups"
        :key="group.key"
        class="flex items-center justify-between gap-2 border border-stone-200 rounded-md p-3 hover:bg-blue-50 hover:border-blue-200 cursor-pointer transition-colors"
        @click="openSubmissionsOverview(group)"
      >
        <div class="min-w-0">
          <div class="text-sm font-semibold text-stone-800 truncate">{{ group.groupName }}</div>
          <div class="text-xs text-stone-400">{{ formatDateRange(group.startDate, group.endDate) }}</div>
        </div>
        <span
          class="flex-shrink-0 text-xs font-bold px-2.5 py-1 rounded-full whitespace-nowrap"
          :class="group.totalAvailability > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'"
        >
          {{ group.totalAvailability }} left
        </span>
      </div>
      <p v-if="allAvailabilityGroups.length === 0" class="text-sm text-stone-400 text-center py-6">No availability groups found.</p>
    </div>

    <div class="flex justify-end px-5 py-4 border-t border-stone-200">
      <button class="rounded-lg bg-stone-800 text-white px-5 py-2 text-sm font-semibold hover:bg-stone-900" @click="allAvailabilityModal?.close()">
        Close
      </button>
    </div>
  </dialog>

  <!-- Submissions Overview modal -->
  <dialog
    ref="submissionsModal"
    class="fixed inset-0 z-50 m-auto max-h-[85vh] w-[92vw] max-w-2xl rounded-xl bg-white p-0 shadow-2xl backdrop:bg-black/40 backdrop:backdrop-blur-sm"
    @click="(e) => { if (e.target === submissionsModal) submissionsModal?.close(); }"
  >
    <div class="flex items-center justify-between px-6 py-4 border-b border-stone-100 bg-stone-50">
      <div>
        <h3 class="text-base font-bold text-stone-800">Submissions Overview</h3>
        <p v-if="selectedGroup" class="text-xs text-stone-500 mt-0.5 truncate max-w-xs">{{ selectedGroup.groupName }}</p>
      </div>
      <button
        class="w-8 h-8 flex items-center justify-center rounded-full text-stone-400 hover:text-stone-600 hover:bg-stone-200"
        @click="submissionsModal?.close()"
      >
        ✕
      </button>
    </div>

    <div v-if="selectedGroup" class="p-6 space-y-5 max-h-[65vh] overflow-y-auto">
      <div class="grid grid-cols-3 gap-3">
        <div class="bg-stone-50 border border-stone-100 rounded-xl p-4 flex flex-col gap-1">
          <span class="text-xs font-medium text-stone-500 uppercase tracking-wide">Original</span>
          <span class="text-2xl font-bold text-stone-700">{{ selectedGroup.totalOriginal || "—" }}</span>
          <span class="text-xs text-stone-400">total seats</span>
        </div>
        <div class="bg-blue-50 border border-blue-100 rounded-xl p-4 flex flex-col gap-1">
          <span class="text-xs font-medium text-blue-500 uppercase tracking-wide">Total Booked</span>
          <span class="text-2xl font-bold text-blue-700">{{ selectedGroup.totalBooked }}</span>
          <span class="text-xs text-blue-400">pax</span>
        </div>
        <div class="bg-green-50 border border-green-100 rounded-xl p-4 flex flex-col gap-1">
          <span class="text-xs font-medium text-green-500 uppercase tracking-wide">Remaining</span>
          <span class="text-2xl font-bold text-green-700">{{ selectedGroup.totalAvailability }}</span>
          <span class="text-xs text-green-400">slots available</span>
        </div>
      </div>

      <div>
        <h4 class="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-2">Package Availability</h4>
        <div class="space-y-2">
          <div
            v-for="blocking in selectedGroup.blockings"
            :key="blocking.id"
            class="flex items-center justify-between bg-stone-50 border border-stone-200 rounded-lg px-4 py-3"
          >
            <div class="flex flex-col gap-0.5">
              <span class="text-sm font-semibold text-stone-800">{{ blocking.group_name }}</span>
              <span class="text-xs text-stone-400">{{ formatDate(blocking.start_date) }} – {{ formatDate(blocking.end_date) }}</span>
              <span class="text-xs text-stone-500 font-medium">Reloc ID: {{ blocking.id }}</span>
              <span v-if="blocking.original_availability" class="text-xs text-stone-400">Original: {{ blocking.original_availability }} seats</span>
            </div>
            <div class="flex items-center gap-2 flex-shrink-0">
              <span class="text-xs text-stone-500">{{ blocking.booked_count ?? 0 }} booked</span>
              <span
                class="text-xs font-bold px-2.5 py-1 rounded-full"
                :class="(blocking.availability ?? 0) > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'"
              >
                {{ blocking.availability ?? 0 }} left
              </span>
            </div>
          </div>
        </div>
      </div>

      <div v-if="submissions.length > 0 || isLoadingSubmissions">
        <h4 class="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-2">Submissions</h4>

        <div v-if="isLoadingSubmissions" class="space-y-2">
          <div v-for="i in 3" :key="i" class="h-9 rounded-lg bg-stone-100 animate-pulse" />
        </div>

        <div v-else class="rounded-xl border border-stone-200 overflow-hidden">
          <table class="w-full text-sm">
            <thead>
              <tr class="bg-stone-50 border-b border-stone-200">
                <th class="text-left px-4 py-2.5 text-xs font-semibold text-stone-500 uppercase tracking-wide">Reference No.</th>
                <th class="text-center px-4 py-2.5 text-xs font-semibold text-stone-500 uppercase tracking-wide">Pax</th>
                <th class="text-center px-4 py-2.5 text-xs font-semibold text-stone-500 uppercase tracking-wide">Status</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(sub, idx) in submissions"
                :key="sub.transactionId"
                :class="idx % 2 === 0 ? 'bg-white' : 'bg-stone-50/50'"
                class="border-b border-stone-100 last:border-0"
              >
                <td class="px-4 py-3 font-mono text-xs font-semibold text-stone-700">{{ sub.transactionId }}</td>
                <td class="px-4 py-3 text-center font-bold text-stone-800">{{ sub.totalPax }}</td>
                <td class="px-4 py-3 text-center">
                  <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize" :class="statusBadgeClass(sub.status)">
                    {{ sub.status }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      <p v-else class="text-center py-4 text-sm text-stone-400">No submissions found for this date.</p>

      <div v-for="blocking in selectedGroup.blockings" :key="`log-${blocking.id}`">
        <div v-if="blocking.availability_logs?.length">
          <h4 class="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-2">Availability Change Log — {{ blocking.id }}</h4>
          <div class="rounded-xl border border-stone-200 overflow-hidden mb-4">
            <table class="w-full text-sm">
              <thead>
                <tr class="bg-stone-50 border-b border-stone-200">
                  <th class="text-left px-4 py-2.5 text-xs font-semibold text-stone-500 uppercase tracking-wide">Date & Time</th>
                  <th class="text-center px-4 py-2.5 text-xs font-semibold text-stone-500 uppercase tracking-wide">Changed By</th>
                  <th class="text-center px-4 py-2.5 text-xs font-semibold text-stone-500 uppercase tracking-wide">Old</th>
                  <th class="text-center px-4 py-2.5 text-xs font-semibold text-stone-500 uppercase tracking-wide">New</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="(log, li) in [...blocking.availability_logs].reverse()"
                  :key="li"
                  :class="li % 2 === 0 ? 'bg-white' : 'bg-stone-50/50'"
                  class="border-b border-stone-100 last:border-0"
                >
                  <td class="px-4 py-3 text-xs text-stone-600 whitespace-nowrap">{{ formatLogDate(log.changed_at) }}</td>
                  <td class="px-4 py-3 text-center text-xs text-stone-700 font-medium">{{ log.changed_by }}</td>
                  <td class="px-4 py-3 text-center font-bold text-stone-500">{{ log.old_value }}</td>
                  <td class="px-4 py-3 text-center">
                    <span
                      class="inline-flex items-center justify-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full"
                      :class="log.new_value > log.old_value ? 'bg-green-100 text-green-700' : log.new_value < log.old_value ? 'bg-red-100 text-red-700' : 'bg-stone-100 text-stone-500'"
                    >
                      {{ log.new_value > log.old_value ? "↑" : log.new_value < log.old_value ? "↓" : "—" }} {{ log.new_value }}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>

    <div class="px-6 py-4 border-t border-stone-100 flex justify-end">
      <button class="rounded-lg bg-stone-800 text-white px-6 py-2 text-sm font-semibold hover:bg-stone-900" @click="submissionsModal?.close()">
        Close
      </button>
    </div>
  </dialog>
</template>