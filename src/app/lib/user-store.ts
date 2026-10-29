import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface UserState {
  shopName: string | null;
  shopNumber: string | number | null;
  setShopName: (shopName: string | null) => void;
  setShopNumber: (shopNumber: string | number | null) => void;
  resetUser: () => void;
}

export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      shopName: null,
      shopNumber: null,
      setShopName: (shopName) => set({ shopName }),
      setShopNumber: (shopNumber) => set({ shopNumber }),
      resetUser: () => set({ shopName: null, shopNumber: null }),
    }),
    {
      name: 'user-storage',
      storage: createJSONStorage(() => (typeof window !== 'undefined' ? localStorage : {
        getItem: () => null,
        setItem: () => {},
        removeItem: () => {},
      })),
    }
  )
);

/**
 * Checks if the given shop identifier corresponds to shop number 3.
 * Supports string "3", number 3, "03", or shopName containing shop 3 references.
 */
export function isShopThree(
  shopNumber: string | number | null | undefined,
  shopName?: string | null
): boolean {
  if (shopNumber !== null && shopNumber !== undefined) {
    const s = String(shopNumber).trim().toLowerCase();
    if (s === '3' || s === '03' || Number(s) === 3) return true;
    if (s === 'shop 3' || s === 'shop3' || s === 'shop-3' || s === 'shop: 3') return true;
  }
  if (shopName) {
    const name = shopName.trim().toLowerCase();
    if (name === '3' || name === 'shop 3' || name === 'shop3' || name === 'shop-3' || name === 'shop: 3') return true;
  }
  return false;
}

/**
 * Utility to decode JWT token payload safely in browser.
 */
export function decodeJwt(token: string): any {
  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

/**
 * Synchronizes account information (shopNumber and shopName) from token or backend API.
 */
export async function syncAccountInfo(tokenOverride?: string): Promise<{
  shopNumber: string | number | null;
  shopName: string | null;
} | null> {
  if (typeof window === 'undefined') return null;
  const token = tokenOverride || sessionStorage.getItem('accessToken');
  if (!token) return null;

  // 1. Immediately extract from JWT token if payload contains shop properties
  const decoded = decodeJwt(token);
  if (decoded) {
    const jwtShopNum = decoded.shopNumber ?? decoded.shopNo ?? decoded.shop_number ?? decoded.shop;
    const jwtShopName = decoded.shopName ?? decoded.shop_name;
    if (jwtShopNum !== undefined && jwtShopNum !== null) {
      useUserStore.getState().setShopNumber(jwtShopNum);
    }
    if (jwtShopName) {
      useUserStore.getState().setShopName(jwtShopName);
    }
  }

  // 2. Fetch fresh account info from backend API
  try {
    const res = await fetch('https://tnfl2-cb6ea45c64b3.herokuapp.com/services/account/getAccountInfo', {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const data = await res.json();
      const shopNumber = data.account?.shopNumber ?? data.account?.shopNo ?? data?.shopNumber ?? null;
      const shopName = data.account?.shopName ?? data?.shopName ?? null;

      if (shopNumber !== null && shopNumber !== undefined) {
        useUserStore.getState().setShopNumber(shopNumber);
      }
      if (shopName) {
        useUserStore.getState().setShopName(shopName);
      }
      return { shopNumber, shopName };
    }
  } catch (err) {
    console.error('Error fetching account info for shop number:', err);
  }

  return {
    shopNumber: useUserStore.getState().shopNumber,
    shopName: useUserStore.getState().shopName,
  };
}
