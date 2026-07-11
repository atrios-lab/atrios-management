import { headers } from "next/headers";
import { RealtimeRefresh } from "@/components/realtime-refresh";
import { auth } from "@/lib/auth";
import { channels } from "@/lib/realtime/types";
import { allAccessRows, productOptions } from "./queries";
import { VaultGlobal } from "./vault-global";

export default async function CofrePage() {
  const session = await auth.api.getSession({ headers: await headers() });
  const isAdmin =
    (session?.user as { role?: string } | undefined)?.role === "admin";

  const [accesses, products] = await Promise.all([
    allAccessRows(),
    productOptions(),
  ]);

  return (
    <>
      <VaultGlobal accesses={accesses} products={products} isAdmin={isAdmin} />
      <RealtimeRefresh channel={channels.cofre} selfId={session?.user.id} />
    </>
  );
}
