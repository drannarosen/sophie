import type { ReactNode } from "react";
import { createContext, useContext } from "react";

export interface SophieConfig {
  course: string;
  chapter: string;
}

const SophieConfigContext = createContext<SophieConfig | null>(null);

export function SophieConfigProvider({
  course,
  chapter,
  children,
}: SophieConfig & { children: ReactNode }) {
  return (
    <SophieConfigContext.Provider value={{ course, chapter }}>
      {children}
    </SophieConfigContext.Provider>
  );
}

export function useSophieConfig(): SophieConfig {
  const ctx = useContext(SophieConfigContext);
  if (ctx === null) {
    throw new Error(
      "useSophieConfig must be used inside <SophieConfigProvider>. @sophie/astro normally wraps each chapter render."
    );
  }
  return ctx;
}
