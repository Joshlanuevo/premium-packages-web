<script setup lang="ts">
interface LeadGuest {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  facebook: string;
  source: string;
}

const props = defineProps<{ modelValue: LeadGuest }>();
const emit = defineEmits<{
  (e: "update:modelValue", value: LeadGuest): void;
  (e: "validation-change", isValid: boolean): void;
}>();

const guest = reactive<LeadGuest>({ ...props.modelValue });

const isValidEmail = computed(() => {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return guest.email === "" || regex.test(guest.email);
});

function formatPhoneNumber(event: Event) {
  const value = (event.target as HTMLInputElement).value;
  guest.phoneNumber = value.replace(/[^\d+\-\s]/g, "");
}

const validationErrors = computed(() => {
  const errors: string[] = [];
  if (!guest.firstName.trim()) errors.push("First name is required");
  if (!guest.lastName.trim()) errors.push("Last name is required");
  if (!guest.email.trim()) errors.push("Email address is required");
  else if (!isValidEmail.value) errors.push("Email address is invalid");
  if (!guest.phoneNumber.trim()) errors.push("Phone number is required");
  if (!guest.facebook.trim()) errors.push("Facebook link/name is required");
  if (!guest.source.trim()) errors.push("Source is required");
  return errors;
});

const isComplete = computed(() => validationErrors.value.length === 0);

watch(
  guest,
  (value) => emit("update:modelValue", { ...value }),
  { deep: true }
);
watch(isComplete, (val) => emit("validation-change", val), { immediate: true });

defineExpose({ validationErrors, isComplete });
</script>

<template>
  <section class="rounded-xl border border-stone-200 bg-white p-5">
    <h2 class="text-sm font-semibold text-stone-800 mb-4">Lead Guest Details</h2>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
      <div class="flex flex-col gap-1.5">
        <label class="text-xs font-semibold text-stone-600">First Name <span class="text-red-500">*</span></label>
        <input v-model="guest.firstName" type="text" class="rounded-lg border border-stone-200 px-3 py-2 text-sm" />
      </div>
      <div class="flex flex-col gap-1.5">
        <label class="text-xs font-semibold text-stone-600">Last Name <span class="text-red-500">*</span></label>
        <input v-model="guest.lastName" type="text" class="rounded-lg border border-stone-200 px-3 py-2 text-sm" />
      </div>
      <div class="flex flex-col gap-1.5">
        <label class="text-xs font-semibold text-stone-600">Email Address <span class="text-red-500">*</span></label>
        <input
          v-model="guest.email" type="email"
          class="rounded-lg border px-3 py-2 text-sm"
          :class="guest.email && !isValidEmail ? 'border-red-400' : 'border-stone-200'"
        />
        <p v-if="guest.email && !isValidEmail" class="text-xs text-red-600">Please enter a valid email address</p>
      </div>
      <div class="flex flex-col gap-1.5">
        <label class="text-xs font-semibold text-stone-600">Phone Number <span class="text-red-500">*</span></label>
        <input v-model="guest.phoneNumber" type="tel" class="rounded-lg border border-stone-200 px-3 py-2 text-sm" @input="formatPhoneNumber" />
      </div>
      <div class="flex flex-col gap-1.5">
        <label class="text-xs font-semibold text-stone-600">Facebook Link/Name <span class="text-red-500">*</span></label>
        <input v-model="guest.facebook" type="text" placeholder="Facebook profile link/name" class="rounded-lg border border-stone-200 px-3 py-2 text-sm" />
      </div>
      <div class="flex flex-col gap-1.5">
        <label class="text-xs font-semibold text-stone-600">Source <span class="text-red-500">*</span></label>
        <select v-model="guest.source" class="rounded-lg border border-stone-200 px-3 py-2 text-sm">
          <option value="" disabled>Select source</option>
          <option value="walk-in">Walk-in</option>
          <option value="online">Online</option>
          <option value="B2B">B2B</option>
          <option value="Inbound">Inbound</option>
          <option value="TikTok">TikTok</option>
          <option value="Instagram">Instagram</option>
          <option value="Email">Email</option>
          <option value="Whatsapp">Whatsapp</option>
          <option value="Viber">Viber</option>
        </select>
      </div>
    </div>
  </section>
</template>