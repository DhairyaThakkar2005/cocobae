import { create } from "zustand";
import { Product } from "../db/products";

export interface CartItem {
  product: Product;
  quantity: number;
  note?: string;
  subtotal: number;
}

interface CartStore {
  items: CartItem[];
  customerName: string;
  customerPhone: string;
  orderNote: string;
  gstEnabled: boolean;
  gstPercent: number;

  setSettings: (gstEnabled: boolean, gstPercent: number) => void;
  setCustomerName: (name: string) => void;
  setCustomerPhone: (phone: string) => void;
  setOrderNote: (note: string) => void;

  addItem: (product: Product, quantity?: number, note?: string) => void;
  updateQuantity: (productId: number, delta: number) => void;
  setItemQuantity: (productId: number, quantity: number) => void;
  removeItem: (productId: number) => void;
  clearCart: () => void;

  getItemQuantity: (productId: number) => number;
  getTotalItemsCount: () => number;
  getSubtotal: () => number;
  getGstAmount: () => number;
  getGrandTotal: () => number;
}

export const useCartStore = create<CartStore>((set, get) => ({
  items: [],
  customerName: "",
  customerPhone: "",
  orderNote: "",
  gstEnabled: false,
  gstPercent: 5,

  setSettings: (gstEnabled, gstPercent) => set({ gstEnabled, gstPercent }),
  setCustomerName: (customerName) => set({ customerName }),
  setCustomerPhone: (customerPhone) => set({ customerPhone }),
  setOrderNote: (orderNote) => set({ orderNote }),

  addItem: (product, quantity = 1, note = "") => {
    set((state) => {
      const existingIndex = state.items.findIndex(
        (i) => i.product.id === product.id,
      );

      if (existingIndex > -1) {
        const updated = [...state.items];
        const current = updated[existingIndex];
        const newQty = current.quantity + quantity;
        updated[existingIndex] = {
          ...current,
          quantity: newQty,
          note: note || current.note,
          subtotal: newQty * product.price,
        };
        return { items: updated };
      }

      return {
        items: [
          ...state.items,
          {
            product,
            quantity,
            note,
            subtotal: quantity * product.price,
          },
        ],
      };
    });
  },

  updateQuantity: (productId, delta) => {
    set((state) => {
      const items = state.items
        .map((item) => {
          if (item.product.id === productId) {
            const newQty = item.quantity + delta;
            return newQty > 0
              ? {
                  ...item,
                  quantity: newQty,
                  subtotal: newQty * item.product.price,
                }
              : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[];

      return { items };
    });
  },

  setItemQuantity: (productId, quantity) => {
    set((state) => {
      if (quantity <= 0) {
        return { items: state.items.filter((i) => i.product.id !== productId) };
      }
      return {
        items: state.items.map((item) => {
          if (item.product.id === productId) {
            return {
              ...item,
              quantity,
              subtotal: quantity * item.product.price,
            };
          }
          return item;
        }),
      };
    });
  },

  removeItem: (productId) => {
    set((state) => ({
      items: state.items.filter((i) => i.product.id !== productId),
    }));
  },

  clearCart: () => {
    set({ items: [], customerName: "", customerPhone: "", orderNote: "" });
  },

  getItemQuantity: (productId) => {
    const item = get().items.find((i) => i.product.id === productId);
    return item ? item.quantity : 0;
  },

  getTotalItemsCount: () => {
    return get().items.reduce((sum, item) => sum + item.quantity, 0);
  },

  getSubtotal: () => {
    return get().items.reduce((sum, item) => sum + item.subtotal, 0);
  },

  getGstAmount: () => {
    const { gstEnabled, gstPercent } = get();
    if (!gstEnabled) return 0;
    const subtotal = get().getSubtotal();
    return Math.round((subtotal * gstPercent) / 100);
  },

  getGrandTotal: () => {
    return get().getSubtotal() + get().getGstAmount();
  },
}));
