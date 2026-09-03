<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "@/stores/auth";
import BaseInput from "@/components/common/BaseInput.vue";
import BaseButton from "@/components/common/BaseButton.vue";
import BaseCard from "@/components/common/BaseCard.vue";

const email = ref("");
const password = ref("");
const auth = useAuthStore();
const router = useRouter();

async function handleSubmit() {
  const ok = await auth.login(email.value, password.value);
  if (ok) {
    router.push(auth.isAdmin ? { name: "admin" } : { name: "dashboard" });
  }
}
</script>

<template>
  <div class="login-page">
    <BaseCard class="login-page__card">
      <div class="login-page__brand">
        <div class="login-page__logo" aria-hidden="true">✝</div>
        <h1 class="login-page__title">신앙훈련 노트</h1>
        <p class="login-page__subtitle">매일의 훈련을 기록하고, 함께 성장해요</p>
      </div>

      <form class="login-page__form" @submit.prevent="handleSubmit">
        <BaseInput v-model="email" type="email" label="이메일" placeholder="you@example.com" />
        <BaseInput v-model="password" type="password" label="비밀번호" placeholder="비밀번호" />
        <p v-if="auth.errorMessage" class="login-page__error" role="alert">{{ auth.errorMessage }}</p>
        <BaseButton type="submit" :disabled="auth.loading" style="width: 100%; margin-top: 8px">
          {{ auth.loading ? "로그인 중..." : "로그인" }}
        </BaseButton>
        <RouterLink :to="{ name: 'forgot-password' }" class="login-page__forgot">
          비밀번호를 잊으셨나요?
        </RouterLink>
      </form>
    </BaseCard>
  </div>
</template>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-5);
  background: linear-gradient(180deg, var(--color-primary-light) 0%, var(--color-bg) 45%);
}
.login-page__card {
  width: 100%;
  max-width: 380px;
}
.login-page__brand {
  text-align: center;
  margin-bottom: var(--space-6);
}
.login-page__logo {
  width: 56px;
  height: 56px;
  border-radius: var(--radius-full);
  background: var(--color-primary);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  margin: 0 auto var(--space-4);
}
.login-page__title {
  font-size: var(--font-size-xl);
  font-weight: var(--font-weight-bold);
  margin: 0 0 var(--space-2);
}
.login-page__subtitle {
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
  margin: 0;
}
.login-page__form {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}
.login-page__error {
  color: var(--color-danger);
  font-size: var(--font-size-sm);
  margin: 0;
}
.login-page__forgot {
  display: block;
  text-align: center;
  margin-top: var(--space-2);
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  text-decoration: none;
}
</style>
