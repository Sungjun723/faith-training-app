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
    state.items = state.items.filter((t) => t.id !== id);
  }, 2200);
}

export function useToast() {
  return {
    toasts: state.items,
    success: (message: string) => push(message, "success"),
    error: (message: string) => push(message, "error"),
  };
}
