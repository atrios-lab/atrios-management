import { desc, isNull } from "drizzle-orm";
import { headers } from "next/headers";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { auth } from "@/lib/auth";
import { TeamView } from "./team-view";

export default async function TimePage() {
  // AppShell já garantiu a sessão; aqui só precisamos de id/role para a UI.
  const session = await auth.api.getSession({ headers: await headers() });
  const me = session?.user as typeof schema.user.$inferSelect | undefined;

  const [members, invites] = await Promise.all([
    db.select().from(schema.user).orderBy(schema.user.createdAt),
    db
      .select()
      .from(schema.invite)
      .where(isNull(schema.invite.acceptedAt))
      .orderBy(desc(schema.invite.createdAt)),
  ]);

  const now = Date.now();
  return (
    <TeamView
      meId={me?.id ?? ""}
      isAdmin={me?.role === "admin"}
      members={members.map((m) => ({
        id: m.id,
        name: m.name,
        email: m.email,
        role: m.role === "admin" ? ("admin" as const) : ("member" as const),
      }))}
      invites={invites.map((i) => ({
        id: i.id,
        email: i.email,
        role: i.role === "admin" ? ("admin" as const) : ("member" as const),
        expired: i.expiresAt.getTime() < now,
      }))}
    />
  );
}
