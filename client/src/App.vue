<script setup lang="ts">
import { computed } from "vue";
import { useRoute } from "vue-router";
import { useAuthStore } from "@/stores/auth";
import AppHeader from "@/components/layout/AppHeader.vue";
import AppNav from "@/components/layout/AppNav.vue";
import ToastHost from "@/components/layout/ToastHost.vue";

const route = useRoute();
const auth = useAuthStore();

const showChrome = computed(() => auth.isAuthenticated && !route.meta.public);
</script>

<template>
  <div class="app-shell">
    <AppHeader v-if="showChrome" />
    <div class="app-shell__body">
      <AppNav v-if="showChrome" />
      <main class="app-shell__content" :class="{ 'app-shell__content--with-nav': showChrome }">
        <RouterView />
      </main>
    </div>
    <ToastHost />
  </div>
</template>

<style scoped>
.app-shell {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}
.app-shell__body {
  flex: 1;
  display: flex;
}
.app-shell__content {
  flex: 1;
  min-width: 0;
  padding: var(--space-4);
  max-width: var(--content-max-width);
  margin: 0 auto;
  width: 100%;
}
.app-shell__content--with-nav {
  padding-bottom: calc(var(--nav-height-mobile) + var(--space-6));
}
@media (min-width: 1024px) {
  .app-shell__content--with-nav {
    padding-left: calc(var(--sidebar-width-desktop) + var(--space-6));
    padding-bottom: var(--space-8);
  }
}
</style>
