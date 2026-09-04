<script setup lang="ts">
import { useRouter } from "vue-router";
import { useAuthStore } from "@/stores/auth";
import { useToast } from "@/composables/useToast";

const auth = useAuthStore();
const router = useRouter();
const toast = useToast();

async function handleLogout() {
  await auth.logout();
  toast.success("로그아웃 되었습니다.");
  router.push({ name: "login" });
}
</script>

<template>
  <header class="app-header">
    <RouterLink :to="{ name: 'dashboard' }" class="app-header__brand">신앙훈련 노트</RouterLink>
    <div class="app-header__right">
      <RouterLink :to="{ name: 'profile' }" class="app-header__user">
        {{ auth.user?.name }}
      </RouterLink>
      <button class="app-header__logout" @click="handleLogout">로그아웃</button>
    </div>
  </header>
</template>

<style scoped>
.app-header {
  height: var(--header-height-desktop);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 var(--space-5);
  background: var(--color-surface-translucent);
  backdrop-filter: blur(var(--material-blur)) saturate(180%);
  -webkit-backdrop-filter: blur(var(--material-blur)) saturate(180%);
  border-bottom: 1px solid var(--color-border);
  position: sticky;
  top: 0;
  z-index: 40;
}
.app-header__brand {
  font-weight: var(--font-weight-bold);
  font-size: var(--font-size-lg);
  color: var(--color-primary);
  text-decoration: none;
}
.app-header__right {
  display: flex;
  align-items: center;
  gap: var(--space-4);
}
.app-header__user {
  text-decoration: none;
  color: var(--color-text);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
}
.app-header__logout {
  background: none;
  border: none;
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
  cursor: pointer;
  min-height: var(--touch-target-min);
}
</style>
