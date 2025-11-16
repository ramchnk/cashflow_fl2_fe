
import { create } from 'zustand';

interface UserState {
  shopNumber: string | null;
  setShopNumber: (shopNumber: string | null) => void;
}

export const useUserStore = create<UserState>((set) => ({
  shopNumber: null,
  setShopNumber: (shopNumber) => set({ shopNumber }),
}));
