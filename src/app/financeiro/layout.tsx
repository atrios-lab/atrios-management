import { AppShell } from "@/components/app-shell";

export default function FinanceiroLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <AppShell>{children}</AppShell>;
}
