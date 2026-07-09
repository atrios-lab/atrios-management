"use client";

import {
  useEffect,
  useOptimistic,
  useRef,
  useState,
  useTransition,
} from "react";
import {
  ChevronDownIcon,
  CloseIcon,
  CopyIcon,
  ExternalIcon,
  GitGraphIcon,
  KanbanIcon,
  ListIcon,
  PlusIcon,
} from "@/components/icons";
import {
  Badge,
  Button,
  IconButton,
  RepoChip,
  SegmentedControl,
  TaskCard,
} from "@/components/ui";
import type { CardStatus } from "@/db/schema";
import { cn } from "@/lib/cn";
import {
  BOARD_COLUMNS,
  displayCardId,
  repoColor,
  suggestBranch,
} from "@/lib/product-constants";
import {
  createCard,
  linkPr,
  setCardStatus,
  unlinkPr,
  updateCard,
} from "../actions";
import { ProductHeader } from "./product-header";

export interface BoardRepo {
  id: string;
  label: string;
  name: string;
}

export interface BoardCard {
  id: string;
  seq: number;
  title: string;
  description: string | null;
  status: CardStatus;
  repoId: string | null;
  prNumber: number | null;
  prUrl: string | null;
  auto: boolean;
}

export interface BoardProduct {
  id: string;
  name: string;
  code: string;
  stage: number;
  description: string;
  longDescription: string | null;
  /** Data formatada em que o produto entrou em cada etapa (por índice). */
  stageDates: (string | null)[];
  repos: BoardRepo[];
}

export function ProductBoard({
  product,
  cards,
  accessCount,
  documentCount,
}: {
  product: BoardProduct;
  cards: BoardCard[];
  accessCount: number;
  documentCount: number;
}) {
  const [view, setView] = useState("kanban");
  const [composing, setComposing] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // Destaque "novo" é só desta sessão do browser (não persiste).
  const [newIds, setNewIds] = useState<ReadonlySet<string>>(new Set());
  const [, startTransition] = useTransition();
  // Drag-and-drop do kanban (só nesta visão).
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<CardStatus | null>(null);
  // Override otimista de status; a revalidação descarta ao trazer os props novos.
  const [optimisticCards, moveCardOptimistic] = useOptimistic(
    cards,
    (state, { id, status }: { id: string; status: CardStatus }) =>
      state.map((c) => (c.id === id ? { ...c, status } : c)),
  );

  const columns = BOARD_COLUMNS.map((col) => ({
    ...col,
    cards: optimisticCards.filter((c) => c.status === col.status),
  }));
  const selected = cards.find((c) => c.id === selectedId) ?? null;
  const repoOf = (c: BoardCard) => product.repos.find((r) => r.id === c.repoId);
  const nextSeq = cards.reduce((m, c) => Math.max(m, c.seq), 0) + 1;

  const endDrag = () => {
    setDraggingId(null);
    setDragOverCol(null);
  };

  const dropOnColumn = (status: CardStatus, id: string) => {
    endDrag();
    if (!id) return;
    const card = cards.find((c) => c.id === id);
    if (!card || card.status === status) return; // mesma coluna: no-op
    startTransition(async () => {
      moveCardOptimistic({ id, status });
      await setCardStatus(id, status);
    });
  };

  const onCreateCard = (title: string, repoId?: string) => {
    setComposing(false);
    startTransition(async () => {
      const result = await createCard(product.id, title, repoId);
      if (result.id) {
        const id = result.id;
        setNewIds((prev) => new Set(prev).add(id));
      }
    });
  };

  return (
    <>
      <ProductHeader
        name={product.name}
        code={product.code}
        stage={product.stage}
        cardCount={cards.length}
        accessCount={accessCount}
        documentCount={documentCount}
        active="cards"
        context={{
          id: product.id,
          stage: product.stage,
          description: product.description,
          longDescription: product.longDescription,
          stageDates: product.stageDates,
          repos: product.repos,
        }}
      />

      {/* board */}
      <div className="flex min-h-0 flex-1 flex-col gap-3.5 px-5 pb-5 pt-4">
        <div className="flex shrink-0 items-center">
          <SegmentedControl
            value={view}
            onChange={setView}
            options={[
              { value: "kanban", label: "Kanban", icon: <KanbanIcon /> },
              { value: "list", label: "Lista", icon: <ListIcon /> },
            ]}
          />
        </div>

        {view === "kanban" ? (
          <div className="flex min-h-0 flex-1 gap-3.5">
            {columns.map((col) => (
              <div
                key={col.status}
                className="flex min-w-0 flex-1 flex-col gap-[11px]"
                onDragOver={(e) => {
                  // sempre preventDefault no alvo: garante que o drop seja aceito
                  // mesmo antes de o estado draggingId ter feito flush.
                  e.preventDefault();
                  if (dragOverCol !== col.status) setDragOverCol(col.status);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  // id do dataTransfer é confiável no drop; estado é fallback.
                  const id = e.dataTransfer.getData("text/plain") || draggingId;
                  if (id) dropOnColumn(col.status, id);
                }}
              >
                <div className="flex shrink-0 items-center gap-2 px-[3px]">
                  <span
                    className="size-[9px] shrink-0 rounded-full"
                    style={{ background: col.color }}
                  />
                  <span className="whitespace-nowrap text-[13px] font-semibold text-fg-3">
                    {col.title}
                  </span>
                  <span className="text-xs text-fg-9">{col.cards.length}</span>
                  {col.status === "todo" && (
                    <IconButton
                      aria-label="Novo card"
                      size={22}
                      className="ml-auto"
                      onClick={() => setComposing(true)}
                    >
                      <PlusIcon size={14} />
                    </IconButton>
                  )}
                </div>
                <div
                  className={cn(
                    "flex flex-1 flex-col gap-2 overflow-auto rounded-field border border-transparent transition-colors duration-150",
                    dragOverCol === col.status &&
                      draggingId &&
                      "border-dashed border-primary/45 bg-surface-selected/40",
                  )}
                >
                  {col.status === "todo" && composing && (
                    <CardComposer
                      nextId={displayCardId(product.code, nextSeq)}
                      repos={product.repos}
                      onCreate={onCreateCard}
                      onCancel={() => setComposing(false)}
                    />
                  )}
                  {col.cards.map((card) => (
                    <TaskCard
                      key={card.id}
                      id={displayCardId(product.code, card.seq)}
                      title={card.title}
                      repo={repoOf(card)?.label}
                      prNum={card.prNumber ?? undefined}
                      auto={card.auto}
                      isNew={newIds.has(card.id)}
                      draggable
                      onDragStart={(e) => {
                        // estado primeiro: é a fonte de verdade do drop (dataTransfer é só cosmético)
                        setDraggingId(card.id);
                        e.dataTransfer.effectAllowed = "move";
                        e.dataTransfer.setData("text/plain", card.id);
                      }}
                      onDragEnd={endDrag}
                      className={cn(
                        "cursor-grab active:cursor-grabbing",
                        draggingId === card.id && "opacity-40",
                        newIds.has(card.id) &&
                          "border-primary/40 bg-surface-selected shadow-glow-new",
                      )}
                      onClick={() => setSelectedId(card.id)}
                    />
                  ))}
                  {col.status === "todo" && !composing && (
                    <button
                      type="button"
                      onClick={() => setComposing(true)}
                      className="flex cursor-pointer items-center gap-1.5 rounded-field border border-dashed border-white/10 bg-transparent px-[11px] py-2 text-left text-[12.5px] text-fg-7 transition-colors duration-200 hover:border-primary/45 hover:text-primary-fg"
                    >
                      <PlusIcon size={12} />
                      Novo card
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="min-h-0 flex-1 overflow-auto rounded-[10px] border border-[rgba(255,255,255,0.07)] bg-surface-1">
            {columns.map((col) => (
              <div key={col.status}>
                <div className="flex items-center gap-[9px] border-b border-line-subtle bg-surface-4 px-4 py-[9px]">
                  <span className="text-fg-7">
                    <ChevronDownIcon size={12} />
                  </span>
                  <span
                    className="size-[9px] shrink-0 rounded-full"
                    style={{ background: col.color }}
                  />
                  <span className="text-[12.5px] font-semibold text-fg-3">
                    {col.title}
                  </span>
                  <span className="rounded-pill bg-white/[0.06] px-[7px] text-[11px] font-semibold text-fg-6">
                    {col.cards.length}
                  </span>
                  {col.status === "todo" && (
                    <IconButton
                      aria-label="Novo card"
                      size={22}
                      className="ml-auto"
                      onClick={() => {
                        setView("kanban");
                        setComposing(true);
                      }}
                    >
                      <PlusIcon size={13} />
                    </IconButton>
                  )}
                </div>
                {col.cards.map((card) => (
                  <button
                    key={card.id}
                    type="button"
                    onClick={() => setSelectedId(card.id)}
                    className="flex w-full cursor-pointer items-center gap-3 border-b border-line-subtle py-2.5 pl-[18px] pr-4 text-left transition-colors duration-200 hover:bg-white/[0.022]"
                  >
                    <span
                      className="size-2 shrink-0 rounded-full"
                      style={{ background: col.color }}
                    />
                    <span className="min-w-[58px] shrink-0 font-mono text-[11.5px] text-fg-7">
                      {displayCardId(product.code, card.seq)}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-[13px] text-fg-2">
                      {card.title}
                    </span>
                    {card.auto && (
                      <Badge
                        tone="primary"
                        pulse
                        icon={<GitGraphIcon size={9} />}
                      >
                        auto
                      </Badge>
                    )}
                    {repoOf(card) && (
                      <RepoChip
                        name={repoOf(card)?.label}
                        color={repoColor(repoOf(card)?.label ?? "")}
                      />
                    )}
                    {card.prNumber && (
                      <Badge tone="neutral" mono icon={<GitGraphIcon />}>
                        #{card.prNumber}
                      </Badge>
                    )}
                  </button>
                ))}
                {col.status === "todo" && (
                  <button
                    type="button"
                    onClick={() => {
                      setView("kanban");
                      setComposing(true);
                    }}
                    className="flex w-full cursor-pointer items-center gap-2 border-b border-line-subtle py-[9px] pl-[18px] pr-4 text-left text-[12.5px] text-fg-7 transition-colors duration-200 hover:bg-white/[0.015] hover:text-primary-fg"
                  >
                    <PlusIcon size={12} />
                    Novo card
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {selected && (
        <CardPanel
          key={selected.id}
          card={selected}
          product={product}
          onClose={() => setSelectedId(null)}
        />
      )}
    </>
  );
}

/* ---- Card composer (screen 05) ---------------------------------------- */

function CardComposer({
  nextId,
  repos,
  onCreate,
  onCancel,
}: {
  nextId: string;
  repos: BoardRepo[];
  onCreate: (title: string, repoId?: string) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState("");
  const [repoId, setRepoId] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => inputRef.current?.focus(), []);

  const submit = () => {
    if (title.trim()) onCreate(title.trim(), repoId || undefined);
  };

  return (
    <div className="flex flex-col gap-[11px] rounded-field border border-primary/60 bg-surface-selected p-[11px] [box-shadow:0_0_0_3px_rgba(94,106,210,0.13)]">
      <input
        ref={inputRef}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") submit();
          if (e.key === "Escape") onCancel();
        }}
        placeholder="Título do card"
        className="w-full bg-transparent text-[13.5px] leading-[1.4] text-[#ececed] outline-none placeholder:text-fg-8"
      />
      <div className="flex items-center gap-2">
        <select
          aria-label="Repositório"
          value={repoId}
          onChange={(e) => setRepoId(e.target.value)}
          className="h-[27px] cursor-pointer rounded-nav border border-line-field-strong bg-surface-1 px-[9px] text-xs text-fg-3 outline-none"
        >
          <option value="">sem repo</option>
          {repos.map((r) => (
            <option key={r.id} value={r.id}>
              {r.label}
            </option>
          ))}
        </select>
        <span className="ml-auto font-mono text-[11px] text-fg-9">
          {nextId}
        </span>
      </div>
      <div className="flex items-center gap-2 border-t border-[rgba(255,255,255,0.07)] pt-2.5">
        <span className="text-[11px] text-fg-9">Enter cria · Esc cancela</span>
        <div className="ml-auto flex gap-[7px]">
          <Button variant="secondary" size="sm" onClick={onCancel}>
            Cancelar
          </Button>
          <Button size="sm" onClick={submit}>
            Criar
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ---- Card panel (screen 06) -------------------------------------------- */

function CardPanel({
  card,
  product,
  onClose,
}: {
  card: BoardCard;
  product: BoardProduct;
  onClose: () => void;
}) {
  const displayId = displayCardId(product.code, card.seq);
  const branch = suggestBranch(displayId, card.title);
  const column =
    BOARD_COLUMNS.find((c) => c.status === card.status) ?? BOARD_COLUMNS[0];

  const [title, setTitle] = useState(card.title);
  const [description, setDescription] = useState(card.description ?? "");
  const [prInput, setPrInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const run = (fn: () => Promise<{ error?: string }>) => {
    startTransition(async () => {
      const result = await fn();
      setError(result.error ?? null);
    });
  };

  const saveTitle = () => {
    if (title.trim() && title.trim() !== card.title)
      run(() => updateCard(card.id, { title }));
    else setTitle(card.title);
  };

  const saveDescription = () => {
    if (description.trim() !== (card.description ?? ""))
      run(() => updateCard(card.id, { description }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <button
        type="button"
        aria-label="Fechar"
        className="absolute inset-0 cursor-default bg-[rgba(4,5,7,0.55)]"
        onClick={onClose}
      />
      <div
        className="relative w-[720px] max-w-[92vw] overflow-hidden rounded-panel border border-white/10 bg-surface-card shadow-modal"
        role="dialog"
        aria-label={displayId}
      >
        <div className="flex items-center gap-2.5 border-b border-line px-[18px] py-3.5">
          <span className="rounded-chip bg-white/5 px-[7px] py-0.5 font-mono text-xs text-fg-6">
            {displayId}
          </span>
          <select
            aria-label="Status do card"
            value={card.status}
            onChange={(e) =>
              run(() => setCardStatus(card.id, e.target.value as CardStatus))
            }
            className="h-[27px] cursor-pointer rounded-pill border border-line-field-strong bg-surface-1 px-[9px] text-xs font-medium outline-none"
            style={{ color: column.color }}
          >
            {BOARD_COLUMNS.map((c) => (
              <option key={c.status} value={c.status}>
                {c.title}
              </option>
            ))}
          </select>
          <div className="ml-auto" />
          <IconButton aria-label="Fechar" onClick={onClose}>
            <CloseIcon size={16} />
          </IconButton>
        </div>
        <div className="flex">
          <div className="min-w-0 flex-1 border-r border-line px-5 py-[22px]">
            <input
              aria-label="Título do card"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={saveTitle}
              onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
              className="mb-[18px] w-full bg-transparent text-[19px] font-semibold leading-[1.3] tracking-[-0.01em] text-fg-hi outline-none"
            />
            <div className="mb-[9px] text-[11px] font-semibold uppercase tracking-[0.05em] text-fg-8">
              Descrição
            </div>
            <textarea
              aria-label="Descrição do card"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onBlur={saveDescription}
              placeholder="Sem descrição."
              rows={6}
              className="w-full resize-none bg-transparent text-[13.5px] leading-[1.65] text-fg-4 outline-none placeholder:text-fg-8"
            />
          </div>
          <div className="flex w-[264px] shrink-0 flex-col gap-5 px-5 py-[22px]">
            <div className="flex flex-col gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-[0.05em] text-fg-8">
                Repositório
              </span>
              <div className="flex h-9 items-center gap-2 rounded-field border border-line-field bg-surface-1 px-[11px]">
                {card.repoId && (
                  <span
                    className="size-[7px] shrink-0 rounded-full"
                    style={{
                      background: repoColor(
                        product.repos.find((r) => r.id === card.repoId)
                          ?.label ?? "",
                      ),
                    }}
                  />
                )}
                <select
                  aria-label="Repositório do card"
                  value={card.repoId ?? ""}
                  onChange={(e) =>
                    run(() =>
                      updateCard(card.id, { repoId: e.target.value || null }),
                    )
                  }
                  className="w-full cursor-pointer bg-transparent text-[13px] text-fg-2 outline-none"
                >
                  <option value="">sem repo</option>
                  {product.repos.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-[0.05em] text-fg-8">
                Branch sugerida
              </span>
              <div className="flex h-9 items-center gap-2 rounded-field border border-line-field bg-surface-1 py-0 pl-[11px] pr-2">
                <span className="truncate font-mono text-xs text-fg-3">
                  {branch}
                </span>
                <IconButton
                  aria-label="Copiar branch"
                  tinted
                  className="ml-auto hover:bg-primary/25 hover:text-primary-fg-hi"
                  onClick={() => navigator.clipboard?.writeText(branch)}
                >
                  <CopyIcon />
                </IconButton>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-[0.05em] text-fg-8">
                Pull Request
              </span>
              {card.prNumber ? (
                <div className="flex items-center gap-2 rounded-field border border-status-done/25 bg-status-done/10 py-[5px] pl-[11px] pr-1.5">
                  <a
                    href={card.prUrl ?? "#"}
                    target="_blank"
                    rel="noreferrer"
                    className="flex min-w-0 flex-1 items-center gap-2"
                  >
                    <span className="text-status-done">
                      <GitGraphIcon size={14} />
                    </span>
                    <span className="font-mono text-[12.5px] text-fg-2">
                      #{card.prNumber}
                    </span>
                    <span className="ml-auto shrink-0 text-fg-7">
                      <ExternalIcon />
                    </span>
                  </a>
                  <IconButton
                    aria-label="Remover vínculo do PR"
                    size={22}
                    className="hover:text-danger"
                    onClick={() => run(() => unlinkPr(card.id))}
                  >
                    <CloseIcon />
                  </IconButton>
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  <input
                    aria-label="Link do PR"
                    value={prInput}
                    onChange={(e) => setPrInput(e.target.value)}
                    onKeyDown={(e) =>
                      e.key === "Enter" &&
                      prInput.trim() &&
                      run(() => linkPr(card.id, prInput))
                    }
                    placeholder="Colar link do PR"
                    className="h-8 min-w-0 flex-1 rounded-field border border-dashed border-line-hover bg-transparent px-[11px] text-xs text-fg-3 outline-none placeholder:text-fg-7"
                  />
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={pending || !prInput.trim()}
                    onClick={() => run(() => linkPr(card.id, prInput))}
                  >
                    Vincular
                  </Button>
                </div>
              )}
              {error && (
                <span className="text-[11px] leading-[1.4] text-danger">
                  {error}
                </span>
              )}
              <span className="text-[11px] leading-[1.4] text-fg-9">
                Cole o link de um PR do GitHub para vincular ao card.
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
