"use client";
import { useEffect } from "react";
import { useThemeStore } from "@/lib/store";
import { Toaster } from "sonner";
import "./globals.css";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const { theme } = useThemeStore();

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <title>AgencyERP - Marketing Agency Management</title>
        <meta name="description" content="Complete ERP system for marketing agencies. CRM, Projects, Tasks, HR, Payroll, and Finance." />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="min-h-screen antialiased">
        {children}
        <Toaster
          position="top-right"
          richColors
          closeButton
          duration={4000}
          toastOptions={{
            classNames: {
              error: "!duration-6000",
            },
          }}
        />
      </body>
    </html>
  );
}
