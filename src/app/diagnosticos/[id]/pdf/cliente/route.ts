// GET /diagnosticos/[id]/pdf/cliente — Relatório do Cliente em PDF, gerado no
// servidor. É o documento entregue à serventia (e-mail/WhatsApp): diz o que
// falta e o que isso trava, NUNCA o como fazer (a regra editorial vive em
// relatorio-doc.ts e é protegida por teste automatizado).

import { readFile } from "node:fs/promises";
import path from "node:path";
import { headers } from "next/headers";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { auth } from "@/lib/auth";
import { gerarPdfCliente } from "@/lib/diagnostico/pdf";
import { montarDocCliente } from "@/lib/diagnostico/relatorio-doc";
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
  const docCliente = montarDocCliente(relatorio, new Date());
  const logo = await readFile(
    path.join(process.cwd(), "public", "atrios-logo.png"),
  );
  const pdf = await gerarPdfCliente(docCliente, logo);

  await db.insert(schema.relatorioEvento).values({
    diagnosticoId: diag.id,
    userId: session.user.id,
    tipo: "cliente",
  });

  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${docCliente.arquivo}"`,
    },
  });
}
