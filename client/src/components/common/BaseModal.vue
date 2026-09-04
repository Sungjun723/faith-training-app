<script setup lang="ts">
defineProps<{ modelValue: boolean; title?: string }>();
const emit = defineEmits<{ (e: "update:modelValue", value: boolean): void }>();
function close() {
  emit("update:modelValue", false);
}
</script>

<template>
  <Teleport to="body">
    <Transition name="modal-fade">
      <div v-if="modelValue" class="base-modal__backdrop" @click.self="close">
        <Transition name="modal-pop" appear>
          <div v-if="modelValue" class="base-modal" role="dialog" aria-modal="true">
            <div class="base-modal__handle" aria-hidden="true" />
            <header v-if="title" class="base-modal__header">
              <h2 class="base-modal__title">{{ title }}</h2>
              <button class="base-modal__close" aria-label="닫기" @click="close">✕</button>
            </header>
            <div class="base-modal__body">
              <slot />
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.base-modal__backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.32);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  z-index: 100;
}
@media (min-width: 768px) {
  .base-modal__backdrop {
    align-items: center;
  }
}
.base-modal {
  background: var(--color-surface);
  border-radius: var(--radius-lg) var(--radius-lg) 0 0;
  width: 100%;
  max-width: 480px;
  max-height: 85vh;
  overflow-y: auto;
  padding: var(--space-6);
}
.base-modal__handle {
  width: 36px;
  height: 5px;
  border-radius: var(--radius-full);
  background: var(--color-border-strong);
  margin: 0 auto var(--space-4);
}
@media (min-width: 768px) {
  .base-modal {
    border-radius: var(--radius-lg);
  }
  .base-modal__handle {
    display: none;
  }
}
.base-modal__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-4);
}
.base-modal__title {
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-bold);
  margin: 0;
}
.base-modal__close {
  background: none;
  border: none;
  font-size: var(--font-size-lg);
  cursor: pointer;
  min-width: var(--touch-target-min);
  min-height: var(--touch-target-min);
}

/* spring 느낌의 등장/퇴장 (.designrules 모션 철학 반영) */
.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity var(--duration-base) var(--easing-standard);
}
.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}
.modal-pop-enter-active {
  transition: transform var(--duration-base) var(--easing-standard), opacity var(--duration-base) var(--easing-standard);
}
.modal-pop-enter-from {
  transform: translateY(24px) scale(0.98);
  opacity: 0;
}
</style>
