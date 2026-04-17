"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore, useSidebarStore } from "@/lib/store";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { PageLoader } from "@/components/ui/loading";
import { cn } from "@/lib/utils";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { isAuthenticated, isLoading, loadUser } = useAuthStore();
  const { collapsed } = useSidebarStore();

  useEffect(() => {
    loadUser();
  }, []);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [isLoading, isAuthenticated]);

  if (isLoading) return <PageLoader />;
  if (!isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <Header />
      <main
        className={cn(
          "pt-16 min-h-screen transition-all duration-300",
          collapsed ? "pl-[72px]" : "pl-[260px]"
        )}
      >
        <div className="p-6 max-w-[1600px]">
          {children}
        </div>
      </main>
    </div>
  );
}
