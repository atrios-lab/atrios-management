import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { VoceView } from "./voce-view";

export default async function VocePage() {
  // AppShell já garantiu a sessão; aqui só precisamos dos dados do perfil.
  const session = await auth.api.getSession({ headers: await headers() });
  const user = session?.user as
    | { name: string; email: string; role?: string }
    | undefined;

  return (
    <VoceView
      name={user?.name ?? "—"}
      email={user?.email ?? ""}
      isAdmin={user?.role === "admin"}
    />
  );
}
