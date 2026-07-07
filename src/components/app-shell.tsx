import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AppSidebar } from "@/components/app-sidebar";
import { auth } from "@/lib/auth";

/** Shell autenticado: sessão verificada no server (o proxy é só UX). */
export async function AppShell({ children }: { children: React.ReactNode }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");
  const user = session.user as typeof session.user & { role?: string };
  return (
    <div className="flex h-dvh bg-surface-0">
      <AppSidebar
        user={{
          name: user.name,
          email: user.email,
          role: user.role === "admin" ? "admin" : "member",
        }}
      />
      <div className="flex min-w-0 flex-1 flex-col">{children}</div>
    </div>
  );
}
