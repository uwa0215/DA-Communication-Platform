"use client";

import React, { createContext, useContext, useState } from "react";
import { usePathname } from "next/navigation";
import { useEffect } from "react";

type UIContextType = {
  isMobileSidebarOpen: boolean;
  setMobileSidebarOpen: (open: boolean) => void;
  toggleMobileSidebar: () => void;
};

const UIContext = createContext<UIContextType | undefined>(undefined);

export function UIProvider({ children }: { children: React.ReactNode }) {
  const [isMobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const pathname = usePathname();

  const toggleMobileSidebar = () => {
    setMobileSidebarOpen(prev => !prev);
  };

  // Close sidebar automatically on route change (for mobile navigation)
  useEffect(() => {
    setMobileSidebarOpen(false);
  }, [pathname]);

  return (
    <UIContext.Provider value={{ isMobileSidebarOpen, setMobileSidebarOpen, toggleMobileSidebar }}>
      {children}
    </UIContext.Provider>
  );
}

export function useUI() {
  const context = useContext(UIContext);
  if (context === undefined) {
    throw new Error("useUI must be used within a UIProvider");
  }
  return context;
}
