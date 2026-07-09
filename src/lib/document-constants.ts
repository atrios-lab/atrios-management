// Catálogos e helpers puros da aba Documentos (tipos, cores, tamanhos).
// Fonte visual: mockup "Átrios Documentos" (telas 17–19).

import type { DocumentType } from "@/db/schema";

/** Cor e wash de fundo por tipo — mesmos hex do mockup (= tokens do tema). */
export const DOCUMENT_TYPES: Record<
  DocumentType,
  { label: string; color: string; bg: string }
> = {
  doc: { label: "Doc", color: "#8b93ec", bg: "rgba(94,106,210,0.15)" },
  file: { label: "Arquivo", color: "#e2b13c", bg: "rgba(226,177,60,0.12)" },
  link: { label: "Link", color: "#4cb782", bg: "rgba(76,183,130,0.12)" },
};

export const MAX_FILE_BYTES = 25 * 1024 * 1024;

/** PDF, planilha ou imagem — validado no client, no token do Blob e na action. */
export const ACCEPTED_FILE_TYPES = [
  "application/pdf",
  "text/csv",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.oasis.opendocument.spreadsheet",
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
];

export function isAcceptedFileType(mime: string): boolean {
  return ACCEPTED_FILE_TYPES.includes(mime);
}

/** Tamanho pt-BR: "830 KB", "2,4 MB". */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${Math.round(kb)} KB`;
  return `${(kb / 1024).toFixed(1).replace(".", ",")} MB`;
}

/** Badge da linha de arquivo: "PDF · 2,4 MB". */
export function fileBadgeLabel(fileName: string, fileSize: number): string {
  const ext = fileName.includes(".")
    ? (fileName.split(".").pop() ?? "").toUpperCase()
    : "ARQUIVO";
  return `${ext} · ${formatFileSize(fileSize)}`;
}

/** Domínio exibido no badge de link: "notion.so". */
export function domainOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/** Iniciais para o Avatar (mesma regra do cofre). */
export function initialsOf(name: string): string {
  return (
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0])
      .join("")
      .toUpperCase() || "?"
  );
}
