import { create } from "zustand";

interface UiState {
  connectOpen: boolean;
  confirmOpen: boolean;
  confirmTitle: string;
  confirmDescription: string;
  confirmActionLabel: string;
  confirmTone: "default" | "danger";
  onConfirm?: () => void | Promise<void>;
  setConnectOpen: (open: boolean) => void;
  askConfirm: (input: {
    title: string;
    description: string;
    actionLabel?: string;
    tone?: "default" | "danger";
    onConfirm: () => void | Promise<void>;
  }) => void;
  closeConfirm: () => void;
}

export const useUiStore = create<UiState>((set) => ({
  connectOpen: false,
  confirmOpen: false,
  confirmTitle: "",
  confirmDescription: "",
  confirmActionLabel: "Confirm",
  confirmTone: "default",
  onConfirm: undefined,
  setConnectOpen: (open) => set({ connectOpen: open }),
  askConfirm: (input) =>
    set({
      confirmOpen: true,
      confirmTitle: input.title,
      confirmDescription: input.description,
      confirmActionLabel: input.actionLabel ?? "Confirm",
      confirmTone: input.tone ?? "default",
      onConfirm: input.onConfirm,
    }),
  closeConfirm: () => set({ confirmOpen: false, onConfirm: undefined }),
}));
