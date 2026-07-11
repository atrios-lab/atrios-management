import { AppShell } from "@/components/app-shell";

export default function VoceLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <AppShell>{children}</AppShell>;
}
