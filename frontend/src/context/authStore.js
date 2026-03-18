import { create } from "zustand";
import { persist } from "zustand/middleware";

export const authStore = create(
  persist(
    (set) => ({
      token: null,
      user: null,
      setAuth: ({ token, user }) => set({ token, user }),
      logout: () => set({ token: null, user: null }),
    }),
    { name: "mini-hrms-auth" }
  )
);

export function useAuth() {
  return authStore((s) => s);
}

