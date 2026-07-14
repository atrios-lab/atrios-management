import { desc, eq } from "drizzle-orm";
import { headers } from "next/headers";
import Link from "next/link";
import { ArrowLeftIcon } from "@/components/icons";
import { RealtimeRefresh } from "@/components/realtime-refresh";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { auth } from "@/lib/auth";
import { formatRelative } from "@/lib/product-constants";
import { channels } from "@/lib/realtime/types";

// Leads do pré-cadastro público (/diagnostico) — status "novo", ainda sem
// classe. Fica separado da listagem principal (só diagnósticos de verdade)
// porque o lead ainda não passou pela call nem tem roteiro aplicável.

export default async function LeadsPage() {
  const session = await auth.api.getSession({ headers: await headers() });

  const leads = await db.query.diagnostico.findMany({
    where: eq(schema.diagnostico.statusFunil, "novo"),
    orderBy: desc(schema.diagnostico.createdAt),
  });

  return (
    <>
      <header className="flex h-[53px] shrink-0 items-center gap-[9px] border-b border-line px-5">
        <Link
          href="/diagnosticos"
          className="flex items-center gap-1.5 text-xs text-fg-6 transition-colors duration-200 hover:text-fg-2"
        >
          <ArrowLeftIcon />
          Diagnósticos
        </Link>
        <span className="text-fg-9">/</span>
        <span className="text-sm font-semibold text-fg-1">Leads</span>
        <span className="text-xs text-fg-8">{leads.length}</span>
        <span className="text-xs text-fg-9">Pré-cadastro público</span>
      </header>
      <div className="flex-1 overflow-auto p-5">
        {leads.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-16 text-center">
            <span className="text-sm text-fg-5">Nenhum lead pendente.</span>
            <span className="text-xs text-fg-8">
              Novos pré-cadastros da landing pública aparecem aqui.
            </span>
          </div>
        )}
        {leads.length > 0 && (
          <div className="overflow-hidden rounded-panel border border-line">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-line text-[11px] uppercase tracking-[0.05em] text-fg-8">
                  <th className="px-4 py-2.5 font-medium">Serventia</th>
                  <th className="px-3 py-2.5 font-medium">Contato</th>
                  <th className="px-3 py-2.5 font-medium">Município / UF</th>
                  <th className="px-3 py-2.5 font-medium">Atribuição</th>
                  <th className="px-3 py-2.5 font-medium">Recebido</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((lead) => (
                  <tr
                    key={lead.id}
                    className="border-b border-line-subtle last:border-b-0 hover:bg-white/[0.02]"
                  >
                    <td className="px-4 py-2.5">
                      <Link
                        href={`/diagnosticos/${lead.id}`}
                        className="text-[13px] font-medium text-fg-2 hover:text-fg-1"
                      >
                        {lead.serventia}
                      </Link>
                    </td>
                    <td className="px-3 py-2.5 text-[12.5px] text-fg-5">
                      {lead.contatoNome}
                      <div className="text-[11px] text-fg-8">
                        {lead.contatoWhatsapp ?? lead.contatoEmail ?? "—"}
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-[12.5px] text-fg-5">
                      {lead.municipio
                        ? `${lead.municipio} / ${lead.uf}`
                        : lead.uf}
                    </td>
                    <td className="px-3 py-2.5 text-[12.5px] text-fg-7">
                      {lead.atribuicao ?? "—"}
                    </td>
                    <td className="px-3 py-2.5 text-[12px] text-fg-8">
                      {formatRelative(lead.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <RealtimeRefresh
        channel={channels.diagnosticos}
        selfId={session?.user.id}
      />
    </>
  );
}
