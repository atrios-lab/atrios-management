import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AppSidebar } from "@/components/app-sidebar";
import { TabBar } from "@/components/tab-bar";
import { db } from "@/db";
import { auth } from "@/lib/auth";
import { STAGES } from "@/lib/product-constants";

/** Shell autenticado: sessão verificada no server (o proxy é só UX). */
export async function AppShell({ children }: { children: React.ReactNode }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");
  const user = session.user as typeof session.user & { role?: string };
  const products = await db.query.product.findMany({
    columns: { name: true, code: true, stage: true },
    orderBy: (p, { asc }) => asc(p.name),
  });
  return (
    <div className="flex h-dvh bg-surface-0">
      <AppSidebar
        user={{
          name: user.name,
          email: user.email,
          role: user.role === "admin" ? "admin" : "member",
        }}
        products={products.map((p) => ({
          name: p.name,
          code: p.code,
          color: STAGES[p.stage]?.color ?? STAGES[0].color,
        }))}
      />
      {/* No mobile a TabBar é fixa embaixo — o padding reserva o espaço dela. */}
      <div className="flex min-w-0 flex-1 flex-col pb-[calc(52px+env(safe-area-inset-bottom))] md:pb-0">
        {children}
      </div>
      <TabBar />
    </div>
  );
}
