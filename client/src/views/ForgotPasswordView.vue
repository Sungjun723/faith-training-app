<script setup lang="ts">
import { ref } from "vue";
import { api } from "@/utils/api";
import BaseInput from "@/components/common/BaseInput.vue";
import BaseButton from "@/components/common/BaseButton.vue";
import BaseCard from "@/components/common/BaseCard.vue";

const email = ref("");
const loading = ref(false);
const sent = ref(false);
const errorMessage = ref("");

async function handleSubmit() {
  loading.value = true;
  errorMessage.value = "";
  try {
    await api.post("/auth/request-password-reset", { email: email.value });
    sent.value = true;
  } catch (err: any) {
    errorMessage.value = err?.message ?? "요청 처리 중 오류가 발생했습니다.";
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="forgot-page">
    <BaseCard class="forgot-page__card">
      <h1 class="forgot-page__title">비밀번호 재설정</h1>

      <template v-if="sent">
        <p class="forgot-page__done">
          입력하신 이메일로 가입된 계정이 있다면 재설정 링크를 보내드렸습니다. 메일함(스팸함 포함)을 확인해주세요.
        </p>
        <RouterLink class="forgot-page__back" :to="{ name: 'login' }">로그인으로 돌아가기</RouterLink>
      </template>

      <form v-else class="forgot-page__form" @submit.prevent="handleSubmit">
        <p class="forgot-page__desc">가입하신 이메일 주소를 입력하시면 재설정 링크를 보내드립니다.</p>
        <BaseInput v-model="email" type="email" label="이메일" placeholder="you@example.com" />
        <p v-if="errorMessage" class="forgot-page__error" role="alert">{{ errorMessage }}</p>
        <BaseButton type="submit" :disabled="loading" style="width: 100%">
          {{ loading ? "전송 중..." : "재설정 링크 보내기" }}
        </BaseButton>
        <RouterLink class="forgot-page__back" :to="{ name: 'login' }">로그인으로 돌아가기</RouterLink>
      </form>
    </BaseCard>
  </div>
</template>

<style scoped>
.forgot-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-5);
  background: linear-gradient(180deg, var(--color-primary-light) 0%, var(--color-bg) 45%);
}
.forgot-page__card {
  width: 100%;
  max-width: 380px;
}
.forgot-page__title {
  font-size: var(--font-size-lg);
  margin: 0 0 var(--space-4);
  text-align: center;
}
.forgot-page__desc {
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
  margin: 0 0 var(--space-2);
}
.forgot-page__form {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}
.forgot-page__done {
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
  line-height: var(--line-height-normal);
  margin: 0 0 var(--space-4);
}
.forgot-page__error {
  color: var(--color-danger);
  font-size: var(--font-size-sm);
  margin: 0;
}
.forgot-page__back {
  display: block;
  text-align: center;
  font-size: var(--font-size-sm);
  color: var(--color-primary);
  text-decoration: none;
  margin-top: var(--space-2);
}
</style>
