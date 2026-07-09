import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { access, document } from "@/db/schema";
import { formatStageDate, STAGES } from "@/lib/product-constants";
import { ProductBoard } from "./product-board";

export default async function ProductPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const row = await db.query.product.findFirst({
    where: (p, { eq }) => eq(p.code, code.toUpperCase()),
    with: {
      repos: true,
      cards: { orderBy: (c, { desc }) => desc(c.createdAt) },
      stageEvents: { orderBy: (e, { asc }) => asc(e.enteredAt) },
    },
  });
  if (!row) notFound();

  const [accessCount, documentCount] = await Promise.all([
    db.$count(access, eq(access.productId, row.id)),
    db.$count(document, eq(document.productId, row.id)),
  ]);

  // Data mais recente em que o produto entrou em cada etapa.
  const stageDates: (string | null)[] = STAGES.map(() => null);
  for (const e of row.stageEvents) {
    if (e.stage >= 0 && e.stage < stageDates.length)
      stageDates[e.stage] = formatStageDate(e.enteredAt);
  }

  return (
    <ProductBoard
      accessCount={accessCount}
      documentCount={documentCount}
      product={{
        id: row.id,
        name: row.name,
        code: row.code,
        stage: row.stage,
        description: row.description,
        longDescription: row.longDescription,
        stageDates,
        repos: row.repos.map((r) => ({
          id: r.id,
          label: r.label,
          name: r.name,
        })),
      }}
      cards={row.cards.map((c) => ({
        id: c.id,
        seq: c.seq,
        title: c.title,
        description: c.description,
        status: c.status,
        repoId: c.repoId,
        prNumber: c.prNumber,
        prUrl: c.prUrl,
        auto: c.auto,
      }))}
    />
  );
}
