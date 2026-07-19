export default defineNuxtRouteMiddleware((to) => {
  const auth = useAuthStore();

  const publicPrefixes = ["/packages", "/auth", "/login"];
  const isPublic = to.path === "/" || publicPrefixes.some((p) => to.path.startsWith(p));

  if (!isPublic && !auth.isAuthenticated) {
    return navigateTo("/login");
  }
});