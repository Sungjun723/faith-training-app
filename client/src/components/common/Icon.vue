<script setup lang="ts">
withDefaults(defineProps<{ name: string; size?: number }>(), { size: 22 });
</script>

<template>
  <svg
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.8"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <template v-if="name === 'home'">
      <path d="M4 11.5 12 4l8 7.5" />
      <path d="M6 10v9h12v-9" />
    </template>

    <template v-else-if="name === 'calendar'">
      <rect x="4" y="5.5" width="16" height="14.5" rx="2.5" />
      <path d="M4 10h16" />
      <path d="M8.5 3.5v3M15.5 3.5v3" />
    </template>

    <template v-else-if="name === 'book'">
      <path d="M5 5.5c1.8-1 4.4-1 7 0v13c-2.6-1-5.2-1-7 0z" />
      <path d="M19 5.5c-1.8-1-4.4-1-7 0v13c2.6-1 5.2-1 7 0z" />
    </template>

    <template v-else-if="name === 'user'">
      <circle cx="12" cy="8" r="3.4" />
      <path d="M5 20c1.2-3.6 4-5.4 7-5.4s5.8 1.8 7 5.4" />
    </template>

    <template v-else-if="name === 'users'">
      <circle cx="9" cy="8" r="3" />
      <path d="M3.5 19c1-3 3-4.6 5.5-4.6s4.5 1.6 5.5 4.6" />
      <path d="M15.5 9.2a2.6 2.6 0 1 0 0-5.2" />
      <path d="M15 14.6c2.1.3 3.6 1.8 4.5 4.4" />
    </template>

    <template v-else-if="name === 'gear'">
      <circle cx="12" cy="12" r="3" />
      <path
        d="M12 3.5v2M12 18.5v2M20.5 12h-2M5.5 12h-2M17.7 6.3l-1.4 1.4M7.7 16.3l-1.4 1.4M17.7 17.7l-1.4-1.4M7.7 7.7 6.3 6.3"
      />
    </template>

    <template v-else-if="name === 'chart'">
      <path d="M4 20V10M11 20V4M18 20v-7" />
      <path d="M3 20h18" />
    </template>

    <template v-else-if="name === 'document'">
      <path d="M7 3.5h7l4 4V20.5H7z" />
      <path d="M14 3.5V8h4" />
    </template>

    <template v-else-if="name === 'cross'">
      <path d="M12 4v16M7 9h10" />
    </template>
  </svg>
</template>
