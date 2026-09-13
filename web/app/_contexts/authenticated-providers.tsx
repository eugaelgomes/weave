"use client";

import React from "react";
import { ModulesProvider } from "./modules-context";

// Dados de domínio são carregados nos layouts dos respectivos módulos.
// Aqui permanecem somente dados derivados da sessão, sem chamadas à API.
const composeProviders = (...providers: React.ElementType[]) =>
  providers.reduce((AccumulatedProviders, CurrentProvider) => {
    const ComposedProviders = ({ children }: { children: React.ReactNode }) => (
      <AccumulatedProviders>
        <CurrentProvider>{children}</CurrentProvider>
      </AccumulatedProviders>
    );
    (ComposedProviders as any).displayName =
      `Composed(${(CurrentProvider as any).displayName || (CurrentProvider as any).name || "Provider"})`;
    return ComposedProviders;
  });

const GlobalProviders = composeProviders(ModulesProvider);

export function AuthenticatedProviders({ children }: { children: React.ReactNode }) {
  return <GlobalProviders>{children}</GlobalProviders>;
}
