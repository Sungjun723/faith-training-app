<script setup lang="ts">
import { ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { api } from "@/utils/api";
import { useToast } from "@/composables/useToast";
import BaseInput from "@/components/common/BaseInput.vue";
import BaseButton from "@/components/common/BaseButton.vue";
import BaseCard from "@/components/common/BaseCard.vue";

const route = useRoute();
const router = useRouter();
const toast = useToast();

const token = String(route.query.token ?? "");
const newPassword = ref("");
const confirmPassword = ref("");
const loading = ref(false);
const errorMessage = ref("");

async function handleSubmit() {
  errorMessage.value = "";
  if (!token) {
    errorMessage.value = "유효하지 않은 링크입니다. 재설정을 다시 요청해주세요.";
    return;
  }
  if (newPassword.value.length < 8) {
    errorMessage.value = "비밀번호는 8자 이상이어야 합니다.";
    return;
  }
  if (newPassword.value !== confirmPassword.value) {
    errorMessage.value = "비밀번호가 일치하지 않습니다.";
    return;
  }

  loading.value = true;
  try {
    await api.post("/auth/reset-password", { token, newPassword: newPassword.value });
    toast.success("비밀번호가 변경되었습니다. 다시 로그인해주세요.");
    router.push({ name: "login" });
  } catch (err: any) {
    errorMessage.value = err?.message ?? "재설정에 실패했습니다.";
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="reset-page">
    <BaseCard class="reset-page__card">
      <h1 class="reset-page__title">새 비밀번호 설정</h1>

      <form class="reset-page__form" @submit.prevent="handleSubmit">
        <BaseInput v-model="newPassword" type="password" label="새 비밀번호" placeholder="8자 이상" />
        <BaseInput v-model="confirmPassword" type="password" label="새 비밀번호 확인" />
        <p v-if="errorMessage" class="reset-page__error" role="alert">{{ errorMessage }}</p>
        <BaseButton type="submit" :disabled="loading" style="width: 100%">
          {{ loading ? "변경 중..." : "비밀번호 변경" }}
        </BaseButton>
      </form>
    </BaseCard>
  </div>
</template>

<style scoped>
.reset-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-5);
  background: linear-gradient(180deg, var(--color-primary-light) 0%, var(--color-bg) 45%);
}
.reset-page__card {
  width: 100%;
  max-width: 380px;
}
.reset-page__title {
  font-size: var(--font-size-lg);
  margin: 0 0 var(--space-4);
  text-align: center;
}
.reset-page__form {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}
.reset-page__error {
  color: var(--color-danger);
  font-size: var(--font-size-sm);
  margin: 0;
}
</style>
