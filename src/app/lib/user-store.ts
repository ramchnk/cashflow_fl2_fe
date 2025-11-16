
import { create } from 'zustand';

interface UserState {
  shopName: string | null;
  setShopName: (shopName: string | null) => void;
}

export const useUserStore = create<UserState>((set) => ({
  shopName: null,
  setShopName: (shopName) => set({ shopName }),
}));
