import { defineStore } from "pinia";

export const useAuthStore = defineStore("auth", () => {
  const tokenCookie = useCookie<string | null>("auth_token", {
    maxAge: 60 * 60 * 24,
    sameSite: "lax",
  });

  const user = computed(() =>
    tokenCookie.value ? decodeJwt(tokenCookie.value) : null
  );

  const isAuthenticated = computed(() => !!tokenCookie.value);

  function setToken(token: string) {
    tokenCookie.value = token;
  }

  function clear() {
    tokenCookie.value = null;
  }

  return {
    token: tokenCookie,
    user,
    isAuthenticated,
    setToken,
    clear,
  };
});