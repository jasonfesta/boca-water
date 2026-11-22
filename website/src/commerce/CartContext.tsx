import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';
import { ShoppingBag } from 'lucide-react';
import { PACKS, type PackId } from './catalog';

interface CartContextValue {
  selectedPackId: PackId;
  isDrawerOpen: boolean;
  setSelectedPackId: (packId: PackId) => void;
  openDrawer: () => void;
  closeDrawer: () => void;
  toggleDrawer: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [selectedPackId, setSelectedPackId] = useState<PackId>('6-pack');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const openDrawer = useCallback(() => setIsDrawerOpen(true), []);
  const closeDrawer = useCallback(() => setIsDrawerOpen(false), []);
  const toggleDrawer = useCallback(() => setIsDrawerOpen((v) => !v), []);

  const value = useMemo<CartContextValue>(
    () => ({
      selectedPackId,
      isDrawerOpen,
      setSelectedPackId,
      openDrawer,
      closeDrawer,
      toggleDrawer,
    }),
    [selectedPackId, isDrawerOpen, openDrawer, closeDrawer, toggleDrawer],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error('useCart must be used within a <CartProvider>');
  }
  return ctx;
}

export function CartTriggerButton({ className = '' }: { className?: string }) {
  const { selectedPackId, toggleDrawer } = useCart();
  const pack = PACKS[selectedPackId];

  return (
    <button
      type="button"
      onClick={toggleDrawer}
      aria-label={`Order Boca Sparkling Water (${pack.shortName})`}
      className={`group inline-flex items-center gap-2 rounded-full bg-[#f6f5f1]/[0.07] hover:bg-[#f6f5f1]/[0.13] active:scale-[0.98] px-4 pt-[10px] pb-[8px] text-[13px] font-medium text-[#f6f5f1] transition-all duration-200 whitespace-nowrap cursor-pointer ${className}`}
    >
      <ShoppingBag className="h-3.5 w-3.5 -mt-[2px] text-[#f6f5f1]/80 group-hover:text-[#f6f5f1] transition-colors" />
      <span>Order</span>
    </button>
  );
}
