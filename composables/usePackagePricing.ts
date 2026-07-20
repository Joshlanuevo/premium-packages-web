// Ported from LakbayHub's holidayPackagesStore.js: getEffectiveSeasonPricing +
// getEffectivePriceTier. Full tiered/seasonal pricing, as decided.
//
// Deliberately NOT ported: surcharges, extra-night pricing, and the
// markup/discount chain (currentMarkup, agentMarkupValue, totalDiscount,
// etc.) — those depend on a reseller hierarchy that doesn't apply to
// single-tenant Gladex Premium Packages.

export interface PricingTier {
  min: number;
  price: number;
}

export interface SeasonType {
  id: string;
  title?: string;
  start_date: string;
  end_date: string;
  is_tiered_pricing: boolean;
  base_price: number;
  pricing_tiers: PricingTier[];
}

export interface TravellerType {
  id: string;
  title: string;
  description?: string;
  max_pax: number;
  min_pax: number;
  is_tiered_pricing: boolean;
  base_price: number;
  pricing_tiers: PricingTier[];
  season_types?: SeasonType[];
}

export interface PackageVariation {
  id: string;
  title: string;
  traveller_types: TravellerType[];
}

function isDateValid(d: unknown): boolean {
  if (!d) return false;
  return !isNaN(new Date(d as string).getTime());
}

/**
 * Finds the season_type whose date range contains travelDate. Falls back to
 * the traveller type's own base pricing if no season matches — same
 * fallback the legacy getEffectiveSeasonPricing uses.
 */
export function getEffectiveSeasonPricing(
  travellerType: TravellerType,
  travelDate: string
): SeasonType | TravellerType {
  const seasonTypes = travellerType.season_types;
  if (!Array.isArray(seasonTypes) || seasonTypes.length === 0) return travellerType;

  const travel = new Date(travelDate);
  const match = seasonTypes.find((season) => {
    if (!isDateValid(season.start_date) || !isDateValid(season.end_date)) return false;
    return travel >= new Date(season.start_date) && travel <= new Date(season.end_date);
  });

  return match ?? travellerType;
}

/** Highest tier whose min <= qty, where the next tier's min (if any) is > qty. */
export function getEffectivePriceTier(qty: number, pricing: { pricing_tiers?: PricingTier[] }): number {
  const tiers = pricing.pricing_tiers;
  if (!Array.isArray(tiers) || tiers.length === 0) return 0;

  let selected = tiers[0];
  for (let i = 0; i < tiers.length; i++) {
    const next = tiers[i + 1];
    if (qty >= tiers[i].min && (!next || qty < next.min)) {
      selected = tiers[i];
      break;
    }
  }
  return selected.price;
}

export function getEffectivePrice(travellerType: TravellerType, qty: number, travelDate: string): number {
  const effective = getEffectiveSeasonPricing(travellerType, travelDate);
  if ("is_tiered_pricing" in effective && effective.is_tiered_pricing) {
    return getEffectivePriceTier(qty, effective);
  }
  return effective.base_price ?? 0;
}

/** Returns the season's title if a season_type (not the base traveller type)
 *  is driving the current price — null otherwise. Lets the UI show "Low
 *  Season" style badges like the legacy variation picker did. */
export function getEffectiveSeasonLabel(travellerType: TravellerType, travelDate: string): string | null {
  const effective = getEffectiveSeasonPricing(travellerType, travelDate);
  if (effective === travellerType) return null;
  return (effective as SeasonType).title ?? null;
}

export interface RoomInput {
  traveller_types: Record<string, number>;
}

export function computeBookingCost(rooms: RoomInput[], variation: PackageVariation, travelDate: string): number {
  let total = 0;
  for (const room of rooms) {
    for (const travellerType of variation.traveller_types) {
      const qty = room.traveller_types[travellerType.id] || 0;
      if (qty <= 0) continue;
      total += getEffectivePrice(travellerType, qty, travelDate) * qty;
    }
  }
  return total;
}

export function computeTotalPax(rooms: RoomInput[]): number {
  return rooms.reduce(
    (sum, room) => sum + Object.values(room.traveller_types).reduce((a, b) => a + (b || 0), 0),
    0
  );
}

export function computeDownPayment(
  downPayment: { type: "fixed" | "percentage"; value: number } | undefined,
  totalCost: number
): number {
  if (!downPayment) return 0;
  if (downPayment.type === "percentage") return Math.ceil((totalCost * downPayment.value) / 100);
  return downPayment.value;
}

/** MM/DD/YYYY — the exact format the backend's buildInstallmentSchedule
 *  toIsoDate() regex requires. */
export function toMMDDYYYY(date: string | Date | undefined): string {
  const d = date ? new Date(date) : new Date();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${mm}/${dd}/${String(d.getFullYear())}`;
}