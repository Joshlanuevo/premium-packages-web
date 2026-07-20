export interface SoaPaymentTerm {
  paymentNumber: number;
  type: "fullpayment" | "downpayment" | "normal";
  description: string;
  amountPerPax: number;
  totalAmount: number;
  dueDate: string;
}

export interface SoaPaymentPreview {
  isFullPayment: boolean;
  terms: SoaPaymentTerm[];
  totalAmount: number;
}

function toIsoDateOnly(date: string | Date): string {
  return new Date(date).toISOString().slice(0, 10);
}

/**
 * Preview only — the real schedule is generated server-side in
 * booking.service.ts (buildInstallmentSchedule) at confirmation time. This
 * mirrors that same distribution math (even split of remaining balance,
 * remainder to earliest terms) so the pre-booking estimate matches what the
 * backend will actually produce.
 */
export function useSoaPayments(params: {
  isFullPayment: boolean;
  totalAmount: number;
  totalPax: number;
  downPaymentAmount: number;
  cycleCount: number;
  downPaymentDueDate: string;
  finalDueDate: string;
}): SoaPaymentPreview {
  const { isFullPayment, totalAmount, totalPax, downPaymentAmount, cycleCount, downPaymentDueDate, finalDueDate } = params;

  if (isFullPayment) {
    return {
      isFullPayment: true,
      totalAmount,
      terms: [
        {
          paymentNumber: 1,
          type: "fullpayment",
          description: "Full Payment",
          amountPerPax: totalPax > 0 ? totalAmount / totalPax : 0,
          totalAmount,
          dueDate: toIsoDateOnly(finalDueDate),
        },
      ],
    };
  }

  const terms: SoaPaymentTerm[] = [
    {
      paymentNumber: 1,
      type: "downpayment",
      description: "Down Payment",
      amountPerPax: totalPax > 0 ? downPaymentAmount / totalPax : 0,
      totalAmount: downPaymentAmount,
      dueDate: toIsoDateOnly(downPaymentDueDate),
    },
  ];

  const remainingTerms = Math.max(cycleCount - 1, 1);
  const remainingBalance = Math.max(totalAmount - downPaymentAmount, 0);
  const baseAmount = Math.floor(remainingBalance / remainingTerms);
  const remainder = Math.round(remainingBalance - baseAmount * remainingTerms);

  const start = new Date(downPaymentDueDate);
  const end = new Date(finalDueDate);
  const totalDays = Math.max(Math.round((end.getTime() - start.getTime()) / 86400000), remainingTerms);
  const baseInterval = Math.floor(totalDays / remainingTerms);

  let cursor = new Date(start);
  for (let i = 1; i <= remainingTerms; i++) {
    cursor = new Date(cursor.getTime() + baseInterval * 86400000);
    if (cursor > end) cursor = new Date(end);
    const amount = baseAmount + (i <= remainder ? 1 : 0);
    terms.push({
      paymentNumber: i + 1,
      type: "normal",
      description: `Payment ${i + 1}`,
      amountPerPax: totalPax > 0 ? amount / totalPax : 0,
      totalAmount: amount,
      dueDate: toIsoDateOnly(cursor),
    });
  }

  return { isFullPayment: false, totalAmount, terms };
}