"use client";

import { upload } from "@vercel/blob/client";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import {
  ChainLinkIcon,
  ChevronDownIcon,
  CloseIcon,
  DocPageIcon,
  FolderIcon,
  ListIcon,
  PaperclipIcon,
  UploadIcon,
} from "@/components/icons";
import {
  Button,
  IconButton,
  Input,
  SegmentedControl,
  Sheet,
} from "@/components/ui";
import type { DocumentType } from "@/db/schema";
import { cn } from "@/lib/cn";
import {
  DOCUMENT_TYPES,
  domainOf,
  formatFileSize,
  isAcceptedFileType,
  MAX_FILE_BYTES,
} from "@/lib/document-constants";
import {
  createDocDocument,
  createFileDocument,
  createFolder,
  createLinkDocument,
  fetchLinkTitle,
} from "./actions";

export interface FolderOption {
  id: string;
  name: string;
}

const NEW_FOLDER = "__nova_pasta__";

/* ---- Select de pasta (com criação inline) -------------------------------- */

export function FolderSelect({
  productId,
  folders,
  value,
  onChange,
}: {
  productId: string;
  folders: FolderOption[];
  value: string;
  onChange: (id: string) => void;
}) {
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  // Pasta recém-criada, antes de os props do server chegarem via revalidate.
  const [extra, setExtra] = useState<FolderOption | null>(null);

  const all =
    extra && !folders.some((f) => f.id === extra.id)
      ? [...folders, extra]
      : folders;

  const confirmCreate = () => {
    if (pending || !name.trim()) return;
    startTransition(async () => {
      const result = await createFolder(productId, name);
      if (result.error) {
        setError(result.error);
        return;
      }
      if (result.id) {
        setExtra({ id: result.id, name: result.name ?? name.trim() });
        onChange(result.id);
        setCreating(false);
        setName("");
        setError(null);
      }
    });
  };

  if (creating) {
    return (
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-1.5">
          <Input
            size="lg"
            autoFocus
            value={name}
            placeholder="Nome da pasta"
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") confirmCreate();
              if (e.key === "Escape") setCreating(false);
            }}
          />
          <Button size="lg" disabled={pending} onClick={confirmCreate}>
            Criar
          </Button>
          <IconButton aria-label="Cancelar" onClick={() => setCreating(false)}>
            <CloseIcon />
          </IconButton>
        </div>
        {error && <p className="text-[11px] text-danger">{error}</p>}
      </div>
    );
  }

  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-fg-6">
        <FolderIcon />
      </span>
      <select
        aria-label="Pasta"
        value={value}
        onChange={(e) => {
          if (e.target.value === NEW_FOLDER) setCreating(true);
          else onChange(e.target.value);
        }}
        className="h-[38px] w-full cursor-pointer appearance-none rounded-field border border-line-field bg-surface-1 pl-[34px] pr-8 text-sm text-fg-2 outline-none transition-colors duration-200 hover:border-line-hover focus:border-primary/40"
      >
        {!value && (
          <option value="" disabled>
            Escolher pasta…
          </option>
        )}
        {all.map((f) => (
          <option key={f.id} value={f.id}>
            {f.name}
          </option>
        ))}
        <option value={NEW_FOLDER}>+ Nova pasta…</option>
      </select>
      <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-fg-7">
        <ChevronDownIcon />
      </span>
    </div>
  );
}

/* ---- Editor markdown (textarea + toolbar B/I/H2/lista) ------------------- */

export function MarkdownEditor({
  value,
  onChange,
  minHeight = 200,
}: {
  value: string;
  onChange: (v: string) => void;
  minHeight?: number;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);

  const apply = (next: string, selStart: number, selEnd: number) => {
    onChange(next);
    requestAnimationFrame(() => {
      const el = ref.current;
      if (!el) return;
      el.focus();
      el.setSelectionRange(selStart, selEnd);
    });
  };

  const wrap = (marker: string) => {
    const el = ref.current;
    if (!el) return;
    const { selectionStart: s, selectionEnd: e, value: v } = el;
    const next = v.slice(0, s) + marker + v.slice(s, e) + marker + v.slice(e);
    apply(next, s + marker.length, e + marker.length);
  };

  const prefixLines = (prefix: string) => {
    const el = ref.current;
    if (!el) return;
    const { selectionStart: s, selectionEnd: e, value: v } = el;
    const start = v.lastIndexOf("\n", Math.max(0, s - 1)) + 1;
    const block = v.slice(start, e);
    const prefixed = block
      .split("\n")
      .map((line) => prefix + line)
      .join("\n");
    const next = v.slice(0, start) + prefixed + v.slice(e);
    apply(next, start, start + prefixed.length);
  };

  const toolBtn =
    "inline-flex h-6 min-w-[26px] cursor-pointer items-center justify-center rounded-chip px-1.5 text-fg-4 transition-colors duration-200 hover:bg-white/[0.06] hover:text-fg-1";

  return (
    <div className="overflow-hidden rounded-field border border-line-field bg-surface-1 transition-colors duration-200 focus-within:border-primary/40">
      <div className="flex items-center gap-0.5 border-b border-line px-2 py-1.5">
        <button
          type="button"
          aria-label="Negrito"
          className={cn(toolBtn, "text-xs font-bold")}
          onClick={() => wrap("**")}
        >
          B
        </button>
        <button
          type="button"
          aria-label="Itálico"
          className={cn(toolBtn, "font-serif text-xs italic")}
          onClick={() => wrap("*")}
        >
          I
        </button>
        <button
          type="button"
          aria-label="Título"
          className={cn(toolBtn, "text-[11px] font-semibold")}
          onClick={() => prefixLines("## ")}
        >
          H2
        </button>
        <button
          type="button"
          aria-label="Lista"
          className={toolBtn}
          onClick={() => prefixLines("- ")}
        >
          <ListIcon />
        </button>
        <span className="ml-auto text-[11px] text-fg-9">
          Markdown suportado
        </span>
      </div>
      <textarea
        ref={ref}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Escreva o conteúdo do documento…"
        className="w-full resize-none bg-transparent p-3 text-[13px] leading-[1.65] text-fg-3 outline-none placeholder:text-fg-8"
        style={{ minHeight }}
      />
    </div>
  );
}

/* ---- Modal "Novo documento" (18a–c) --------------------------------------- */

const TAB_OPTIONS = [
  { value: "doc", label: "Escrever", icon: <DocPageIcon size={13} /> },
  { value: "file", label: "Enviar arquivo", icon: <PaperclipIcon size={13} /> },
  { value: "link", label: "Link", icon: <ChainLinkIcon size={13} /> },
];

const URL_RE = /^https?:\/\/\S+\.\S+/i;

export function NewDocumentModal({
  productId,
  productCode,
  folders,
  onClose,
}: {
  productId: string;
  productCode: string;
  folders: FolderOption[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<DocumentType>("doc");
  // A pasta é compartilhada entre as abas (spec: alternar preserva a seleção).
  const [folderId, setFolderId] = useState(folders[0]?.id ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Escrever — rascunho local por produto (nota do rodapé)
  const draftKey = `atrios.docDraft.${productId}`;
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  // Enviar arquivo
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Link
  const [url, setUrl] = useState("");
  const [linkTitle, setLinkTitle] = useState("");
  const [titleImported, setTitleImported] = useState(false);
  const [fetchingTitle, setFetchingTitle] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(draftKey);
      if (raw) {
        const draft = JSON.parse(raw) as { title?: string; body?: string };
        setTitle(draft.title ?? "");
        setBody(draft.body ?? "");
      }
    } catch {}
  }, [draftKey]);

  useEffect(() => {
    // Só grava com conteúdo — evita apagar o rascunho no primeiro render.
    if (title || body)
      localStorage.setItem(draftKey, JSON.stringify({ title, body }));
  }, [draftKey, title, body]);

  const pickFile = (f: File | undefined | null) => {
    if (!f) return;
    if (f.size > MAX_FILE_BYTES) {
      setError("O arquivo passa de 25 MB.");
      return;
    }
    if (!isAcceptedFileType(f.type)) {
      setError("Formato não aceito — envie PDF, planilha ou imagem.");
      return;
    }
    setError(null);
    setFile(f);
  };

  const importTitle = (raw: string) => {
    if (!URL_RE.test(raw.trim()) || fetchingTitle) return;
    setFetchingTitle(true);
    fetchLinkTitle(raw).then((result) => {
      setFetchingTitle(false);
      if (result.title) {
        setLinkTitle(result.title);
        setTitleImported(true);
      }
    });
  };

  const canCreate =
    !pending &&
    !!folderId &&
    (tab === "doc"
      ? title.trim().length > 0
      : tab === "file"
        ? !!file
        : URL_RE.test(url.trim()));

  const submit = () => {
    if (pending) return;
    startTransition(async () => {
      setError(null);
      if (!folderId) {
        setError("Escolha uma pasta.");
        return;
      }
      if (tab === "doc") {
        const result = await createDocDocument(
          productId,
          folderId,
          title,
          body,
        );
        if (result.error) {
          setError(result.error);
          return;
        }
        localStorage.removeItem(draftKey);
        onClose();
        if (result.id)
          router.push(`/produtos/${productCode}/documentos/${result.id}`);
      } else if (tab === "file") {
        if (!file) return;
        try {
          const blob = await upload(file.name, file, {
            access: "public",
            handleUploadUrl: "/api/documentos/upload",
          });
          const result = await createFileDocument(productId, folderId, {
            url: blob.url,
            name: file.name,
            size: file.size,
            mimeType: file.type,
          });
          if (result.error) setError(result.error);
          else onClose();
        } catch (e) {
          setError(
            e instanceof Error && e.message
              ? e.message
              : "Falha no upload — confira a conexão e tente de novo.",
          );
        }
      } else {
        if (!URL_RE.test(url.trim())) {
          setError("Cole uma URL http(s) válida.");
          return;
        }
        const result = await createLinkDocument(
          productId,
          folderId,
          linkTitle,
          url,
        );
        if (result.error) setError(result.error);
        else onClose();
      }
    });
  };

  const fileType = DOCUMENT_TYPES.file;
  const linkType = DOCUMENT_TYPES.link;
  const label = "text-xs font-medium text-fg-5";

  return (
    <Sheet
      mode="fullscreen"
      title="Novo documento"
      onClose={onClose}
      action={{
        label: pending ? "Criando…" : "Criar",
        onClick: submit,
        disabled: !canCreate,
      }}
      footerStart={
        tab === "doc" ? (
          <span className="text-[11.5px] text-fg-9">
            Salvo como rascunho automaticamente.
          </span>
        ) : undefined
      }
      panelClassName="md:w-[580px] md:max-w-[92vw]"
    >
      <div className="flex flex-col gap-[15px] p-4 md:p-[18px]">
        <SegmentedControl
          className="w-full [&>button]:flex-1"
          options={TAB_OPTIONS}
          value={tab}
          onChange={(v) => {
            setTab(v as DocumentType);
            setError(null);
          }}
        />

        {tab === "doc" && (
          <>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_200px]">
              <div className="flex flex-col gap-[7px]">
                <label htmlFor="nd-title" className={label}>
                  Título
                </label>
                <Input
                  id="nd-title"
                  size="lg"
                  autoFocus
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
              <MarkdownEditor value={body} onChange={setBody} />
            </div>
          </>
        )}

        {tab === "file" && (
          <>
            {!file ? (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(false);
                  pickFile(e.dataTransfer.files?.[0]);
                }}
                className={cn(
                  "flex cursor-pointer flex-col items-center gap-2 rounded-[10px] border-[1.5px] border-dashed bg-white/[0.015] px-4 py-[26px] text-center transition-colors duration-200",
                  dragOver
                    ? "border-primary/60 bg-primary/5"
                    : "border-[rgba(255,255,255,0.14)] hover:border-[rgba(255,255,255,0.25)]",
                )}
              >
                <span className="text-primary-ink">
                  <UploadIcon size={20} />
                </span>
                <span className="text-[13px] font-medium text-fg-2">
                  Arraste um arquivo aqui
                </span>
                <span className="text-[11.5px] text-fg-8">
                  ou clique para escolher · PDF, planilha ou imagem · até 25 MB
                </span>
              </button>
            ) : (
              <div className="flex items-center gap-2.5 rounded-field border border-[rgba(255,255,255,0.09)] bg-surface-1 px-3 py-2.5">
                <span
                  className="flex size-[26px] shrink-0 items-center justify-center rounded-btn"
                  style={{ background: fileType.bg, color: fileType.color }}
                >
                  <PaperclipIcon />
                </span>
                <span className="min-w-0 flex-1 truncate text-[12.5px] font-medium text-fg-2">
                  {file.name}
                </span>
                <span className="shrink-0 text-[11px] text-fg-8">
                  {formatFileSize(file.size)}
                </span>
                <IconButton
                  aria-label="Remover arquivo"
                  size={22}
                  onClick={() => setFile(null)}
                >
                  <CloseIcon />
                </IconButton>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.csv,.xls,.xlsx,.ods,image/png,image/jpeg,image/webp,image/gif"
              className="hidden"
              onChange={(e) => {
                pickFile(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
            <div className="flex flex-col gap-[7px]">
              <span className={label}>Pasta</span>
              <FolderSelect
                productId={productId}
                folders={folders}
                value={folderId}
                onChange={setFolderId}
              />
            </div>
          </>
        )}

        {tab === "link" && (
          <>
            <div className="flex flex-col gap-[7px]">
              <label htmlFor="nd-url" className={label}>
                URL
              </label>
              <Input
                id="nd-url"
                size="lg"
                mono
                autoFocus
                placeholder="https://…"
                className="text-[12.5px]"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onBlur={() => importTitle(url)}
                onPaste={(e) => {
                  const pasted = e.clipboardData.getData("text");
                  setTimeout(() => importTitle(pasted), 0);
                }}
              />
            </div>
            {URL_RE.test(url.trim()) && (
              <div className="flex items-center gap-2.5 rounded-field border border-[rgba(255,255,255,0.09)] bg-surface-1 px-3 py-2.5">
                <span
                  className="flex size-[26px] shrink-0 items-center justify-center rounded-btn"
                  style={{ background: linkType.bg, color: linkType.color }}
                >
                  <ChainLinkIcon />
                </span>
                <div className="flex min-w-0 flex-1 flex-col gap-px">
                  <input
                    aria-label="Título do link"
                    value={linkTitle}
                    placeholder={
                      fetchingTitle ? "Importando título…" : "Título do link"
                    }
                    onChange={(e) => {
                      setLinkTitle(e.target.value);
                      setTitleImported(false);
                    }}
                    className="w-full bg-transparent text-[12.5px] font-medium text-fg-2 outline-none placeholder:text-fg-8"
                  />
                  <span className="truncate text-[11px] text-fg-8">
                    {domainOf(url)}
                    {titleImported && " · título importado do link"}
                  </span>
                </div>
              </div>
            )}
            <div className="flex flex-col gap-[7px]">
              <span className={label}>Pasta</span>
              <FolderSelect
                productId={productId}
                folders={folders}
                value={folderId}
                onChange={setFolderId}
              />
            </div>
            <span className="text-[11px] text-fg-9">
              O link abre em nova aba — nada é copiado para o Átrios.
            </span>
          </>
        )}

        {error && <p className="text-xs leading-[1.4] text-danger">{error}</p>}
      </div>
    </Sheet>
  );
}
