<script setup lang="ts">
const route = useRoute();
const { request } = useApi();

// Runs on the server for the initial request (SSR), then on the client for
// subsequent navigations — this is the SEO-relevant fetch.
const { data: pkg } = await useAsyncData(`package-${route.params.id}`, () =>
  request<{ title: string; description?: string }>(`/packages/${route.params.id}`)
);

useSeoMeta({
  title: () => pkg.value?.title ?? "Package",
  description: () => pkg.value?.description ?? "",
});
</script>

<template>
  <main>
    <h1>{{ pkg?.title }}</h1>
    <p>{{ pkg?.description }}</p>
  </main>
</template>
