import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { access, card } from "@/db/schema";
import { formatStageDate, STAGES } from "@/lib/product-constants";
import { ProductHeader } from "../product-header";
import { DocumentsTab } from "./documents-tab";
import { documentGroupsForProduct } from "./queries";

export default async function ProductDocumentsPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const product = await db.query.product.findFirst({
    where: (p, { eq: eqp }) => eqp(p.code, code.toUpperCase()),
    with: {
      repos: true,
      stageEvents: { orderBy: (e, { asc }) => asc(e.enteredAt) },
    },
  });
  if (!product) notFound();

  const [groups, cardCount, accessCount] = await Promise.all([
    documentGroupsForProduct(product.id),
    db.$count(card, eq(card.productId, product.id)),
    db.$count(access, eq(access.productId, product.id)),
  ]);
  const documentCount = groups.reduce((n, g) => n + g.docs.length, 0);

  // Data mais recente em que o produto entrou em cada etapa.
  const stageDates: (string | null)[] = STAGES.map(() => null);
  for (const e of product.stageEvents) {
    if (e.stage >= 0 && e.stage < stageDates.length)
      stageDates[e.stage] = formatStageDate(e.enteredAt);
  }

  return (
    <>
      <ProductHeader
        name={product.name}
        code={product.code}
        stage={product.stage}
        cardCount={cardCount}
        accessCount={accessCount}
        documentCount={documentCount}
        active="documentos"
        context={{
          id: product.id,
          stage: product.stage,
          description: product.description,
          longDescription: product.longDescription,
          stageDates,
          repos: product.repos.map((r) => ({
            id: r.id,
            label: r.label,
            name: r.name,
          })),
        }}
      />
      <DocumentsTab
        productId={product.id}
        productCode={product.code}
        productName={product.name}
        groups={groups}
      />
    </>
  );
}
