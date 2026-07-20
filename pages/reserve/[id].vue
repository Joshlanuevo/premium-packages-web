<script setup lang="ts">
import {
  getEffectivePrice,
  getEffectiveSeasonLabel,
  computeBookingCost,
  computeTotalPax,
  computeDownPayment,
  toMMDDYYYY,
  type PackageVariation,
  type TravellerType,
  type RoomInput,
} from "~/composables/usePackagePricing";
import { useSoaData } from "~/composables/soa/useSoaData";
import { useSoaTravellers } from "~/composables/soa/useSoaTravellers";
import { useSoaPayments } from "~/composables/soa/useSoaPayments";
import { useSoaPost } from "~/composables/soa/useSoaPost";

interface Blocking {
  id: string;
  variation_id: string;
  group_name: string;
  start_date: string;
  end_date: string;
  availability: number;
  booked_count: number;
  status?: number;
  hidden?: boolean;
}
interface PackageDetail {
  id: string;
  title: string;
  currency?: string;
  hotel?: string;
  area?: string;
  variations: PackageVariation[];
  installment_terms?: { cycle_count: number; end_before: number; down_payment?: { type: "fixed" | "percentage"; value: number } };
  reservation_terms?: { due_date?: string };
  availability?: { blockings: Blocking[] };
}
interface PackageResponse { status: boolean; data?: PackageDetail }
interface BookingResponse { status: boolean; data?: { confirmation_number: string; submission_id: string } }
interface LeadGuest { firstName: string; lastName: string; email: string; phoneNumber: string; facebook: string; source: string }

definePageMeta({
  middleware: [
    () => {
      const auth = useAuthStore();
      if (!auth.isAuthenticated) return navigateTo("/login");
    },
  ],
});

const route = useRoute();
const router = useRouter();
const { request } = useApi();
const { emailConfirmedSoa, downloadConfirmedSoa } = useSoaPost();

const pkg = ref<PackageDetail | null>(null);
const isLoading = ref(true);
const isSubmitting = ref(false);
const error = ref<string | null>(null);
const step = ref<1 | 2>(1);
const confirmationNumber = ref<string | null>(null);

const selectableBlockings = computed<Blocking[]>(() => {
  if (!pkg.value?.availability?.blockings) return [];
  const now = new Date();
  return pkg.value.availability.blockings.filter((b) => !b.hidden && new Date(b.end_date) >= now && (b.availability ?? 0) > 0);
});

const selectedBlockingId = ref<string | null>(null);
const selectedBlocking = computed(() => selectableBlockings.value.find((b) => b.id === selectedBlockingId.value) ?? null);
const selectedVariation = computed<PackageVariation | null>(() => {
  if (!pkg.value || !selectedBlocking.value) return null;
  return pkg.value.variations.find((v) => v.id === selectedBlocking.value!.variation_id) ?? null;
});
const travelDate = computed(() => selectedBlocking.value?.start_date ?? null);

function newRoom(): RoomInput {
  return { traveller_types: {} };
}
const rooms = ref<RoomInput[]>([newRoom()]);

function qtyOf(room: RoomInput, tt: TravellerType) {
  return room.traveller_types[tt.id] || 0;
}
const totalPax = computed(() => computeTotalPax(rooms.value));

function canIncrement(room: RoomInput, tt: TravellerType) {
  const qty = qtyOf(room, tt);
  if (tt.max_pax != null && qty >= tt.max_pax) return false;
  if (selectedBlocking.value && totalPax.value >= selectedBlocking.value.availability) return false;
  return true;
}
function increment(room: RoomInput, tt: TravellerType) {
  if (!canIncrement(room, tt)) return;
  room.traveller_types[tt.id] = qtyOf(room, tt) + 1;
}
function decrement(room: RoomInput, tt: TravellerType) {
  if (qtyOf(room, tt) <= 0) return;
  room.traveller_types[tt.id] = qtyOf(room, tt) - 1;
}

// Matches the substance of legacy's hasAdult gate — any selected traveller
// type whose title mentions "adult".
const hasAdult = computed(() => {
  if (!selectedVariation.value) return false;
  return rooms.value.some((room) =>
    selectedVariation.value!.traveller_types.some((tt) => qtyOf(room, tt) > 0 && tt.title.toLowerCase().includes("adult"))
  );
});

const totalCost = computed(() => {
  if (!selectedVariation.value || !travelDate.value) return 0;
  return computeBookingCost(rooms.value, selectedVariation.value, travelDate.value);
});

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-PH", { style: "currency", currency: pkg.value?.currency ?? "PHP" }).format(amount);
}

function seatsAvailable(blocking: Blocking): number {
  if (selectedBlockingId.value === blocking.id) {
    return Math.max(blocking.availability - totalPax.value, 0);
  }
  return blocking.availability;
}

const canInstallment = computed(() => (pkg.value?.installment_terms?.cycle_count ?? 1) > 1);
const paymentMethod = ref<"full" | "installment">("full");
const downPaymentAmount = ref(0);
const finalDueDate = ref<string>("");

watch([totalCost, () => pkg.value], () => {
  if (!pkg.value?.installment_terms) return;
  downPaymentAmount.value = computeDownPayment(pkg.value.installment_terms.down_payment, totalCost.value);
  if (travelDate.value && !finalDueDate.value) {
    const d = new Date(travelDate.value);
    d.setDate(d.getDate() - (pkg.value.installment_terms.end_before ?? 0));
    finalDueDate.value = d.toISOString().slice(0, 10);
  }
});

watch(selectedVariation, (variation) => {
  if (!variation) return;
  const firstType = variation.traveller_types[0];
  rooms.value = [
    { traveller_types: firstType ? { [firstType.id]: firstType.min_pax ?? 0 } : {} },
  ];
});

const leadGuest = ref<LeadGuest>({ firstName: "", lastName: "", email: "", phoneNumber: "", facebook: "", source: "" });
const isLeadGuestValid = ref(false);

async function fetchPackage() {
  isLoading.value = true;
  try {
    const result = await request<PackageResponse>(`/packages/${route.params.id}`);
    pkg.value = result.data ?? null;
  } finally {
    isLoading.value = false;
  }
}

const canProceedToPayment = computed(() => !!selectedBlocking.value && totalPax.value > 0 && hasAdult.value && isLeadGuestValid.value);

function goToPayment() {
  if (!canProceedToPayment.value) return;
  step.value = 2;
}
function backToDetails() {
  step.value = 1;
}

// Pre-booking SOA estimate — the REAL, authoritative SOA is only generated
// server-side (POST /soa/generate) once a confirmation number exists, since
// it's fetched from the holiday_package_submissions doc created at booking
// time. This is a clearly-labeled preview from the data currently being edited.
const soaHeader = computed(() =>
  useSoaData(
    {
      packageTitle: pkg.value?.title ?? "",
      leadGuest: leadGuest.value,
      travelDateStart: travelDate.value,
      travelDateEnd: selectedBlocking.value?.end_date ?? null,
      hotelInfo: pkg.value?.hotel,
      area: pkg.value?.area,
      confirmationNumber: confirmationNumber.value,
    },
    totalPax.value
  )
);

const soaTravellers = computed(() =>
  selectedVariation.value && travelDate.value
    ? useSoaTravellers(rooms.value, selectedVariation.value, travelDate.value)
    : { lines: [], total: 0 }
);

const soaPayment = computed(() =>
  useSoaPayments({
    isFullPayment: paymentMethod.value === "full",
    totalAmount: totalCost.value,
    totalPax: totalPax.value,
    downPaymentAmount: downPaymentAmount.value,
    cycleCount: pkg.value?.installment_terms?.cycle_count ?? 2,
    downPaymentDueDate: pkg.value?.reservation_terms?.due_date ?? new Date().toISOString(),
    finalDueDate: finalDueDate.value || travelDate.value || new Date().toISOString(),
  })
);

const canSubmit = computed(() => canProceedToPayment.value && (paymentMethod.value === "full" || !!finalDueDate.value));

async function submit() {
  if (!pkg.value || !selectedBlocking.value || !selectedVariation.value) return;
  error.value = null;
  isSubmitting.value = true;

  const currency = pkg.value.currency ?? "PHP";
  const isUsd = currency.toUpperCase() === "USD";

  const payload = {
    package_id: pkg.value.id,
    variation_id: selectedVariation.value.id,
    variation_ids: [selectedBlocking.value.variation_id],
    pax: totalPax.value,
    travel_date: travelDate.value,
    currency,
    totalPhp: isUsd ? 0 : totalCost.value,
    totalUsd: isUsd ? totalCost.value : 0,
    isFullpayment: paymentMethod.value === "full",
    ...(paymentMethod.value === "installment"
      ? {
          installment_details: {
            down_payment_amount: downPaymentAmount.value,
            cycle_count: pkg.value.installment_terms?.cycle_count ?? 2,
            due_date: finalDueDate.value,
            currency: currency.toLowerCase(),
          },
        }
      : {}),
    reservation_terms: { due_date: toMMDDYYYY(pkg.value.reservation_terms?.due_date) },
    lead_guest: leadGuest.value,
    rooms: rooms.value.map((r) => ({ traveller_types: r.traveller_types })),
  };

  try {
    const result = await request<BookingResponse>("/bookings", { method: "POST", body: payload });
    confirmationNumber.value = result.data?.confirmation_number ?? null;

    if (confirmationNumber.value) {
      // Client SOA (no commission) to the lead guest, B2B SOA to internal
      // ops — matches legacy's dual-SOA split. Neither failure should block
      // the redirect since the booking itself already succeeded.
      try {
        await emailConfirmedSoa(confirmationNumber.value, [leadGuest.value.email], true);
      } catch (emailErr) {
        console.error("Failed to email client SOA:", emailErr);
      }
      try {
        await emailConfirmedSoa(confirmationNumber.value, ["support@lakbayhub.com"], false);
      } catch (emailErr) {
        console.error("Failed to email internal SOA copy:", emailErr);
      }
      await downloadConfirmedSoa(confirmationNumber.value, true).catch(() => {});
    }

    router.push({ path: "/", query: { booked: confirmationNumber.value ?? undefined } });
  } catch (err) {
    const fetchError = err as { data?: { error?: string }; message?: string };
    error.value = fetchError?.data?.error || fetchError?.message || "Booking failed. Please try again.";
  } finally {
    isSubmitting.value = false;
  }
}

onMounted(fetchPackage);
</script>

<template>
  <main class="min-h-screen bg-stone-50 font-sans text-stone-900" style="font-family: 'Inter', system-ui, sans-serif">
    <header class="bg-white border-b border-stone-200 px-6 py-4">
      <div class="max-w-6xl mx-auto flex items-center justify-between gap-4">
        <button class="flex items-center gap-2 text-sm font-semibold text-stone-600 hover:text-stone-800" @click="router.push('/')">
          ← Home
        </button>
        <h1 class="text-lg font-semibold">Package Reservation</h1>
        <span class="text-sm font-semibold text-stone-500 truncate max-w-xs">{{ pkg?.title ?? "Loading…" }}</span>
      </div>

      <div class="max-w-6xl mx-auto mt-4 flex items-center justify-center gap-8">
        <div v-for="s in [{ id: 1, title: 'Reservation' }, { id: 2, title: 'Statement of Account' }]" :key="s.id" class="flex items-center" :class="{ 'opacity-50': step < s.id }">
          <div class="w-8 h-8 rounded-full border-2 flex items-center justify-center text-sm font-medium" :class="step >= s.id ? 'bg-orange-500 border-orange-500 text-white' : 'border-stone-300 text-stone-500'">
            {{ s.id }}
          </div>
          <span class="ml-2 text-sm font-medium" :class="step >= s.id ? 'text-orange-600' : 'text-stone-500'">{{ s.title }}</span>
        </div>
      </div>
    </header>

    <div class="max-w-6xl mx-auto px-6 py-8">
      <div v-if="isLoading" class="text-stone-400">Loading package…</div>
      <div v-else-if="!pkg" class="text-stone-400">Package not found.</div>

      <div v-else class="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div class="lg:col-span-2 space-y-6">
          <template v-if="step === 1">
            <GuestDetailsForm v-model="leadGuest" @validation-change="isLeadGuestValid = $event" />

            <section class="rounded-xl border border-stone-200 bg-white p-5">
              <h2 class="text-sm font-semibold text-stone-800 mb-3">Select a Travel Date</h2>
              <div v-if="selectableBlockings.length === 0" class="text-sm text-stone-400">No availability found.</div>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                    v-for="blocking in selectableBlockings" :key="blocking.id"
                        class="text-left rounded-lg border px-4 py-3 text-sm transition-colors"
                        :class="selectedBlockingId === blocking.id ? 'border-orange-500 bg-orange-50' : 'border-stone-200 hover:bg-stone-50'"
                        @click="selectedBlockingId = blocking.id"
                >
                    <div class="font-semibold">{{ blocking.group_name }}</div>
                    <div class="text-stone-500">{{ new Date(blocking.start_date).toLocaleDateString() }} – {{ new Date(blocking.end_date).toLocaleDateString() }}</div>
                    <div class="text-xs text-green-700 font-semibold mt-1">{{ seatsAvailable(blocking) }} seats available</div>
                </button>
              </div>
            </section>

            <section v-if="selectedVariation" class="rounded-xl border border-stone-200 bg-white p-5">
            <h2 class="text-sm font-semibold text-stone-800 mb-3">Travellers ({{ selectedVariation.title }})</h2>

            <div v-for="(room, index) in rooms" :key="index" class="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                <div v-for="tt in selectedVariation.traveller_types" :key="tt.id" class="rounded-lg border border-stone-100 p-3">
                <div class="text-sm font-semibold">{{ tt.title }}</div>
                <div class="text-xs text-stone-400 mb-1">{{ tt.description }}</div>

                <details v-if="tt.is_tiered_pricing && tt.pricing_tiers?.length" class="mb-1">
                    <summary class="text-[10px] font-semibold text-green-700 cursor-pointer">Group Discounts ▾</summary>
                    <div class="mt-1 space-y-0.5 text-[10px] text-stone-500">
                    <div v-for="(tier, i) in tt.pricing_tiers" :key="tier.min" class="flex justify-between">
                        <span>{{ tier.min }}{{ tt.pricing_tiers[i + 1] ? "–" + (tt.pricing_tiers[i + 1].min - 1) : "+" }} pax</span>
                        <span>{{ formatCurrency(tier.price) }}/pax</span>
                    </div>
                    </div>
                </details>

                <div class="flex items-center justify-between mt-2">
                    <div class="flex items-center gap-2">
                    <button class="w-7 h-7 rounded border border-stone-200 hover:bg-stone-50 disabled:opacity-40" :disabled="qtyOf(room, tt) <= 0" @click="decrement(room, tt)">−</button>
                    <span class="w-6 text-center text-sm">{{ qtyOf(room, tt) }}</span>
                    <button class="w-7 h-7 rounded border border-stone-200 hover:bg-stone-50 disabled:opacity-40" :disabled="!canIncrement(room, tt)" @click="increment(room, tt)">+</button>
                    </div>
                    <div class="text-right">
                    <div class="text-xs font-semibold text-orange-600">
                        {{ travelDate ? formatCurrency(getEffectivePrice(tt, qtyOf(room, tt) || 1, travelDate)) : "—" }}/pax
                    </div>
                    <div v-if="travelDate && getEffectiveSeasonLabel(tt, travelDate)" class="text-[10px] text-stone-400">
                        {{ getEffectiveSeasonLabel(tt, travelDate) }}
                    </div>
                    </div>
                </div>
                <div class="text-[10px] text-stone-400 italic mt-1">Min: {{ tt.min_pax }} | Max: {{ tt.max_pax }}</div>
                </div>
            </div>

            <div class="flex justify-between text-sm font-semibold pt-2 border-t border-stone-100">
                <span>{{ totalPax }} traveller(s)</span>
                <span class="text-orange-600">{{ formatCurrency(totalCost) }}</span>
            </div>
            </section>

            <p v-if="selectedVariation && !hasAdult" class="rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-700">
              At least one adult is required for this booking.
            </p>
          </template>

          <template v-else>
            <button class="flex items-center gap-1.5 text-sm font-semibold text-stone-500 hover:text-stone-700" @click="backToDetails">← Back to Details</button>

            <section class="rounded-xl border border-stone-200 bg-white p-5">
              <h2 class="text-sm font-semibold text-stone-800 mb-3">Payment</h2>
              <div class="flex gap-2 mb-3">
                <button
                  class="flex-1 rounded-lg border px-4 py-2.5 text-sm font-semibold"
                  :class="paymentMethod === 'full' ? 'border-orange-500 bg-orange-50' : 'border-stone-200'"
                  @click="paymentMethod = 'full'"
                >
                  Full Payment
                </button>
                <button
                  v-if="canInstallment"
                  class="flex-1 rounded-lg border px-4 py-2.5 text-sm font-semibold"
                  :class="paymentMethod === 'installment' ? 'border-orange-500 bg-orange-50' : 'border-stone-200'"
                  @click="paymentMethod = 'installment'"
                >
                  Installment Plan
                </button>
              </div>

              <div v-if="paymentMethod === 'installment'" class="space-y-3">
                <div class="flex flex-col gap-1.5">
                  <label class="text-xs font-semibold text-stone-600">Down Payment</label>
                  <input v-model.number="downPaymentAmount" type="number" class="rounded-lg border border-stone-200 px-3 py-2 text-sm" />
                </div>
                <div class="flex flex-col gap-1.5">
                  <label class="text-xs font-semibold text-stone-600">Final Due Date</label>
                  <input v-model="finalDueDate" type="date" class="rounded-lg border border-stone-200 px-3 py-2 text-sm" />
                </div>
                <p class="text-xs text-stone-400">{{ pkg.installment_terms?.cycle_count }} payments total.</p>
              </div>
            </section>

            <SOADocument :header="soaHeader" :traveller-lines="soaTravellers.lines" :traveller-total="soaTravellers.total" :payment="soaPayment" />

            <p v-if="error" class="rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-700">{{ error }}</p>
          </template>
        </div>

        <aside class="lg:col-span-1">
          <div class="rounded-xl border border-stone-200 bg-white p-5 sticky top-6 space-y-4">
            <h3 class="text-sm font-semibold text-stone-800">Package Summary</h3>
            <div class="text-sm flex justify-between"><span class="text-stone-500">Package</span><span class="font-semibold text-right">{{ pkg?.title }}</span></div>
            <div v-if="leadGuest.firstName" class="text-sm flex justify-between"><span class="text-stone-500">Lead Guest</span><span class="font-semibold text-right">{{ leadGuest.firstName }} {{ leadGuest.lastName }}</span></div>
            <div class="text-sm flex justify-between">
              <span class="text-stone-500">Payment Method</span>
              <span class="font-semibold" :class="paymentMethod === 'full' ? 'text-green-600' : 'text-orange-600'">{{ paymentMethod === "full" ? "Full Payment" : "Installment" }}</span>
            </div>

            <div class="border-t border-stone-100 pt-4 space-y-2">
              <button v-if="step === 1" :disabled="!canProceedToPayment" class="w-full rounded-lg bg-orange-500 px-4 py-3 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-50" @click="goToPayment">
                Next: Statement of Account →
              </button>
              <button v-else :disabled="!canSubmit || isSubmitting" class="w-full rounded-lg bg-orange-500 px-4 py-3 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-50" @click="submit">
                {{ isSubmitting ? "Reserving…" : paymentMethod === "full" ? "Confirm Full Payment Booking" : "Confirm Reservation Request" }}
              </button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  </main>
</template>