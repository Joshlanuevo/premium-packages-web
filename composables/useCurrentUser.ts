const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  superadmin: "Super Admin",
  masteragent: "Partner",
  whitelabel: "Whitelabel",
  agent: "Company",
  subagent: "Staff",
  accounting: "Accounting",
  merchant: "Merchant",
};

interface UserProfileResponse {
  status: boolean;
  data?: { firstName: string; lastName: string; fullName: string; email: string; type: string; agencyName: string };
}

export function useCurrentUser() {
  const auth = useAuthStore();
  const { request } = useApi();

  const profile = ref<UserProfileResponse["data"] | null>(null);

  async function fetchProfile() {
    try {
      const result = await request<UserProfileResponse>("/me");
      profile.value = result.data ?? null;
    } catch {
      profile.value = null;
    }
  }

  const displayName = computed(() => {
    if (profile.value?.fullName) return profile.value.fullName;
    // Fallback while /me hasn't resolved yet, or if it fails — same chain
    // as before, since the JWT itself still has no name field.
    const u = auth.user as Record<string, unknown> | null;
    const companyName = (u?.company_name as string | undefined)?.trim();
    const username = (u?.username as string | undefined)?.trim();
    return companyName || username || "Account";
  });

  const displayRole = computed(() => {
    const role = profile.value?.type || ((auth.user as Record<string, unknown> | null)?.role as string | undefined);
    if (!role) return "";
    return ROLE_LABELS[role] ?? role;
  });

  onMounted(fetchProfile);

  return { displayName, displayRole };
}