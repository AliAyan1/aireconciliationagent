"use client";

import { ThemeProvider } from "next-themes";
import { Toaster } from "react-hot-toast";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="data-theme"
      defaultTheme="dark"
      enableSystem={false}
      storageKey="hisaabai-theme"
    >
      {children}
      <Toaster
        position="bottom-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: "var(--bg-elevated)",
            color: "var(--text-primary)",
            border: "1px solid var(--border-hover)",
            fontSize: "14px",
          },
          success: {
            iconTheme: {
              primary: "var(--success)",
              secondary: "var(--bg-elevated)",
            },
          },
          error: {
            iconTheme: {
              primary: "var(--danger)",
              secondary: "var(--bg-elevated)",
            },
          },
        }}
      />
    </ThemeProvider>
  );
}
