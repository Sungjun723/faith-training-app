import { createRouter, createWebHistory } from "vue-router";
import { useAuthStore } from "@/stores/auth";

const routes = [
  { path: "/login", name: "login", component: () => import("@/views/LoginView.vue"), meta: { public: true } },
  { path: "/dashboard", name: "dashboard", component: () => import("@/views/DashboardView.vue") },
  { path: "/calendar", name: "calendar", component: () => import("@/views/CalendarView.vue") },
  {
    path: "/weekly-summary",
    name: "weekly-summary",
    component: () => import("@/views/WeeklySummaryView.vue"),
  },
  { path: "/profile", name: "profile", component: () => import("@/views/ProfileView.vue") },
  { path: "/memorization", name: "memorization", component: () => import("@/views/MemorizationView.vue") },
  {
    path: "/admin",
    name: "admin",
    component: () => import("@/views/admin/AdminHomeView.vue"),
    meta: { requiresAdmin: true },
  },
  {
    path: "/admin/members",
    name: "admin-members",
    component: () => import("@/views/admin/AdminMembersView.vue"),
    meta: { requiresAdmin: true },
  },
  {
    path: "/admin/members/:id",
    name: "admin-member-detail",
    component: () => import("@/views/admin/AdminMemberDetailView.vue"),
    meta: { requiresAdmin: true },
  },
  {
    path: "/admin/memorization",
    name: "admin-memorization",
    component: () => import("@/views/admin/AdminMemorizationView.vue"),
    meta: { requiresAdmin: true },
  },
  {
    path: "/admin/statistics",
    name: "admin-statistics",
    component: () => import("@/views/admin/AdminStatisticsView.vue"),
    meta: { requiresAdmin: true },
  },
  { path: "/:pathMatch(.*)*", redirect: "/dashboard" },
];

export const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach(async (to) => {
  const auth = useAuthStore();
  if (!auth.initialized) {
    await auth.fetchMe();
  }

  if (to.meta.public) {
    if (auth.isAuthenticated) {
      return auth.isAdmin ? { name: "admin" } : { name: "dashboard" };
    }
    return true;
  }

  if (!auth.isAuthenticated) {
    return { name: "login" };
  }

  if (to.meta.requiresAdmin && !auth.isAdmin) {
    // 보안 경계는 서버가 담당. 이 redirect는 UX 목적.
    return { name: "dashboard" };
  }

  return true;
});
