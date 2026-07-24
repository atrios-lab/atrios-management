"use client";

// UI do Financeiro (telas 20–23): resumo do mês, extrato agrupado por dia,
// modal criar/editar, detalhe e estado vazio.

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import {
  ArrowInIcon,
  ArrowOutIcon,
  CashFlowIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CloseIcon,
  LockIcon,
  PlusIcon,
  TrashIcon,
} from "@/components/icons";
import { Avatar, Button, IconButton, Input, Sheet } from "@/components/ui";
import type { CategoriaId, LancamentoTipo } from "@/db/schema";
import { cn } from "@/lib/cn";
import {
  CATEGORIA_IDS,
  CATEGORIAS,
  comSinal,
  corDoTipo,
  formatMoney,
  formatMoneyComSinal,
  formatMoneySaldo,
  hojeISO,
  labelDataCompleta,
  labelDia,
  labelMes,
  type Mes,
  type MoneyPrefs,
  maskValor,
  mesDeData,
  nomeDoMes,
  parseValorCentavos,
  shiftMes,
} from "@/lib/financeiro-constants";
import {
  atualizarLancamento,
  criarLancamento,
  excluirLancamento,
  type LancamentoInput,
} from "./actions";

/* ---- Tipos que atravessam servidor → cliente ---------------------------- */

export interface LancamentoRow {
  id: string;
  tipo: LancamentoTipo;
  descricao: string;
  valorCentavos: number;
  /** Data civil "YYYY-MM-DD". */
  data: string;
  categoriaId: CategoriaId;
  produtoId: string | null;
  produtoNome: string | null;
  produtoCor: string | null;
  criadoPorNome: string | null;
  criadoEmRelativo: string;
}

export interface ProdutoOption {
  id: string;
  nome: string;
  cor: string;
}

export interface Resumo {
  entradas: number;
  saidas: number;
  resultado: number;
  saldo: number;
}

/** Preferências de exibição em cookie: lidas no servidor, sem flash de valores. */
export const MONEY_PREFS_COOKIE = "fin-prefs";

function initialsOf(name: string) {
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

/* ---- Tela principal (20d) ----------------------------------------------- */

export function FinanceiroView({
  mes,
  mesCorrente,
  lancamentos,
  resumo,
  produtos,
  usuario,
  prefsIniciais,
}: {
  mes: Mes;
  mesCorrente: Mes;
  lancamentos: LancamentoRow[];
  resumo: Resumo;
  produtos: ProdutoOption[];
  usuario: string;
  prefsIniciais: MoneyPrefs;
}) {
  const [prefs, setPrefs] = useState(prefsIniciais);
  const [openId, setOpenId] = useState<string | null>(null);
  const [modal, setModal] = useState<"novo" | "editar" | "excluir" | null>(
    null,
  );

  const setPref = (patch: Partial<MoneyPrefs>) => {
    const next = { ...prefs, ...patch };
    setPrefs(next);
    // biome-ignore lint/suspicious/noDocumentCookie: cookieStore não existe no Safari; um cookie simples basta aqui
    document.cookie = `${MONEY_PREFS_COOKIE}=${next.ocultarValores ? 1 : 0},${
      next.mostrarCentavos ? 1 : 0
    }; path=/; max-age=31536000; samesite=lax`;
  };

  // As linhas já vêm ordenadas por data desc. — basta quebrar em grupos.
  const dias = useMemo(() => {
    const grupos: { data: string; items: LancamentoRow[]; net: number }[] = [];
    for (const l of lancamentos) {
      let grupo = grupos.at(-1);
      if (!grupo || grupo.data !== l.data) {
        grupo = { data: l.data, items: [], net: 0 };
        grupos.push(grupo);
      }
      grupo.items.push(l);
      grupo.net += comSinal(l.tipo, l.valorCentavos);
    }
    return grupos;
  }, [lancamentos]);

  const aberto = openId ? lancamentos.find((l) => l.id === openId) : null;
  const noMesCorrente = mes === mesCorrente;

  return (
    <>
      <header className="flex h-14 shrink-0 items-center gap-[9px] border-b border-line px-4 md:h-[53px] md:px-5">
        <span className="text-[20px] font-semibold text-fg-1 md:text-sm">
          Financeiro
        </span>
        <span className="inline-flex items-center gap-[5px] rounded-pill border border-line bg-white/[0.04] px-2 py-0.5 text-[11px] text-fg-5">
          <LockIcon size={10} />
          Só admins
        </span>
        <div className="ml-auto" />
        <PrefsMenu prefs={prefs} onChange={setPref} />
        <Button icon={<PlusIcon />} onClick={() => setModal("novo")}>
          <span className="hidden md:inline">Novo lançamento</span>
        </Button>
      </header>

      <div className="flex min-h-0 flex-1 flex-col gap-3.5 p-4 md:p-5">
        <div className="flex shrink-0 items-center gap-2">
          <MesLink
            para={shiftMes(mes, -1)}
            rotulo="Mês anterior"
            icone={<ChevronLeftIcon />}
          />
          <span className="min-w-[110px] text-center text-sm font-semibold text-fg-1">
            {labelMes(mes)}
          </span>
          <MesLink
            para={shiftMes(mes, 1)}
            rotulo="Próximo mês"
            icone={<ChevronRightIcon />}
            desabilitado={noMesCorrente}
          />
          {noMesCorrente && (
            <span className="ml-1.5 hidden text-xs text-fg-9 sm:inline">
              mês atual
            </span>
          )}
          <div className="ml-auto" />
          <span className="text-xs text-fg-8">
            {lancamentos.length}{" "}
            {lancamentos.length === 1 ? "lançamento" : "lançamentos"}
          </span>
        </div>

        <div className="grid shrink-0 grid-cols-2 gap-2.5 md:grid-cols-[1fr_1fr_1fr_1.15fr]">
          <ResumoCard
            label="Entradas"
            valor={formatMoney(resumo.entradas, prefs)}
            cor="#4cb782"
          />
          <ResumoCard
            label="Saídas"
            valor={formatMoney(resumo.saidas, prefs)}
            cor="#e06c6c"
          />
          <ResumoCard
            label="Resultado do mês"
            valor={formatMoneyComSinal(resumo.resultado, prefs)}
            cor={resumo.resultado >= 0 ? "#4cb782" : "#e06c6c"}
          />
          <ResumoCard
            label="Saldo em caixa"
            valor={formatMoneySaldo(resumo.saldo, prefs)}
            // Caixa no vermelho não pode sair da cor neutra do card.
            cor={resumo.saldo < 0 ? "#e06c6c" : "#f0f0f2"}
            destaque
          />
        </div>

        {dias.length === 0 ? (
          <EstadoVazio mes={mes} onNovo={() => setModal("novo")} />
        ) : (
          <div className="min-h-0 flex-1 overflow-auto rounded-[10px] border border-[rgba(255,255,255,0.07)] bg-surface-1">
            {dias.map((d) => (
              <div key={d.data}>
                <div className="flex items-center gap-[9px] border-b border-line-subtle bg-surface-4 px-4 py-2">
                  <span className="text-[11.5px] font-semibold text-fg-4">
                    {labelDia(d.data)}
                  </span>
                  <span className="ml-auto font-mono text-[11px] text-fg-9">
                    {formatMoneyComSinal(d.net, prefs)}
                  </span>
                </div>
                {d.items.map((l) => (
                  <LancamentoRowItem
                    key={l.id}
                    row={l}
                    prefs={prefs}
                    onOpen={() => setOpenId(l.id)}
                  />
                ))}
              </div>
            ))}
          </div>
        )}
      </div>

      {aberto && !modal && (
        <LancamentoDetalhe
          row={aberto}
          prefs={prefs}
          onEditar={() => setModal("editar")}
          onExcluir={() => setModal("excluir")}
          onClose={() => setOpenId(null)}
        />
      )}
      {modal === "novo" && (
        <LancamentoModal
          produtos={produtos}
          mesVisivel={mes}
          usuario={usuario}
          onClose={() => setModal(null)}
        />
      )}
      {modal === "editar" && aberto && (
        <LancamentoModal
          produtos={produtos}
          mesVisivel={mes}
          usuario={usuario}
          row={aberto}
          onClose={() => setModal(null)}
        />
      )}
      {modal === "excluir" && aberto && (
        <ExcluirConfirm
          row={aberto}
          onExcluido={() => {
            setModal(null);
            setOpenId(null);
          }}
          onClose={() => setModal(null)}
        />
      )}
    </>
  );
}

/* ---- Peças da tela principal -------------------------------------------- */

function MesLink({
  para,
  rotulo,
  icone,
  desabilitado,
}: {
  para: Mes;
  rotulo: string;
  icone: React.ReactNode;
  desabilitado?: boolean;
}) {
  const base =
    "flex size-8 items-center justify-center rounded-btn border border-line-field md:size-7";
  if (desabilitado)
    return (
      <span aria-hidden className={cn(base, "text-fg-9 opacity-45")}>
        {icone}
      </span>
    );
  return (
    <Link
      href={`/financeiro?mes=${para}`}
      aria-label={rotulo}
      // O mês vive na URL: navegar é um link de verdade, deep-linkável.
      className={cn(
        base,
        "text-fg-5 transition-colors duration-200 hover:bg-white/[0.04] hover:text-fg-2",
      )}
    >
      {icone}
    </Link>
  );
}

function ResumoCard({
  label,
  valor,
  cor,
  destaque,
}: {
  label: string;
  valor: string;
  cor: string;
  destaque?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-2 rounded-[10px] border p-3.5 md:px-4",
        destaque
          ? "border-[rgba(94,106,210,0.26)] bg-[rgba(94,106,210,0.07)]"
          : "border-[rgba(255,255,255,0.07)] bg-surface-3",
      )}
    >
      <span
        className={cn(
          "text-[11px] font-semibold uppercase tracking-[0.05em]",
          destaque ? "text-primary-ink" : "text-fg-8",
        )}
      >
        {label}
      </span>
      <span
        className="font-mono text-lg font-semibold tracking-[-0.01em] md:text-xl"
        style={{ color: cor }}
      >
        {valor}
      </span>
    </div>
  );
}

function Chip({ label, color }: { label: string; color: string }) {
  return (
    <span className="inline-flex shrink-0 items-center gap-[5px] rounded-[5px] border border-line bg-white/[0.04] px-[7px] py-0.5 text-[11px] text-fg-5">
      <span className="size-1.5 rounded-full" style={{ background: color }} />
      {label}
    </span>
  );
}

function TipoIcone({ tipo }: { tipo: LancamentoTipo }) {
  const receita = tipo === "receita";
  return (
    <span
      className="flex size-[26px] shrink-0 items-center justify-center rounded-full"
      style={{
        background: receita ? "rgba(76,183,130,0.12)" : "rgba(224,108,108,0.1)",
        color: corDoTipo(tipo),
      }}
    >
      {receita ? <ArrowInIcon /> : <ArrowOutIcon />}
    </span>
  );
}

function LancamentoRowItem({
  row,
  prefs,
  onOpen,
}: {
  row: LancamentoRow;
  prefs: MoneyPrefs;
  onOpen: () => void;
}) {
  const cat = CATEGORIAS[row.categoriaId];
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex w-full items-center gap-3 border-b border-[rgba(255,255,255,0.035)] px-4 py-3 text-left transition-colors duration-200 hover:bg-white/[0.022] md:py-2.5"
    >
      <TipoIcone tipo={row.tipo} />
      {/* No mobile descrição e chips empilham; no desktop tudo em uma linha. */}
      <div className="flex min-w-0 flex-1 flex-col gap-1 md:contents">
        <span className="min-w-0 truncate text-[14px] font-medium text-fg-2 md:flex-1 md:text-[13px]">
          {row.descricao}
        </span>
        <div className="flex min-w-0 items-center gap-1.5 md:contents">
          <Chip label={cat.nome} color={cat.cor} />
          {row.produtoNome && (
            <Chip label={row.produtoNome} color={row.produtoCor ?? "#8b95a5"} />
          )}
        </div>
      </div>
      <span className="hidden md:block">
        <Avatar size={20} initials={initialsOf(row.criadoPorNome ?? "—")} />
      </span>
      <span
        className="shrink-0 text-right font-mono text-[12.5px] font-semibold md:w-[124px]"
        style={{ color: corDoTipo(row.tipo) }}
      >
        {formatMoneyComSinal(comSinal(row.tipo, row.valorCentavos), prefs)}
      </span>
      <span className="shrink-0 text-fg-9">
        <ChevronRightIcon size={14} />
      </span>
    </button>
  );
}

function EstadoVazio({ mes, onNovo }: { mes: Mes; onNovo: () => void }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-0 rounded-[10px] border border-[rgba(255,255,255,0.07)] bg-surface-1 p-8 text-center">
      <div className="mb-[18px] flex size-[46px] items-center justify-center rounded-[12px] border border-[rgba(94,106,210,0.28)] bg-[rgba(94,106,210,0.12)] text-primary-ink">
        <CashFlowIcon size={20} />
      </div>
      <span className="mb-[7px] text-[15.5px] font-semibold tracking-[-0.01em] text-fg-1">
        Nenhum lançamento em {nomeDoMes(mes)}
      </span>
      <p className="mb-5 max-w-[360px] text-[13px] leading-[1.55] text-fg-6">
        Registre receitas e despesas para saber num relance quanto entrou,
        quanto saiu e qual o saldo do mês.
      </p>
      <Button icon={<PlusIcon />} onClick={onNovo}>
        Novo lançamento
      </Button>
      <span className="mt-4 text-[11.5px] text-fg-9">
        O Financeiro é visível apenas para admins.
      </span>
    </div>
  );
}

/** Tweaks do mockup: ocultar montantes e esconder centavos. */
function PrefsMenu({
  prefs,
  onChange,
}: {
  prefs: MoneyPrefs;
  onChange: (patch: Partial<MoneyPrefs>) => void;
}) {
  const item =
    "flex w-full cursor-pointer items-center gap-2 rounded-btn px-2 py-1.5 text-[12.5px] text-fg-4 transition-colors duration-200 hover:bg-white/5 hover:text-fg-1";
  return (
    <>
      <IconButton
        aria-label="Exibição dos valores"
        popoverTarget="fin-prefs-menu"
      >
        <CashFlowIcon size={14} />
      </IconButton>
      <div
        id="fin-prefs-menu"
        popover="auto"
        className="fixed inset-auto right-4 top-[52px] m-0 w-[210px] rounded-field border border-line-strong bg-surface-raised p-1 shadow-modal md:right-5"
      >
        <button
          type="button"
          className={item}
          onClick={() => onChange({ ocultarValores: !prefs.ocultarValores })}
        >
          <Check on={prefs.ocultarValores} />
          Ocultar valores
        </button>
        <button
          type="button"
          className={item}
          onClick={() => onChange({ mostrarCentavos: !prefs.mostrarCentavos })}
        >
          <Check on={prefs.mostrarCentavos} />
          Mostrar centavos
        </button>
      </div>
    </>
  );
}

function Check({ on }: { on: boolean }) {
  return (
    <span
      className={cn(
        "flex size-[15px] shrink-0 items-center justify-center rounded-[4px] border",
        on ? "border-primary bg-primary text-white" : "border-line-field",
      )}
    >
      {on && (
        <svg
          width="9"
          height="9"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.4"
          aria-hidden="true"
        >
          <path d="M3 8.5 6.5 12 13 4.5" strokeLinecap="round" />
        </svg>
      )}
    </span>
  );
}

/* ---- Criar / editar (21) ------------------------------------------------ */

export function LancamentoModal({
  produtos,
  mesVisivel,
  usuario,
  row,
  onClose,
}: {
  produtos: ProdutoOption[];
  /** Mês na tela: se o lançamento cair fora dele, navegamos para o dele. */
  mesVisivel: Mes;
  usuario: string;
  /** Presente = edição (mesmo modal, tela 21). */
  row?: LancamentoRow | null;
  onClose: () => void;
}) {
  const router = useRouter();
  const [tipo, setTipo] = useState<LancamentoTipo>(row?.tipo ?? "despesa");
  const [descricao, setDescricao] = useState(row?.descricao ?? "");
  const [valor, setValor] = useState(
    row ? maskValor(String(row.valorCentavos)) : "",
  );
  const [data, setData] = useState(row?.data ?? hojeISO());
  const [categoriaId, setCategoriaId] = useState<CategoriaId | "">(
    row?.categoriaId ?? "",
  );
  const [produtoId, setProdutoId] = useState(row?.produtoId ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const valorCentavos = parseValorCentavos(valor);
  const valido =
    descricao.trim().length > 0 &&
    valorCentavos !== null &&
    valorCentavos > 0 &&
    categoriaId !== "" &&
    data !== "";

  const submit = () => {
    if (pending || !valido) return;
    const input: LancamentoInput = {
      tipo,
      descricao,
      valorCentavos: valorCentavos as number,
      data,
      categoriaId: categoriaId as CategoriaId,
      produtoId: produtoId || null,
    };
    startTransition(async () => {
      const result = row
        ? await atualizarLancamento(row.id, input)
        : await criarLancamento(input);
      if (result.error) {
        setError(result.error);
        return;
      }
      // Lançamento de outro mês: leva a tela até ele, senão ele "some".
      const mesDoLancamento = mesDeData(data);
      if (mesDoLancamento !== mesVisivel)
        router.push(`/financeiro?mes=${mesDoLancamento}`);
      else router.refresh();
      onClose();
    });
  };

  const campo =
    "flex h-11 w-full items-center gap-2 rounded-field border border-line-field bg-surface-1 px-3 text-base text-fg-2 outline-none transition-colors duration-200 focus:border-primary/40 md:h-[38px] md:text-[13px]";

  return (
    <Sheet
      mode="fullscreen"
      title={row ? "Editar lançamento" : "Novo lançamento"}
      onClose={onClose}
      action={{
        label: pending ? "Salvando…" : "Salvar lançamento",
        onClick: submit,
        disabled: pending || !valido,
      }}
      footerStart={
        <span className="text-[11px] text-fg-9">
          Lançado como {usuario} · visível apenas para admins.
        </span>
      }
      panelClassName="md:w-[520px]"
    >
      <div className="flex flex-col gap-[15px] p-4 md:p-[18px]">
        <div className="flex gap-0.5 rounded-field border border-line-strong bg-surface-3 p-0.5">
          {(["receita", "despesa"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTipo(t)}
              className={cn(
                "inline-flex h-10 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-nav text-[13px] font-medium transition-colors duration-200 md:h-[30px] md:text-[12.5px]",
                t === tipo
                  ? "bg-white/[0.09] text-fg-2"
                  : "text-fg-6 hover:text-fg-3",
              )}
            >
              <span
                className="size-1.5 rounded-full"
                style={{ background: corDoTipo(t) }}
              />
              {t === "receita" ? "Receita" : "Despesa"}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-[7px] text-xs font-medium text-fg-5">
          Descrição
          {/* O mockup abre o modal com o cursor já na descrição. */}
          <Input
            autoFocus
            aria-label="Descrição"
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            size="lg"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-[7px] text-xs font-medium text-fg-5">
            Valor
            <div className={cn(campo, "focus-within:border-primary/40")}>
              <span className="text-[13px] text-fg-8">R$</span>
              <input
                inputMode="numeric"
                value={valor}
                onChange={(e) => setValor(maskValor(e.target.value))}
                placeholder="0,00"
                className="min-w-0 flex-1 bg-transparent font-mono text-base text-fg-2 outline-none placeholder:font-sans placeholder:text-fg-8 md:text-[13.5px]"
              />
            </div>
          </label>
          <label className="flex flex-col gap-[7px] text-xs font-medium text-fg-5">
            Data
            <input
              type="date"
              value={data}
              onChange={(e) => setData(e.target.value)}
              className={cn(campo, "cursor-pointer [color-scheme:dark]")}
            />
          </label>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-[7px] text-xs font-medium text-fg-5">
            Categoria
            <div className="relative">
              {categoriaId && (
                <span
                  className="pointer-events-none absolute left-3 top-1/2 size-[7px] -translate-y-1/2 rounded-full"
                  style={{ background: CATEGORIAS[categoriaId].cor }}
                />
              )}
              <select
                value={categoriaId}
                onChange={(e) =>
                  setCategoriaId(e.target.value as CategoriaId | "")
                }
                className={cn(
                  campo,
                  "cursor-pointer appearance-none",
                  categoriaId && "pl-7",
                )}
              >
                <option value="">Selecione…</option>
                {CATEGORIA_IDS.map((id) => (
                  <option key={id} value={id}>
                    {CATEGORIAS[id].nome}
                  </option>
                ))}
              </select>
            </div>
          </label>
          <label className="flex flex-col gap-[7px] text-xs font-medium text-fg-5">
            <span>
              Produto <span className="font-normal text-fg-9">opcional</span>
            </span>
            <div className="relative">
              {produtoId && (
                <span
                  className="pointer-events-none absolute left-3 top-1/2 size-[7px] -translate-y-1/2 rounded-full"
                  style={{
                    background:
                      produtos.find((p) => p.id === produtoId)?.cor ??
                      "#8b95a5",
                  }}
                />
              )}
              <select
                value={produtoId}
                onChange={(e) => setProdutoId(e.target.value)}
                className={cn(
                  campo,
                  "cursor-pointer appearance-none",
                  produtoId && "pl-7",
                )}
              >
                <option value="">Nenhum</option>
                {produtos.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nome}
                  </option>
                ))}
              </select>
            </div>
          </label>
        </div>

        {/* No desktop a nota vive no rodapé (footerStart); aqui é só mobile. */}
        <span className="text-[11px] text-fg-9 md:hidden">
          Lançado como {usuario} · visível apenas para admins.
        </span>
        {error && <p className="text-xs leading-[1.4] text-danger">{error}</p>}
      </div>
    </Sheet>
  );
}

/* ---- Detalhe (22) ------------------------------------------------------- */

function LancamentoDetalhe({
  row,
  prefs,
  onEditar,
  onExcluir,
  onClose,
}: {
  row: LancamentoRow;
  prefs: MoneyPrefs;
  onEditar: () => void;
  onExcluir: () => void;
  onClose: () => void;
}) {
  const cat = CATEGORIAS[row.categoriaId];
  const receita = row.tipo === "receita";
  const rotulo =
    "text-[11px] font-semibold uppercase tracking-[0.05em] text-fg-8";

  return (
    <Sheet
      mode="bottom"
      ariaLabel={row.descricao}
      onClose={onClose}
      panelClassName="md:w-[520px]"
    >
      <div className="flex items-center gap-2.5 border-b border-line px-4 py-3.5 md:px-[18px]">
        <span className="min-w-0 truncate text-[15px] font-semibold text-fg-1 md:text-[14.5px]">
          {row.descricao}
        </span>
        <span
          className="shrink-0 rounded-pill border px-2 py-0.5 text-[11px]"
          style={{
            color: receita ? "#7fd0a5" : "#e08c8c",
            borderColor: receita
              ? "rgba(76,183,130,0.22)"
              : "rgba(224,108,108,0.22)",
            background: receita
              ? "rgba(76,183,130,0.1)"
              : "rgba(224,108,108,0.1)",
          }}
        >
          {receita ? "Receita" : "Despesa"}
        </span>
        <IconButton
          aria-label="Fechar"
          className="ml-auto max-md:hidden"
          onClick={onClose}
        >
          <CloseIcon size={16} />
        </IconButton>
      </div>

      <div className="flex flex-col gap-[18px] px-4 py-5 md:px-[18px]">
        <span
          className="font-mono text-[28px] font-semibold tracking-[-0.02em]"
          style={{ color: corDoTipo(row.tipo) }}
        >
          {formatMoneyComSinal(comSinal(row.tipo, row.valorCentavos), prefs)}
        </span>
        <div className="grid grid-cols-2 gap-x-3 gap-y-4">
          <div className="flex flex-col gap-1.5">
            <span className={rotulo}>Data</span>
            <span className="text-[13px] text-fg-2">
              {labelDataCompleta(row.data)}
            </span>
          </div>
          <div className="flex flex-col gap-1.5">
            <span className={rotulo}>Categoria</span>
            <span className="inline-flex items-center gap-1.5 text-[13px] text-fg-2">
              <span
                className="size-[7px] rounded-full"
                style={{ background: cat.cor }}
              />
              {cat.nome}
            </span>
          </div>
          <div className="flex flex-col gap-1.5">
            <span className={rotulo}>Produto</span>
            {row.produtoNome ? (
              <span className="inline-flex items-center gap-1.5 text-[13px] text-fg-2">
                <span
                  className="size-[7px] rounded-full"
                  style={{ background: row.produtoCor ?? "#8b95a5" }}
                />
                {row.produtoNome}
              </span>
            ) : (
              <span className="text-[13px] text-fg-7">—</span>
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <span className={rotulo}>Lançado por</span>
            <div className="flex items-center gap-[7px]">
              <Avatar
                size={20}
                initials={initialsOf(row.criadoPorNome ?? "—")}
              />
              <span className="truncate text-[13px] text-fg-2">
                {row.criadoPorNome ?? "—"}
              </span>
              <span className="shrink-0 text-[11.5px] text-fg-9">
                {row.criadoEmRelativo}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-[9px] border-t border-line px-4 py-3.5 md:px-[18px]">
        <Button
          variant="secondary"
          size="lg"
          icon={<TrashIcon size={13} />}
          onClick={onExcluir}
          className="border-line-field text-fg-5 hover:border-danger hover:text-[#e08c8c]"
        >
          Excluir
        </Button>
        <div className="ml-auto" />
        <Button variant="secondary" size="lg" onClick={onClose}>
          Fechar
        </Button>
        <Button size="lg" onClick={onEditar}>
          Editar
        </Button>
      </div>
    </Sheet>
  );
}

/* ---- Excluir (22) ------------------------------------------------------- */

function ExcluirConfirm({
  row,
  onExcluido,
  onClose,
}: {
  row: LancamentoRow;
  onExcluido: () => void;
  onClose: () => void;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const submit = () => {
    if (pending) return;
    startTransition(async () => {
      const result = await excluirLancamento(row.id);
      if (result.error) {
        setError(result.error);
        return;
      }
      router.refresh();
      onExcluido();
    });
  };

  return (
    <Sheet
      mode="bottom"
      title="Excluir lançamento?"
      onClose={onClose}
      action={{
        label: pending ? "Excluindo…" : "Excluir",
        onClick: submit,
        disabled: pending,
        destructive: true,
      }}
      panelClassName="md:w-[380px]"
    >
      <div className="flex flex-col gap-2 p-4 md:p-[18px]">
        <p className="text-[13.5px] leading-[1.55] text-fg-5 md:text-[13px]">
          "{row.descricao}" sai do extrato e do saldo. Essa ação não pode ser
          desfeita.
        </p>
        {error && <p className="text-xs leading-[1.4] text-danger">{error}</p>}
      </div>
    </Sheet>
  );
}
