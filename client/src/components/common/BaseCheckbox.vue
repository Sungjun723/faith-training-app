<script setup lang="ts">
defineProps<{ modelValue: boolean; label?: string; disabled?: boolean }>();
defineEmits<{ (e: "update:modelValue", value: boolean): void }>();
</script>

<template>
  <label class="base-checkbox" :class="{ 'is-disabled': disabled }">
    <input
      type="checkbox"
      class="base-checkbox__input"
      :checked="modelValue"
      :disabled="disabled"
      :aria-label="label"
      @change="$emit('update:modelValue', ($event.target as HTMLInputElement).checked)"
    />
    <span class="base-checkbox__box" aria-hidden="true">
      <svg v-if="modelValue" width="14" height="14" viewBox="0 0 14 14" fill="none">
        <path d="M2 7l3.5 3.5L12 3.5" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
    </span>
    <span v-if="label" class="base-checkbox__label">{{ label }}</span>
  </label>
</template>

<style scoped>
.base-checkbox {
  display: inline-flex;
  align-items: center;
  gap: var(--space-3);
  min-height: var(--touch-target-min);
  min-width: var(--touch-target-min);
  cursor: pointer;
  user-select: none;
}
.base-checkbox.is-disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.base-checkbox__input {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
}
.base-checkbox__box {
  width: 24px;
  height: 24px;
  border-radius: var(--radius-sm);
  border: 1.5px solid var(--color-border-strong);
  background: var(--color-surface);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: background-color var(--duration-fast) var(--easing-standard),
    border-color var(--duration-fast) var(--easing-standard),
    transform var(--duration-fast) var(--easing-standard);
}
.base-checkbox__input:checked + .base-checkbox__box {
  background: var(--color-primary);
  border-color: var(--color-primary);
}
.base-checkbox__input:focus-visible + .base-checkbox__box {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}
.base-checkbox:active .base-checkbox__box {
  transform: scale(0.92);
}
.base-checkbox__label {
  font-size: var(--font-size-base);
  color: var(--color-text);
}
</style>
