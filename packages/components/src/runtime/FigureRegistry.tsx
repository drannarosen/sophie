import type { ReactNode } from "react";
import { createContext, useContext } from "react";

export interface FigureEntry {
  name: string;
  src: string;
  alt: string;
  caption?: string;
  credit?: string;
}

export type FigureRegistry = Record<string, FigureEntry>;

const FigureRegistryContext = createContext<FigureRegistry>({});

export function FigureRegistryProvider({
  registry,
  children,
}: {
  registry: FigureRegistry;
  children: ReactNode;
}) {
  return (
    <FigureRegistryContext.Provider value={registry}>
      {children}
    </FigureRegistryContext.Provider>
  );
}

export function useFigureRegistry(): FigureRegistry {
  return useContext(FigureRegistryContext);
}
