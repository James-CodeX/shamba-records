"use client";

import { Toaster } from "@my-better-t-app/ui/components/sonner";
import { TooltipProvider } from "@my-better-t-app/ui/components/tooltip";
import { ThemeProvider as NextThemesProvider } from "next-themes";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <TooltipProvider>
        {children}
        <Toaster richColors />
      </TooltipProvider>
    </NextThemesProvider>
  );
}
