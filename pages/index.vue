<script setup lang="ts">
// Premium Packages' equivalent of LakbayHub's holiday-packages-home, trimmed
// down: no Meilisearch/agency/whitelabel multi-tenant logic, since Gladex is
// a single-tenant deployment. Filtering happens server-side in
// premium-packages-api instead of via a browser-side Meilisearch key.

interface Category {
  category_id: string;
  name: string;
}
interface ListResponse {
  status: boolean;
  data?: { items: Record<string, unknown>[]; nextCursor: string | null };
}
interface CategoriesResponse {
  status: boolean;
  data?: Category[];
}

// TODO: replace with a real global auth middleware once one exists — this is
// a stopgap so the page isn't reachable without a token.
definePageMeta({
  middleware: [
    () => {
      const auth = useAuthStore();
      if (!auth.token) return navigateTo("/login");
    },
  ],
});

const { request } = useApi();
const auth = useAuthStore();
const router = useRouter();

const categories = ref<Category[]>([]);
const activeCategory = ref<string | null>(null);
const searchQuery = ref("");

const items = ref<Record<string, unknown>[]>([]);
const nextCursor = ref<string | null>(null);
const isLoading = ref(false);
const isLoadingMore = ref(false);

let searchDebounce: ReturnType<typeof setTimeout> | undefined;
let isInitializing = true;

async function fetchCategories() {
  const result = await request<CategoriesResponse>("/packages/categories");
  categories.value = result.data ?? [];
  if (categories.value.length && !activeCategory.value) {
    activeCategory.value = categories.value[0].category_id;
  }
}

function buildQuery(cursor?: string) {
  const params = new URLSearchParams();
  if (activeCategory.value) params.set("category", activeCategory.value);
  if (searchQuery.value) params.set("search", searchQuery.value);
  if (cursor) params.set("cursor", cursor);
  return params.toString();
}

async function fetchPackages(reset = true) {
  if (reset) {
    isLoading.value = true;
    items.value = [];
    nextCursor.value = null;
  } else {
    isLoadingMore.value = true;
  }

  try {
    const query = buildQuery(reset ? undefined : nextCursor.value ?? undefined);
    const result = await request<ListResponse>(`/packages?${query}`);
    const data = result.data;
    items.value = reset ? data?.items ?? [] : [...items.value, ...(data?.items ?? [])];
    nextCursor.value = data?.nextCursor ?? null;
  } finally {
    isLoading.value = false;
    isLoadingMore.value = false;
  }
}

function onSearchInput() {
  clearTimeout(searchDebounce);
  searchDebounce = setTimeout(() => fetchPackages(true), 500);
}

function logout() {
  auth.clear();
  router.push("/login");
}

// TODO: wire to real destinations once they exist — reservation flow is the
// next ClickUp subtask; edit/report/flyers pages aren't built yet.
function onReserve(id: string) {
  router.push(`/reserve/${id}`);
}
function onEdit(id: string) {
  console.log("edit", id);
}
function onDelete(id: string) {
  console.log("delete", id);
}
function onGenerateReport(id: string) {
  console.log("generate-report", id);
}
function onViewFlyers(id: string) {
  console.log("view-flyers", id);
}

watch(activeCategory, () => {
  if (isInitializing) return;
  fetchPackages(true);
});

onMounted(async () => {
  await fetchCategories();
  await fetchPackages(true);
  isInitializing = false;
});
</script>

<template>
  <div>
    <div class="bg-white border-b border-stone-200 px-6 py-4">
      <div class="max-w-7xl mx-auto">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Search premium packages…"
          class="w-full max-w-md rounded-lg border border-stone-200 px-3.5 py-2.5 text-sm focus:border-orange-400 focus:outline-none focus:ring-4 focus:ring-orange-400/15"
          @input="onSearchInput"
        />
      </div>
      <div class="max-w-7xl mx-auto mt-4 flex gap-2 overflow-x-auto pb-1">
        <button
          v-for="cat in categories"
          :key="cat.category_id"
          class="whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition-colors"
          :class="activeCategory === cat.category_id ? 'bg-orange-500 text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'"
          @click="activeCategory = cat.category_id"
        >
          {{ cat.name }}
        </button>
      </div>
    </div>
    <div class="max-w-7xl mx-auto px-6 py-6">
      <!-- Results -->
      <section>
        <div v-if="isLoading" class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          <div v-for="i in 6" :key="i" class="h-[380px] rounded-xl bg-stone-200 animate-pulse" />
        </div>

        <div v-else-if="items.length === 0" class="flex flex-col items-center justify-center py-24 text-stone-400">
          <p class="text-lg">No packages found.</p>
        </div>

        <div v-else class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          <PremiumPackageCard
            v-for="pkg in items"
            :key="pkg.id as string"
            :package="pkg"
            @reserve="onReserve"
            @edit="onEdit"
            @delete="onDelete"
            @generate-report="onGenerateReport"
            @view-flyers="onViewFlyers"
          />
        </div>

        <div v-if="nextCursor" class="flex justify-center mt-8">
          <button
            :disabled="isLoadingMore"
            class="rounded-lg bg-orange-500 px-6 py-3 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-70"
            @click="fetchPackages(false)"
          >
            {{ isLoadingMore ? "Loading…" : "Show More" }}
          </button>
        </div>
      </section>
    </div>
  </div>
</template>