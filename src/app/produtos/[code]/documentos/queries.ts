// Consultas da aba Documentos — mapeiam pastas + documentos para os grupos
// exibidos na lista (17a), com rótulos prontos para a UI.

import { eq } from "drizzle-orm";
import { db } from "@/db";
import type { DocumentType } from "@/db/schema";
import { document, documentFolder } from "@/db/schema";
import { domainOf, fileBadgeLabel } from "@/lib/document-constants";
import { formatRelative } from "@/lib/product-constants";

export interface DocumentRowData {
  id: string;
  type: DocumentType;
  title: string;
  /** Badge da linha: "Doc" | "PDF · 2,4 MB" | "notion.so". */
  badge: string;
  updatedLabel: string;
  updatedByName: string | null;
  fileUrl: string | null;
  url: string | null;
  folderId: string;
}

export interface FolderGroupData {
  id: string;
  name: string;
  docs: DocumentRowData[];
}

export async function documentGroupsForProduct(
  productId: string,
): Promise<FolderGroupData[]> {
  const [folders, docs] = await Promise.all([
    db.query.documentFolder.findMany({
      where: eq(documentFolder.productId, productId),
      orderBy: (f, { asc }) => asc(f.name),
    }),
    db.query.document.findMany({
      where: eq(document.productId, productId),
      columns: {
        id: true,
        type: true,
        title: true,
        fileName: true,
        fileSize: true,
        fileUrl: true,
        url: true,
        folderId: true,
        updatedAt: true,
      },
      with: { updatedBy: { columns: { name: true } } },
      orderBy: (d, { desc }) => desc(d.updatedAt),
    }),
  ]);

  const rows: DocumentRowData[] = docs.map((d) => ({
    id: d.id,
    type: d.type,
    title: d.title,
    badge:
      d.type === "doc"
        ? "Doc"
        : d.type === "file"
          ? fileBadgeLabel(d.fileName ?? "", d.fileSize ?? 0)
          : domainOf(d.url ?? ""),
    updatedLabel: `Atualizado ${formatRelative(d.updatedAt)}`,
    updatedByName: d.updatedBy?.name ?? null,
    fileUrl: d.fileUrl,
    url: d.url,
    folderId: d.folderId,
  }));

  return folders.map((f) => ({
    id: f.id,
    name: f.name,
    docs: rows.filter((r) => r.folderId === f.id),
  }));
}
