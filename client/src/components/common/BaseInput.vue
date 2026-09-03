<script setup lang="ts">
withDefaults(
  defineProps<{
    modelValue: string | number;
    type?: string;
    label?: string;
    placeholder?: string;
    min?: number;
    max?: number;
    error?: string;
  }>(),
  { type: "text" }
);
defineEmits<{ (e: "update:modelValue", value: string): void }>();
</script>

<template>
  <label class="base-input">
    <span v-if="label" class="base-input__label">{{ label }}</span>
    <input
      class="base-input__field"
      :type="type"
      :value="modelValue"
      :placeholder="placeholder"
      :min="min"
      :max="max"
      :aria-label="label"
      @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
    />
    <span v-if="error" class="base-input__error">{{ error }}</span>
  </label>
</template>

<style scoped>
.base-input {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  width: 100%;
}
.base-input__label {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  font-weight: var(--font-weight-medium);
}
.base-input__field {
  min-height: var(--touch-target-min);
  padding: 0 var(--space-4);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  color: var(--color-text);
  transition: border-color var(--duration-fast) var(--easing-standard);
}
.base-input__field:focus {
  border-color: var(--color-primary);
}
.base-input__error {
  font-size: var(--font-size-xs);
  color: var(--color-danger);
}
</style>
