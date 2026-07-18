// GET /diagnosticos/[id]/pdf/interno — Relatório Interno em PDF (roteiro de
// execução + dimensionamento). É o documento que NÃO pode vazar: só para
// usuários autenticados (nenhum link público/assinado), marca d'água em todas
// as páginas, nome de arquivo INTERNO-* e log de quem gerou.

import { readFile } from "node:fs/promises";
import path from "node:path";
import { headers } from "next/headers";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { auth } from "@/lib/auth";
import { gerarPdfInterno } from "@/lib/diagnostico/pdf";
import { montarDocInterno } from "@/lib/diagnostico/relatorio-doc";
import { getDiagnostico, getRelatorio } from "../../queries";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return new Response("Não autorizado", { status: 401 });

  const { id } = await params;
  const diag = await getDiagnostico(id);
  if (!diag) return new Response("Diagnóstico não encontrado", { status: 404 });
  if (diag.classe == null)
    return new Response("Diagnóstico sem classe não gera relatório.", {
      status: 400,
    });

  const relatorio = await getRelatorio(diag);
  const docInterno = montarDocInterno(relatorio, new Date(), session.user.name);
  const logo = await readFile(
    path.join(process.cwd(), "public", "atrios-logo.png"),
  );
  const pdf = await gerarPdfInterno(docInterno, logo);

  await db.insert(schema.relatorioEvento).values({
    diagnosticoId: diag.id,
    userId: session.user.id,
    tipo: "interno",
  });

  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${docInterno.arquivo}"`,
    },
  });
}
