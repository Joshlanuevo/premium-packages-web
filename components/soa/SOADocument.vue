<script setup lang="ts">
import type { SoaHeaderData } from "~/composables/soa/useSoaData";
import type { SoaTravellerLine } from "~/composables/soa/useSoaTravellers";
import type { SoaPaymentPreview } from "~/composables/soa/useSoaPayments";

defineProps<{
  header: SoaHeaderData;
  travellerLines: SoaTravellerLine[];
  travellerTotal: number;
  payment: SoaPaymentPreview;
}>();

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(amount);
}
function formatDate(date: string | Date | null) {
  if (!date) return "TBA";
  return new Date(date).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}
</script>

<template>
  <div class="text-sm bg-white p-4 md:p-8 border-4 border-stone-800">
    <div class="flex justify-center mb-3">
      <img src="/images/gladex-logo.jpg" alt="Gladex" class="h-16" />
    </div>

    <div class="rounded-lg bg-blue-50 border border-blue-200 px-4 py-2.5 mb-3 text-xs text-blue-700">
      This is an estimate. The official Statement of Account will be emailed to you automatically once the reservation is confirmed.
    </div>

    <div class="border-4 border-stone-800 p-4 mb-3 flex justify-between">
      <div>
        <span class="block">ESTIMATED STATEMENT OF ACCOUNT FOR</span>
        <span class="block font-semibold text-lg">{{ header.recipientName }}</span>
      </div>
      <div class="text-right">
        <span class="block">REFERENCE NO.</span>
        <span class="block font-semibold text-lg">{{ header.referenceNumber }}</span>
      </div>
    </div>

    <h2 class="font-semibold p-2 border-b border-stone-800">Travel Information</h2>
    <table class="w-full border-collapse border-4 border-stone-800 mb-3">
      <tbody>
        <tr class="border-b border-stone-400">
          <td class="font-semibold p-2 border border-stone-400 bg-stone-100 w-1/4">EMAIL ADDRESS</td>
          <td class="p-2 border border-stone-400 w-1/4">{{ header.email }}</td>
          <td class="font-semibold p-2 border border-stone-400 bg-stone-100 w-1/4">CONTACTS</td>
          <td class="p-2 border border-stone-400 w-1/4">{{ header.contact }}</td>
        </tr>
        <tr class="border-b border-stone-400">
          <td class="font-semibold p-2 border border-stone-400 bg-stone-100">ETA</td>
          <td class="p-2 border border-stone-400">{{ formatDate(header.estimatedArrival) }}</td>
          <td class="font-semibold p-2 border border-stone-400 bg-stone-100">ETD</td>
          <td class="p-2 border border-stone-400">{{ formatDate(header.estimatedDeparture) }}</td>
        </tr>
        <tr class="border-b border-stone-400">
          <td class="font-semibold p-2 border border-stone-400 bg-stone-100">NO. OF PAX</td>
          <td class="p-2 border border-stone-400">{{ header.totalPax }}</td>
          <td class="font-semibold p-2 border border-stone-400 bg-stone-100">BOOKING DATE</td>
          <td class="p-2 border border-stone-400">{{ formatDate(header.bookingDate) }}</td>
        </tr>
        <tr>
          <td class="font-semibold p-2 border border-stone-400 bg-stone-100">PACKAGE TITLE</td>
          <td class="p-2 border border-stone-400">{{ header.packageTitle }}</td>
          <td class="font-semibold p-2 border border-stone-400 bg-stone-100">PREPARED BY</td>
          <td class="p-2 border border-stone-400">{{ header.preparedBy }}</td>
        </tr>
      </tbody>
    </table>

    <h2 class="font-semibold p-2 border-b border-stone-800">Peso Payment</h2>
    <table class="w-full border-collapse border-4 border-stone-800 mb-3">
      <thead>
        <tr class="bg-stone-100 border-b border-stone-400">
          <th class="font-semibold p-2 border border-stone-400 text-left">PARTICULARS</th>
          <th class="font-semibold p-2 border border-stone-400 text-center">UNIT PRICE (PHP)</th>
          <th class="font-semibold p-2 border border-stone-400 text-center">NO. OF PAX</th>
          <th class="font-semibold p-2 border border-stone-400 text-center">AMOUNT (PHP)</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="line in travellerLines" :key="line.id" class="border-b border-stone-400">
          <td class="p-2 border border-stone-400">{{ line.label }}</td>
          <td class="p-2 border border-stone-400 text-center">{{ formatCurrency(line.unitPrice) }}</td>
          <td class="p-2 border border-stone-400 text-center">{{ line.quantity }}</td>
          <td class="p-2 border border-stone-400 text-center">{{ formatCurrency(line.total) }}</td>
        </tr>
        <tr class="font-semibold">
          <td colspan="3" class="p-2 border border-stone-400 text-right">TOTAL AMOUNT</td>
          <td class="p-2 border border-stone-400 bg-stone-100 text-center">{{ formatCurrency(travellerTotal) }}</td>
        </tr>
      </tbody>
    </table>

    <h2 class="font-semibold p-2 border-b border-stone-800">
      {{ payment.isFullPayment ? "Full Payment Details" : "Estimated Payment Schedule" }}
    </h2>
    <table class="w-full border-collapse border-4 border-stone-800">
      <thead>
        <tr :class="payment.isFullPayment ? 'bg-green-100' : 'bg-blue-100'">
          <th class="font-semibold p-2 border border-stone-400 text-left">PAYMENT TERM</th>
          <th class="font-semibold p-2 border border-stone-400 text-center">AMOUNT / PAX</th>
          <th class="font-semibold p-2 border border-stone-400 text-center">NO. OF PAX</th>
          <th class="font-semibold p-2 border border-stone-400 text-center">TOTAL AMOUNT</th>
          <th class="font-semibold p-2 border border-stone-400 text-center">DUE DATE</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="term in payment.terms" :key="term.paymentNumber" class="border-b border-stone-400">
          <td class="p-2 border border-stone-400">{{ term.description }}</td>
          <td class="p-2 border border-stone-400 text-center">{{ formatCurrency(term.amountPerPax) }}</td>
          <td class="p-2 border border-stone-400 text-center">{{ header.totalPax }}</td>
          <td class="p-2 border border-stone-400 text-center font-semibold">{{ formatCurrency(term.totalAmount) }}</td>
          <td class="p-2 border border-stone-400 text-center">{{ formatDate(term.dueDate) }}</td>
        </tr>
        <tr :class="payment.isFullPayment ? 'bg-green-200' : 'bg-blue-200'" class="font-bold">
          <td colspan="3" class="p-2 border border-stone-400">{{ payment.isFullPayment ? "TOTAL AMOUNT DUE" : "TOTAL ESTIMATED PAYMENT" }}</td>
          <td class="p-2 border border-stone-400 text-center">{{ formatCurrency(payment.totalAmount) }}</td>
          <td class="p-2 border border-stone-400 text-center text-xs">{{ payment.isFullPayment ? "Pay in full" : "Subject to change" }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>