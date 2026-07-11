import Link from "next/link";
import { ChevronRightIcon } from "@/components/icons";
import { db } from "@/db";
import { formatRelative, STAGES } from "@/lib/product-constants";
import { NewProductModal } from "./new-product-modal";

export default async function ProductsPage() {
  const products = await db.query.product.findMany({
    columns: {
      name: true,
      code: true,
      description: true,
      stage: true,
      updatedAt: true,
    },
    with: { cards: { columns: { status: true } } },
    orderBy: (p, { desc }) => desc(p.updatedAt),
  });

  const rows = products.map((p) => {
    const stage = STAGES[p.stage] ?? STAGES[0];
    const active = p.cards.filter(
      (c) => c.status === "progress" || c.status === "review",
    ).length;
    return {
      name: p.name,
      code: p.code,
      desc: p.description,
      initial: p.name.charAt(0),
      color: stage.color,
      stageName: stage.name,
      activeCountLabel:
        active > 0
          ? `${active} ${active === 1 ? "card ativo" : "cards ativos"}`
          : "Sem cards",
      updated: formatRelative(p.updatedAt),
    };
  });

  return (
    <>
      <header className="flex h-14 shrink-0 items-center gap-[9px] border-b border-line px-4 md:h-[53px] md:px-5">
        <span className="text-[20px] font-semibold text-fg-1 md:text-sm">
          Produtos
        </span>
        <span className="text-xs text-fg-8">{rows.length}</span>
        <div className="ml-auto" />
        <NewProductModal />
      </header>
      <div className="flex-1 overflow-auto p-4 md:p-5">
        {rows.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-16 text-center">
            <span className="text-sm text-fg-5">
              Nenhum produto cadastrado.
            </span>
            <span className="text-xs text-fg-8">
              Crie o primeiro com “Novo produto”.
            </span>
          </div>
        )}
        <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-3.5">
          {rows.map((p) => (
            <Link
              key={p.code}
              href={`/produtos/${p.code}`}
              className="flex flex-col gap-3 rounded-[11px] border border-[rgba(255,255,255,0.07)] bg-[#0c0d10] p-4 transition-colors duration-150 hover:border-[rgba(255,255,255,0.16)] hover:bg-[#0e0f13]"
            >
              <div className="flex items-center gap-[11px]">
                <div
                  className="flex size-[34px] shrink-0 items-center justify-center rounded-[9px] text-[15px] font-semibold text-white"
                  style={{
                    background: p.color,
                    boxShadow: `0 4px 14px -4px ${p.color}66`,
                  }}
                >
                  {p.initial}
                </div>
                <div className="flex min-w-0 flex-col gap-0.5">
                  <span className="text-[14.5px] font-semibold tracking-[-0.01em] text-[#e8e9ec]">
                    {p.name}
                  </span>
                  <span className="font-mono text-[10.5px] tracking-[0.03em] text-fg-6">
                    {p.code}
                  </span>
                </div>
                <span className="ml-auto shrink-0 text-fg-9">
                  <ChevronRightIcon size={15} />
                </span>
              </div>
              <p className="line-clamp-2 min-h-[38px] text-[12.5px] leading-normal text-fg-7">
                {p.desc}
              </p>
              <div className="flex items-center gap-2 border-t border-[rgba(255,255,255,0.05)] pt-[11px]">
                <span
                  className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-pill border py-[2.5px] pl-[7px] pr-2 text-[11px] font-medium text-[#c5c7cf]"
                  style={{
                    background: `${p.color}1c`,
                    borderColor: `${p.color}40`,
                  }}
                >
                  <span
                    className="size-1.5 rounded-full"
                    style={{ background: p.color }}
                  />
                  {p.stageName}
                </span>
                <span className="ml-auto whitespace-nowrap text-[11.5px] text-fg-7">
                  {p.activeCountLabel}
                </span>
                <span className="size-[3px] shrink-0 rounded-full bg-[#3a3d45]" />
                <span className="whitespace-nowrap text-[11.5px] text-fg-9">
                  {p.updated}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}
