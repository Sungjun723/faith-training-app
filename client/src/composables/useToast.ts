import { reactive } from "vue";

export interface ToastItem {
  id: number;
  message: string;
  type: "success" | "error";
}

const state = reactive<{ items: ToastItem[] }>({ items: [] });
let nextId = 1;

function push(message: string, type: ToastItem["type"] = "success") {
  const id = nextId++;
  state.items.push({ id, message, type });
  setTimeout(() => {
    // 배열을 통째로 재할당하면 이미 이 배열 참조를 구독 중인 컴포넌트에는
    // 반영되지 않아 토스트가 영원히 사라지지 않는 문제가 있었다.
    // splice로 같은 배열 객체를 직접 변형해야 반응성이 유지된다.
    const idx = state.items.findIndex((t) => t.id === id);
    if (idx !== -1) state.items.splice(idx, 1);
  }, 2200);
}

export function useToast() {
  return {
    toasts: state.items,
    success: (message: string) => push(message, "success"),
    error: (message: string) => push(message, "error"),
  };
}
