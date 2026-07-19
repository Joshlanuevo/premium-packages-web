import { useAuthStore } from "~/stores/auth";

/**
 * Thin fetch wrapper, same role as the existing getApi('lakbayhub') axios helper —
 * attaches the bearer token and points at the Express API base URL.
 */
export function useApi() {
  const config = useRuntimeConfig();
  const auth = useAuthStore();

  async function request<T>(path: string, options: Parameters<typeof $fetch>[1] = {}) {
    return $fetch<T>(path, {
      baseURL: config.public.apiBase,
      ...options,
      headers: {
        ...(options.headers || {}),
        ...(auth.token ? { Authorization: `Bearer ${auth.token}` } : {}),
      },
    });
  }

  return { request };
}
