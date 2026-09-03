<script setup lang="ts">
import { useToast } from "@/composables/useToast";
const { toasts } = useToast();
</script>

<template>
  <div class="toast-host">
    <TransitionGroup name="toast">
      <div v-for="t in toasts" :key="t.id" class="toast-item" :class="`toast-item--${t.type}`">
        {{ t.message }}
      </div>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.toast-host {
  position: fixed;
  bottom: calc(var(--nav-height-mobile) + var(--space-4));
  left: 0;
  right: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-2);
  pointer-events: none;
  z-index: 200;
}
@media (min-width: 768px) {
  .toast-host {
    bottom: var(--space-6);
  }
}
.toast-item {
  padding: var(--space-3) var(--space-5);
  border-radius: var(--radius-full);
  font-size: var(--font-size-sm);
  color: #fff;
  box-shadow: var(--shadow-md);
}
.toast-item--success {
  background: var(--color-text);
}
.toast-item--error {
  background: var(--color-danger);
}
.toast-enter-active,
.toast-leave-active {
  transition: transform var(--duration-base) var(--easing-standard), opacity var(--duration-base) var(--easing-standard);
}
.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateY(8px);
}
</style>
