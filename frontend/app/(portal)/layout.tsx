import { AppShell } from "@/components/layout/AppShell";
import { PreviewProvider } from "@/lib/context/PreviewContext";

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <PreviewProvider>
      <AppShell>{children}</AppShell>
    </PreviewProvider>
  );
}
