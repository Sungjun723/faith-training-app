import { defineStore } from "pinia";
import { api } from "@/utils/api";

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: "member" | "admin";
  profileImage?: string | null;
}

export const useAuthStore = defineStore("auth", {
  state: () => ({
    user: null as AuthUser | null,
    initialized: false,
    loading: false,
    errorMessage: "" as string,
  }),
  getters: {
    isAuthenticated: (state) => !!state.user,
    isAdmin: (state) => state.user?.role === "admin",
  },
  actions: {
    async fetchMe() {
      try {
        const { user } = await api.get<{ user: AuthUser }>("/auth/me");
        this.user = user;
      } catch {
        this.user = null;
      } finally {
        this.initialized = true;
      }
    },
    async login(email: string, password: string) {
      this.loading = true;
      this.errorMessage = "";
      try {
        const { user } = await api.post<{ user: AuthUser }>("/auth/login", { email, password });
        this.user = user;
        return true;
      } catch (err: any) {
        this.errorMessage = err?.message ?? "로그인에 실패했습니다.";
        return false;
      } finally {
        this.loading = false;
      }
    },
    async logout() {
      await api.post("/auth/logout");
      this.user = null;
    },
  },
});
