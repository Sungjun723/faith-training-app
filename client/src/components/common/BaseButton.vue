<script setup lang="ts">
withDefaults(
  defineProps<{
    variant?: "primary" | "secondary" | "ghost" | "danger";
    size?: "sm" | "md";
    disabled?: boolean;
    type?: "button" | "submit";
  }>(),
  { variant: "primary", size: "md", disabled: false, type: "button" }
);
</script>

<template>
  <button
    :type="type"
    class="base-button"
    :class="[`base-button--${variant}`, `base-button--${size}`]"
    :disabled="disabled"
  >
    <slot />
  </button>
</template>

<style scoped>
.base-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  border: none;
  border-radius: var(--radius-full);
  font-weight: var(--font-weight-medium);
  cursor: pointer;
  min-height: var(--touch-target-min);
  padding: 0 var(--space-6);
  transition: transform var(--duration-instant) var(--easing-standard),
    background-color var(--duration-fast) var(--easing-standard),
    opacity var(--duration-fast) var(--easing-standard);
}

.base-button:active {
  transform: scale(0.96);
  opacity: 0.85;
}

.base-button:disabled {
  opacity: 0.4;
  cursor: not-allowed;
  transform: none;
}

.base-button--sm {
  min-height: 36px;
  padding: 0 var(--space-5);
  font-size: var(--font-size-sm);
}

.base-button--primary {
  background: var(--color-primary);
  color: var(--color-text-on-primary);
}
.base-button--primary:not(:disabled):hover {
  background: var(--color-primary-dark);
}

.base-button--secondary {
  background: var(--color-surface-muted);
  color: var(--color-primary);
}
.base-button--secondary:not(:disabled):hover {
  background: var(--color-border);
}

.base-button--ghost {
  background: transparent;
  color: var(--color-primary);
  border-radius: var(--radius-md);
}
.base-button--ghost:not(:disabled):hover {
  background: var(--color-primary-light);
}

.base-button--danger {
  background: var(--color-danger);
  color: #fff;
}
</style>
