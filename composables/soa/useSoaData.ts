export interface SoaDataInput {
  packageTitle: string;
  leadGuest: { firstName: string; lastName: string; email: string; phoneNumber: string };
  travelDateStart: string | null;
  travelDateEnd: string | null;
  hotelInfo?: string;
  area?: string;
  confirmationNumber?: string | null;
}

export interface SoaHeaderData {
  recipientName: string;
  referenceNumber: string;
  packageTitle: string;
  estimatedArrival: string | null;
  estimatedDeparture: string | null;
  bookingDate: Date;
  totalPax: number;
  hotelInfo: string;
  area: string;
  preparedBy: string;
  email: string;
  contact: string;
}

// Plain function, not reactive itself — wrap in computed() at the call site.
export function useSoaData(input: SoaDataInput, totalPax: number): SoaHeaderData {
  const recipientName = `${input.leadGuest.firstName} ${input.leadGuest.lastName}`.trim() || "TBD";

  // Real reference number is only assigned server-side, in
  // generateConfirmationNumber() at booking time.
  const referenceNumber = input.confirmationNumber ?? "PENDING";

  return {
    recipientName,
    referenceNumber,
    packageTitle: input.packageTitle,
    estimatedArrival: input.travelDateStart,
    estimatedDeparture: input.travelDateEnd,
    bookingDate: new Date(),
    totalPax,
    hotelInfo: input.hotelInfo || "TBD",
    area: input.area || "TBD",
    // TODO(verify): JWT payload only guarantees userId/status/role/agency_id
    // — no first_name. Legacy shows the booking staff's name here. Flag if
    // this needs adding to the token or a user-profile lookup.
    preparedBy: "TBD",
    email: input.leadGuest.email || "TBD",
    contact: input.leadGuest.phoneNumber || "TBD",
  };
}