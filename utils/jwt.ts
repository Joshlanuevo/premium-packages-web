export interface DecodedUser {
  userId: string;
  role?: string;
  agency_id?: string;
  status?: string;
  country_name?: string;
  region_name?: string;
  currency?: string;
  [key: string]: unknown;
}

export function decodeJwt(token: string): DecodedUser | null {
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;

    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const json =
      typeof window !== "undefined"
        ? decodeURIComponent(
            atob(base64)
              .split("")
              .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
              .join("")
          )
        : Buffer.from(base64, "base64").toString("utf-8");

    const parsed = JSON.parse(json);
    return parsed?.data ?? null;
  } catch {
    return null;
  }
}