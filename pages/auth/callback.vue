<script setup lang="ts">
definePageMeta({ ssr: false });

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();

const error = ref<string | null>(null);

onMounted(() => {
  const token = route.query.token as string | undefined;

  if (!token) {
    error.value = "Missing auth token. Please log in again from the main site.";
    return;
  }

  auth.setToken(token);
  router.push("/");
});
</script>

<template>
  <main>
    <p v-if="!error">Signing you in…</p>
    <p v-else>{{ error }}</p>
  </main>
</template>