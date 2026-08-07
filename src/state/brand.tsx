/**
 * Brand kit context (task 09): loads "Mein Stil" from IndexedDB once and
 * exposes it app-wide (Anpassen palettes, logo offer, brand sheet).
 */
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { type BrandKit, loadBrandKit, saveBrandKit } from "../lib/brandStore";

const BrandContext = createContext<{
  kit: BrandKit;
  update: (kit: BrandKit) => void;
} | null>(null);

export function BrandProvider({ children }: { children: ReactNode }) {
  const [kit, setKit] = useState<BrandKit>({ colors: [] });

  useEffect(() => {
    void loadBrandKit().then(setKit);
  }, []);

  const update = useCallback((next: BrandKit) => {
    setKit(next);
    void saveBrandKit(next).catch(() => {
      // Storage full/unavailable — the in-memory kit still works this session.
    });
  }, []);

  return (
    <BrandContext.Provider value={{ kit, update }}>
      {children}
    </BrandContext.Provider>
  );
}

export function useBrand() {
  const context = useContext(BrandContext);
  if (!context) throw new Error("useBrand außerhalb des BrandProvider");
  return context;
}
