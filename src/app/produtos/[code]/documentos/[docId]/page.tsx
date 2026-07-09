import { notFound, redirect } from "next/navigation";
import type { Components } from "react-markdown";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { db } from "@/db";
import { formatRelative, formatStageDate } from "@/lib/product-constants";
import { DocumentReader } from "./document-reader";

/** Estilos do corpo do leitor (19) mapeados nos tokens do tema. */
const heading =
  "mb-2.5 mt-7 text-[15.5px] font-semibold tracking-[-0.01em] text-fg-1 first:mt-0";
const mdComponents: Components = {
  h1: ({ node: _, ...props }) => <h3 className={heading} {...props} />,
  h2: ({ node: _, ...props }) => <h3 className={heading} {...props} />,
  h3: ({ node: _, ...props }) => <h3 className={heading} {...props} />,
  p: ({ node: _, ...props }) => (
    <p className="mb-7 text-sm leading-[1.7] text-fg-4" {...props} />
  ),
  ul: ({ node: _, ...props }) => (
    <ul
      className="mb-7 flex list-disc flex-col gap-1.5 pl-5 text-sm leading-[1.7] text-fg-4"
      {...props}
    />
  ),
  ol: ({ node: _, ...props }) => (
    <ol
      className="mb-7 flex list-decimal flex-col gap-1.5 pl-5 text-sm leading-[1.7] text-fg-4"
      {...props}
    />
  ),
  strong: ({ node: _, ...props }) => (
    <strong className="font-semibold text-fg-1" {...props} />
  ),
  a: ({ node: _, ...props }) => (
    <a
      className="text-primary-ink hover:underline"
      target="_blank"
      rel="noopener noreferrer"
      {...props}
    />
  ),
  code: ({ node: _, ...props }) => (
    <code
      className="rounded-id bg-white/[0.06] px-1 py-px font-mono text-[12.5px] text-fg-3"
      {...props}
    />
  ),
  blockquote: ({ node: _, ...props }) => (
    <blockquote
      className="mb-7 border-l-2 border-line-strong pl-4 text-sm leading-[1.7] text-fg-5"
      {...props}
    />
  ),
};

export default async function DocumentReaderPage({
  params,
}: {
  params: Promise<{ code: string; docId: string }>;
}) {
  const { code, docId } = await params;
  const doc = await db.query.document.findFirst({
    where: (d, { eq }) => eq(d.id, docId),
    with: {
      product: { columns: { id: true, name: true, code: true } },
      folder: { columns: { id: true, name: true } },
      createdBy: { columns: { name: true } },
      updatedBy: { columns: { name: true } },
      events: {
        with: { user: { columns: { name: true } } },
        orderBy: (e, { desc }) => desc(e.createdAt),
      },
    },
  });
  if (!doc || doc.product.code !== code.toUpperCase()) notFound();
  // Arquivos abrem preview/download e links abrem em nova aba — leitor é só de doc.
  if (doc.type !== "doc") redirect(`/produtos/${doc.product.code}/documentos`);

  const folders = await db.query.documentFolder.findMany({
    where: (f, { eq }) => eq(f.productId, doc.productId),
    orderBy: (f, { asc }) => asc(f.name),
    columns: { id: true, name: true },
  });

  const eventLabel = (action: string, detail: string | null) =>
    action === "created"
      ? "criou o documento"
      : action === "edited"
        ? "editou o documento"
        : `moveu para ${detail ?? "outra pasta"}`;

  return (
    <DocumentReader
      productId={doc.productId}
      productCode={doc.product.code}
      productName={doc.product.name}
      folders={folders}
      doc={{
        id: doc.id,
        title: doc.title,
        body: doc.body ?? "",
        folderId: doc.folderId,
        folderName: doc.folder.name,
        createdByName: doc.createdBy?.name ?? null,
        createdAtLabel: formatStageDate(doc.createdAt),
        updatedByName: doc.updatedBy?.name ?? null,
        updatedRelative: formatRelative(doc.updatedAt),
        events: doc.events.map((e) => ({
          id: e.id,
          who: e.user?.name ?? "Alguém",
          label: eventLabel(e.action, e.detail),
          when: formatRelative(e.createdAt),
        })),
      }}
    >
      <Markdown remarkPlugins={[remarkGfm]} components={mdComponents}>
        {doc.body ?? ""}
      </Markdown>
    </DocumentReader>
  );
}
