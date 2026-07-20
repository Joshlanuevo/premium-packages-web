// Thin client for the REAL SOA backend (premium-packages-api's
// soa.controller.ts / soaEmail.service.ts / pdfGenerator.service.ts) — this
// is the authoritative SOA generator, only usable once a confirmation
// number exists (it reads the holiday_package_submissions doc created at
// booking time).

export interface GenerateSoaResponse {
  status: boolean;
  data?: { base64: string; filename: string };
}
export interface SendSoaEmailResponse {
  status: boolean;
  message?: string;
  recipients?: string[];
}

export function useSoaPost() {
  const { request } = useApi();

  async function downloadConfirmedSoa(confirmationNumber: string, isClientSOA = true) {
    const result = await request<GenerateSoaResponse>("/soa/generate?format=base64", {
      method: "POST",
      body: { confirmation_number: confirmationNumber, isClientSOA },
    });
    if (!result.data) return;
    const blob = await (await fetch(`data:application/pdf;base64,${result.data.base64}`)).blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = result.data.filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function emailConfirmedSoa(confirmationNumber: string, to: string[], isClientSOA = true) {
    return request<SendSoaEmailResponse>("/soa/send-email", {
      method: "POST",
      body: { confirmation_number: confirmationNumber, to, isClientSOA },
    });
  }

  return { downloadConfirmedSoa, emailConfirmedSoa };
}