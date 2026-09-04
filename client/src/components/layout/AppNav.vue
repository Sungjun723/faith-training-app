<script setup lang="ts">
import { computed } from "vue";
import { useRoute } from "vue-router";
import { useAuthStore } from "@/stores/auth";

const route = useRoute();
const auth = useAuthStore();

const memberLinks = [
  { name: "dashboard", label: "홈", icon: "🏠" },
  { name: "calendar", label: "캘린더", icon: "📅" },
  { name: "weekly-summary", label: "한 주 결산", icon: "📊" },
  { name: "memorization", label: "암송", icon: "📖" },
  { name: "profile", label: "Profile", icon: "👤" },
];

const links = computed(() =>
  auth.isAdmin ? [...memberLinks, { name: "admin", label: "관리자", icon: "⚙️" }] : memberLinks
);

function isActive(name: string) {
  if (name === "admin") return route.path.startsWith("/admin");
  return route.name === name;
}
</script>

<template>
  <nav class="app-nav" aria-label="주요 메뉴">
    <RouterLink
      v-for="link in links"
      :key="link.name"
      :to="{ name: link.name }"
      class="app-nav__item"
      :class="{ 'is-active': isActive(link.name) }"
    >
      <span class="app-nav__icon" aria-hidden="true">{{ link.icon }}</span>
      <span class="app-nav__label">{{ link.label }}</span>
    </RouterLink>
  </nav>
</template>

<style scoped>
.app-nav {
  display: flex;
  justify-content: space-around;
  align-items: center;
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: var(--nav-height-mobile);
  background: var(--color-surface-translucent);
  backdrop-filter: blur(var(--material-blur)) saturate(180%);
  -webkit-backdrop-filter: blur(var(--material-blur)) saturate(180%);
  border-top: 1px solid var(--color-border);
  z-index: 50;
}

.app-nav__item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  text-decoration: none;
  color: var(--color-text-secondary);
  font-size: var(--font-size-xs);
  min-width: var(--touch-target-min);
  min-height: var(--touch-target-min);
  justify-content: center;
  transition: color var(--duration-fast) var(--easing-standard);
}
.app-nav__icon {
  font-size: 20px;
}
.app-nav__item.is-active {
  color: var(--color-primary);
  font-weight: var(--font-weight-medium);
}

@media (min-width: 1024px) {
  .app-nav {
    position: fixed;
    top: var(--header-height-desktop);
    bottom: 0;
    left: 0;
    right: auto;
    width: var(--sidebar-width-desktop);
    flex-direction: column;
    justify-content: flex-start;
    align-items: stretch;
    border-top: none;
    border-right: 1px solid var(--color-border);
    padding: var(--space-6) var(--space-3);
    gap: var(--space-2);
  }
  .app-nav__item {
    flex-direction: row;
    justify-content: flex-start;
    gap: var(--space-3);
    padding: 0 var(--space-4);
    border-radius: var(--radius-md);
    font-size: var(--font-size-base);
  }
  .app-nav__item.is-active {
    background: var(--color-primary-light);
  }
}
</style>
