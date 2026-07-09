"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import {
  ChainLinkIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  CloseIcon,
  DocPageIcon,
  FolderIcon,
  PaperclipIcon,
  PlusIcon,
  SearchIcon,
} from "@/components/icons";
import { Avatar, Button, IconButton, Input } from "@/components/ui";
import type { DocumentType } from "@/db/schema";
import { DOCUMENT_TYPES, initialsOf } from "@/lib/document-constants";
import { createFolder } from "./actions";
import { NewDocumentModal } from "./new-document-modal";
import type { DocumentRowData, FolderGroupData } from "./queries";

const TYPE_ICONS: Record<DocumentType, React.ReactNode> = {
  doc: <DocPageIcon />,
  file: <PaperclipIcon />,
  link: <ChainLinkIcon />,
};

export function DocumentsTab({
  productId,
  productCode,
  productName,
  groups,
}: {
  productId: string;
  productCode: string;
  productName: string;
  groups: FolderGroupData[];
}) {
  const [query, setQuery] = useState("");
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(new Set());
  const [modal, setModal] = useState<"doc" | "folder" | null>(null);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return groups;
    // Busca por título mantendo o agrupamento; pastas sem match somem.
    return groups
      .map((g) => ({
        ...g,
        docs: g.docs.filter((d) => d.title.toLowerCase().includes(q)),
      }))
      .filter((g) => g.docs.length > 0);
  }, [groups, query]);

  const isEmpty = groups.length === 0;

  const toggleGroup = (id: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3.5 px-[22px] pb-[22px] pt-4">
      {isEmpty ? (
        <EmptyState
          productName={productName}
          onNewDoc={() => setModal("doc")}
          onNewFolder={() => setModal("folder")}
        />
      ) : (
        <>
          <div className="flex shrink-0 items-center gap-2.5">
            <div className="flex h-8 w-[260px] items-center gap-2 rounded-field border border-[rgba(255,255,255,0.09)] bg-surface-1 px-[11px]">
              <span className="text-fg-8">
                <SearchIcon />
              </span>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar documento…"
                className="min-w-0 flex-1 bg-transparent text-[12.5px] text-fg-2 outline-none placeholder:text-fg-8"
              />
            </div>
            <div className="ml-auto" />
            <Button
              variant="secondary"
              icon={<FolderIcon size={13} />}
              onClick={() => setModal("folder")}
            >
              Nova pasta
            </Button>
            <Button icon={<PlusIcon />} onClick={() => setModal("doc")}>
              Novo documento
            </Button>
          </div>

          <div className="min-h-0 flex-1 overflow-auto rounded-[10px] border border-[rgba(255,255,255,0.07)] bg-surface-1">
            {shown.map((g) => (
              <div key={g.id}>
                <button
                  type="button"
                  onClick={() => toggleGroup(g.id)}
                  className="flex w-full cursor-pointer items-center gap-[9px] border-b border-line-subtle bg-surface-4 px-4 py-[9px] text-left"
                >
                  <span
                    className="text-fg-7 transition-transform duration-200"
                    style={{
                      transform: collapsed.has(g.id)
                        ? "rotate(-90deg)"
                        : "none",
                    }}
                  >
                    <ChevronDownIcon size={12} />
                  </span>
                  <span className="text-fg-6">
                    <FolderIcon />
                  </span>
                  <span className="text-[12.5px] font-semibold text-fg-3">
                    {g.name}
                  </span>
                  <span className="rounded-pill bg-white/[0.06] px-[7px] text-[11px] font-semibold text-fg-6">
                    {g.docs.length}
                  </span>
                </button>
                {!collapsed.has(g.id) &&
                  g.docs.map((row) => (
                    <DocumentRowItem
                      key={row.id}
                      row={row}
                      productCode={productCode}
                    />
                  ))}
              </div>
            ))}
            {shown.length === 0 && (
              <div className="px-4 py-8 text-center text-[12.5px] text-fg-8">
                Nenhum documento encontrado.
              </div>
            )}
          </div>
        </>
      )}

      {modal === "doc" && (
        <NewDocumentModal
          productId={productId}
          productCode={productCode}
          folders={groups.map((g) => ({ id: g.id, name: g.name }))}
          onClose={() => setModal(null)}
        />
      )}
      {modal === "folder" && (
        <NewFolderModal productId={productId} onClose={() => setModal(null)} />
      )}
    </div>
  );
}

/* ---- Linha de documento (17a) --------------------------------------------- */

function DocumentRowItem({
  row,
  productCode,
}: {
  row: DocumentRowData;
  productCode: string;
}) {
  const t = DOCUMENT_TYPES[row.type];
  const inner = (
    <>
      <span
        className="flex size-[26px] shrink-0 items-center justify-center rounded-btn"
        style={{ background: t.bg, color: t.color }}
      >
        {TYPE_ICONS[row.type]}
      </span>
      <span className="w-[250px] shrink-0 truncate text-[13px] font-medium text-fg-2">
        {row.title}
      </span>
      <span className="inline-flex shrink-0 items-center gap-1.5 rounded-chip border border-line bg-white/[0.04] px-[7px] py-0.5 text-[11px] text-fg-5">
        <span
          className="size-1.5 rounded-full"
          style={{ background: t.color }}
        />
        {row.badge}
      </span>
      <span className="flex-1" />
      <span className="w-[170px] shrink-0 truncate text-right text-[11.5px] text-fg-9">
        {row.updatedLabel}
      </span>
      <Avatar size={20} initials={initialsOf(row.updatedByName ?? "—")} />
      <span className="shrink-0 text-fg-9">
        <ChevronRightIcon size={14} />
      </span>
    </>
  );

  const rowClass =
    "flex w-full cursor-pointer items-center gap-3 border-b border-[rgba(255,255,255,0.035)] px-4 py-[9px] transition-colors duration-200 hover:bg-white/[0.022]";

  // doc → leitor · file → preview/download · link → nova aba
  if (row.type === "doc") {
    return (
      <Link
        href={`/produtos/${productCode}/documentos/${row.id}`}
        className={rowClass}
      >
        {inner}
      </Link>
    );
  }
  const href = row.type === "file" ? row.fileUrl : row.url;
  return (
    <a
      href={href ?? "#"}
      target="_blank"
      rel="noopener noreferrer"
      className={rowClass}
    >
      {inner}
    </a>
  );
}

/* ---- Estado vazio (17b) ---------------------------------------------------- */

function EmptyState({
  productName,
  onNewDoc,
  onNewFolder,
}: {
  productName: string;
  onNewDoc: () => void;
  onNewFolder: () => void;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center text-center">
      <div className="mb-[18px] flex size-[46px] items-center justify-center rounded-[12px] border border-primary/25 bg-primary/10 text-primary-ink">
        <DocPageIcon size={20} />
      </div>
      <span className="mb-[7px] text-[15.5px] font-semibold tracking-[-0.01em] text-fg-1">
        Nenhum documento ainda
      </span>
      <p className="mb-5 max-w-[360px] text-[13px] leading-[1.55] text-fg-7">
        Guarde o modelo de negócio, contratos e specs do {productName} —
        escritos aqui, enviados como arquivo ou como link externo.
      </p>
      <div className="flex items-center gap-2.5">
        <Button icon={<PlusIcon />} onClick={onNewDoc}>
          Novo documento
        </Button>
        <Button variant="secondary" onClick={onNewFolder}>
          Nova pasta
        </Button>
      </div>
    </div>
  );
}

/* ---- Mini-modal "Nova pasta" ------------------------------------------------ */

export function NewFolderModal({
  productId,
  onClose,
}: {
  productId: string;
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const submit = () => {
    if (pending) return;
    startTransition(async () => {
      const result = await createFolder(productId, name);
      if (result.error) {
        setError(result.error);
        return;
      }
      onClose();
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(4,5,7,0.62)]">
      <div className="w-[380px] overflow-hidden rounded-panel border border-white/10 bg-surface-card shadow-modal">
        <div className="flex items-center border-b border-line px-[18px] py-4">
          <span className="text-[14.5px] font-semibold text-fg-1">
            Nova pasta
          </span>
          <IconButton aria-label="Fechar" className="ml-auto" onClick={onClose}>
            <CloseIcon size={16} />
          </IconButton>
        </div>
        <div className="flex flex-col gap-[7px] p-[18px]">
          <label htmlFor="nf-name" className="text-xs font-medium text-fg-5">
            Nome da pasta
          </label>
          <Input
            id="nf-name"
            size="lg"
            autoFocus
            value={name}
            placeholder="Estratégia, Contratos, Specs…"
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
          />
          {error && (
            <p className="text-xs leading-[1.4] text-danger">{error}</p>
          )}
        </div>
        <div className="flex justify-end gap-[9px] border-t border-line px-[18px] py-3.5">
          <Button variant="secondary" size="lg" onClick={onClose}>
            Cancelar
          </Button>
          <Button size="lg" disabled={pending || !name.trim()} onClick={submit}>
            {pending ? "Criando…" : "Criar pasta"}
          </Button>
        </div>
      </div>
    </div>
  );
}
