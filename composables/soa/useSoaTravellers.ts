import { getEffectivePrice, type PackageVariation, type RoomInput } from "~/composables/usePackagePricing";

export interface SoaTravellerLine {
  id: string;
  label: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export function useSoaTravellers(
  rooms: RoomInput[],
  variation: PackageVariation,
  travelDate: string
): { lines: SoaTravellerLine[]; total: number } {
  const lines: SoaTravellerLine[] = [];

  rooms.forEach((room, roomIndex) => {
    variation.traveller_types.forEach((tt) => {
      const qty = room.traveller_types[tt.id] || 0;
      if (qty <= 0) return;
      const unitPrice = getEffectivePrice(tt, qty, travelDate);
      lines.push({
        id: `${roomIndex}-${tt.id}`,
        label: rooms.length > 1 ? `${tt.title} (Room ${roomIndex + 1})` : tt.title,
        quantity: qty,
        unitPrice,
        total: unitPrice * qty,
      });
    });
  });

  return { lines, total: lines.reduce((sum, l) => sum + l.total, 0) };
}