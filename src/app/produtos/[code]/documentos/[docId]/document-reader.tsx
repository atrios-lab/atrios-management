"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  type ReactNode,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";
import {
  ChevronRightIcon,
  CloseIcon,
  DotsIcon,
  FolderIcon,
} from "@/components/icons";
import { Avatar, Button, IconButton, Input } from "@/components/ui";
import { cn } from "@/lib/cn";
import { initialsOf } from "@/lib/document-constants";
import {
  deleteDocument,
  moveDocument,
  renameDocument,
  updateDocument,
} from "../actions";
import {
  type FolderOption,
  FolderSelect,
  MarkdownEditor,
} from "../new-document-modal";

export interface ReaderDoc {
  id: string;
  title: string;
  body: string;
  folderId: string;
  folderName: string;
  createdByName: string | null;
  createdAtLabel: string;
  updatedByName: string | null;
  updatedRelative: string;
  events: { id: string; who: string; label: string; when: string }[];
}

const sectionLabel =
  "text-[11px] font-semibold uppercase tracking-[0.05em] text-fg-8";

export function DocumentReader({
  productId,
  productCode,
  productName,
  folders,
  doc,
  children,
}: {
  productId: string;
  productCode: string;
  productName: string;
  folders: FolderOption[];
  doc: ReaderDoc;
  children: ReactNode;
}) {
  const router = useRouter();
  const [modal, setModal] = useState<"edit" | "rename" | "delete" | null>(null);

  return (
    <>
      {/* breadcrumb + ações */}
      <div className="flex h-11 shrink-0 items-center gap-2 border-b border-line-subtle px-[22px]">
        <Link
          href={`/produtos/${productCode}`}
          className="text-[12.5px] text-fg-6 transition-colors duration-200 hover:text-fg-3"
        >
          {productName}
        </Link>
        <span className="text-fg-9">
          <ChevronRightIcon />
        </span>
        <Link
          href={`/produtos/${productCode}/documentos`}
          className="text-[12.5px] text-fg-6 transition-colors duration-200 hover:text-fg-3"
        >
          Documentos
        </Link>
        <span className="text-fg-9">
          <ChevronRightIcon />
        </span>
        <span className="truncate text-[12.5px] text-fg-5">{doc.title}</span>
        <div className="ml-auto" />
        <Button variant="secondary" size="sm" onClick={() => setModal("edit")}>
          Editar
        </Button>
        <DocMenu
          folders={folders}
          doc={doc}
          onRename={() => setModal("rename")}
          onDelete={() => setModal("delete")}
        />
      </div>

      <div className="flex min-h-0 flex-1">
        {/* corpo central */}
        <div className="min-w-0 flex-1 overflow-y-auto px-14 py-11">
          <div className="mx-auto max-w-[640px]">
            <span className="mb-4 inline-flex items-center gap-1.5 rounded-pill border border-line bg-white/[0.04] px-[9px] py-[3px] text-[11.5px] text-fg-5">
              <span className="text-fg-6">
                <FolderIcon size={12} />
              </span>
              {doc.folderName}
            </span>
            <h1 className="mb-2.5 text-[28px] font-semibold tracking-[-0.02em] text-fg-hi">
              {doc.title}
            </h1>
            <p className="mb-[34px] text-[12.5px] text-fg-8">
              Editado {doc.updatedRelative} por {doc.updatedByName ?? "—"} ·
              criado em {doc.createdAtLabel} por {doc.createdByName ?? "—"}
            </p>
            {children}
          </div>
        </div>

        {/* painel lateral */}
        <aside className="flex w-[264px] shrink-0 flex-col gap-5 overflow-y-auto border-l border-line p-5">
          <div className="flex flex-col gap-[9px]">
            <span className={sectionLabel}>Pasta</span>
            <span className="inline-flex items-center gap-2 text-[12.5px] text-fg-2">
              <span className="text-fg-6">
                <FolderIcon />
              </span>
              {doc.folderName}
            </span>
          </div>
          <div className="flex flex-col gap-[9px]">
            <span className={sectionLabel}>Criado por</span>
            <div className="flex items-center gap-2">
              <Avatar
                size={22}
                initials={initialsOf(doc.createdByName ?? "—")}
              />
              <span className="text-[12.5px] text-fg-2">
                {doc.createdByName ?? "—"}
              </span>
              <span className="ml-auto text-[11.5px] text-fg-9">
                {doc.createdAtLabel}
              </span>
            </div>
          </div>
          <div className="flex flex-col gap-[9px]">
            <span className={sectionLabel}>Última edição</span>
            <span className="text-[12.5px] text-fg-4">
              {doc.updatedRelative}
              {doc.updatedByName ? ` · ${doc.updatedByName}` : ""}
            </span>
          </div>
          <div className="flex flex-col gap-2.5">
            <span className={sectionLabel}>Atividade</span>
            {doc.events.length === 0 && (
              <span className="text-xs text-fg-8">Sem eventos.</span>
            )}
            {doc.events.map((ev) => (
              <div key={ev.id} className="flex items-start gap-2">
                <Avatar size={20} initials={initialsOf(ev.who)} />
                <div className="flex min-w-0 flex-col gap-px">
                  <span className="text-xs leading-[1.4] text-fg-4">
                    <span className="font-medium text-fg-2">{ev.who}</span>{" "}
                    {ev.label}
                  </span>
                  <span className="text-[11px] text-fg-9">{ev.when}</span>
                </div>
              </div>
            ))}
          </div>
        </aside>
      </div>

      {modal === "edit" && (
        <EditDocModal
          productId={productId}
          doc={doc}
          folders={folders}
          onClose={() => setModal(null)}
        />
      )}
      {modal === "rename" && (
        <RenameModal doc={doc} onClose={() => setModal(null)} />
      )}
      {modal === "delete" && (
        <DeleteConfirm
          doc={doc}
          onDeleted={() => router.push(`/produtos/${productCode}/documentos`)}
          onClose={() => setModal(null)}
        />
      )}
    </>
  );
}

/* ---- Menu "…" (mover / renomear / excluir) --------------------------------- */

function DocMenu({
  folders,
  doc,
  onRename,
  onDelete,
}: {
  folders: FolderOption[];
  doc: ReaderDoc;
  onRename: () => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [moving, setMoving] = useState(false);
  const [, startTransition] = useTransition();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setMoving(false);
      }
    };
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, [open]);

  const item =
    "flex w-full cursor-pointer items-center gap-2 rounded-nav px-2.5 py-[7px] text-left text-[12.5px] text-fg-3 transition-colors duration-150 hover:bg-white/[0.06] hover:text-fg-1";

  const move = (folderId: string) => {
    setOpen(false);
    setMoving(false);
    if (folderId === doc.folderId) return;
    startTransition(async () => {
      await moveDocument(doc.id, folderId);
    });
  };

  return (
    <div className="relative" ref={ref}>
      <IconButton
        aria-label="Mais ações"
        size={28}
        className="border border-line-field-strong"
        onClick={() => {
          setOpen((v) => !v);
          setMoving(false);
        }}
      >
        <DotsIcon />
      </IconButton>
      {open && (
        <div className="absolute right-0 top-full z-40 mt-1.5 w-[190px] rounded-field border border-line-strong bg-surface-raised p-1 shadow-modal">
          {!moving ? (
            <>
              <button
                type="button"
                className={item}
                onClick={() => setMoving(true)}
              >
                <FolderIcon size={13} />
                Mover de pasta
                <span className="ml-auto text-fg-8">
                  <ChevronRightIcon size={12} />
                </span>
              </button>
              <button
                type="button"
                className={item}
                onClick={() => {
                  setOpen(false);
                  onRename();
                }}
              >
                Renomear
              </button>
              <button
                type="button"
                className={cn(item, "text-danger hover:text-danger")}
                onClick={() => {
                  setOpen(false);
                  onDelete();
                }}
              >
                Excluir
              </button>
            </>
          ) : (
            <>
              <span className="block px-2.5 pb-1 pt-[5px] text-[10.5px] font-semibold uppercase tracking-[0.05em] text-fg-8">
                Mover para
              </span>
              {folders.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  className={item}
                  onClick={() => move(f.id)}
                >
                  <FolderIcon size={13} />
                  <span className="truncate">{f.name}</span>
                  {f.id === doc.folderId && (
                    <span className="ml-auto text-[10.5px] text-fg-8">
                      atual
                    </span>
                  )}
                </button>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}

/* ---- Editor (mesmo formulário do modal Escrever, pré-carregado) ------------- */

function EditDocModal({
  productId,
  doc,
  folders,
  onClose,
}: {
  productId: string;
  doc: ReaderDoc;
  folders: FolderOption[];
  onClose: () => void;
}) {
  const [title, setTitle] = useState(doc.title);
  const [body, setBody] = useState(doc.body);
  const [folderId, setFolderId] = useState(doc.folderId);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const submit = () => {
    if (pending) return;
    startTransition(async () => {
      const result = await updateDocument(doc.id, { title, body, folderId });
      if (result.error) {
        setError(result.error);
        return;
      }
      onClose();
    });
  };

  const label = "text-xs font-medium text-fg-5";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(4,5,7,0.62)]">
      <div className="w-[580px] max-w-[92vw] overflow-hidden rounded-panel border border-white/10 bg-surface-card shadow-modal">
        <div className="flex items-center border-b border-line px-[18px] py-4">
          <span className="text-[14.5px] font-semibold text-fg-1">
            Editar documento
          </span>
          <IconButton aria-label="Fechar" className="ml-auto" onClick={onClose}>
            <CloseIcon size={16} />
          </IconButton>
        </div>
        <div className="flex flex-col gap-[15px] p-[18px]">
          <div className="grid grid-cols-[1fr_200px] gap-3">
            <div className="flex flex-col gap-[7px]">
              <label htmlFor="ed-title" className={label}>
                Título
              </label>
              <Input
                id="ed-title"
                size="lg"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-[7px]">
              <span className={label}>Pasta</span>
              <FolderSelect
                productId={productId}
                folders={folders}
                value={folderId}
                onChange={setFolderId}
              />
            </div>
          </div>
          <div className="flex flex-col gap-[7px]">
            <span className={label}>Conteúdo</span>
            <MarkdownEditor value={body} onChange={setBody} minHeight={240} />
          </div>
          {error && (
            <p className="text-xs leading-[1.4] text-danger">{error}</p>
          )}
        </div>
        <div className="flex justify-end gap-[9px] border-t border-line px-[18px] py-3.5">
          <Button variant="secondary" size="lg" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            size="lg"
            disabled={pending || !title.trim()}
            onClick={submit}
          >
            {pending ? "Salvando…" : "Salvar"}
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ---- Renomear ---------------------------------------------------------------- */

function RenameModal({
  doc,
  onClose,
}: {
  doc: ReaderDoc;
  onClose: () => void;
}) {
  const [title, setTitle] = useState(doc.title);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const submit = () => {
    if (pending) return;
    startTransition(async () => {
      const result = await renameDocument(doc.id, title);
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
            Renomear documento
          </span>
          <IconButton aria-label="Fechar" className="ml-auto" onClick={onClose}>
            <CloseIcon size={16} />
          </IconButton>
        </div>
        <div className="flex flex-col gap-[7px] p-[18px]">
          <Input
            aria-label="Título"
            size="lg"
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
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
          <Button
            size="lg"
            disabled={pending || !title.trim()}
            onClick={submit}
          >
            {pending ? "Salvando…" : "Salvar"}
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ---- Excluir ------------------------------------------------------------------ */

function DeleteConfirm({
  doc,
  onDeleted,
  onClose,
}: {
  doc: ReaderDoc;
  onDeleted: () => void;
  onClose: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const submit = () => {
    if (pending) return;
    startTransition(async () => {
      const result = await deleteDocument(doc.id);
      if (result.error) {
        setError(result.error);
        return;
      }
      onDeleted();
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(4,5,7,0.62)]">
      <div className="w-[380px] overflow-hidden rounded-panel border border-white/10 bg-surface-card shadow-modal">
        <div className="flex flex-col gap-2 p-[18px]">
          <span className="text-[14.5px] font-semibold text-fg-1">
            Excluir documento
          </span>
          <p className="text-[13px] leading-[1.55] text-fg-5">
            "{doc.title}" será excluído com o histórico de atividade. Essa ação
            não tem volta.
          </p>
          {error && (
            <p className="text-xs leading-[1.4] text-danger">{error}</p>
          )}
        </div>
        <div className="flex justify-end gap-[9px] border-t border-line px-[18px] py-3.5">
          <Button variant="secondary" size="lg" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            size="lg"
            className="bg-danger hover:bg-[#e57f7f]"
            disabled={pending}
            onClick={submit}
          >
            {pending ? "Excluindo…" : "Excluir"}
          </Button>
        </div>
      </div>
    </div>
  );
}
