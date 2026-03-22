"use client";

import { createContext, useContext } from "react";
import type { AgencyRow } from "@/types/database";

interface AgencyPortalContextValue {
  agency: AgencyRow;
}

const AgencyPortalContext = createContext<AgencyPortalContextValue | null>(null);

export function AgencyPortalProvider({
  agency,
  children,
}: {
  agency: AgencyRow;
  children: React.ReactNode;
}) {
  return (
    <AgencyPortalContext.Provider value={{ agency }}>
      {children}
    </AgencyPortalContext.Provider>
  );
}

export function useAgencyPortal(): AgencyPortalContextValue {
  const ctx = useContext(AgencyPortalContext);
  if (!ctx) {
    throw new Error("useAgencyPortal must be used inside AgencyPortalProvider");
  }
  return ctx;
}
