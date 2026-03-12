"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/context/AuthContext";
import { AppShell } from "@/components/layout/AppShell";
import { FullPageSpinner } from "@/components/ui/Spinner";

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [user, loading, router]);

  if (loading) return <FullPageSpinner />;
  if (!user)   return null;

  return <AppShell>{children}</AppShell>;
}
