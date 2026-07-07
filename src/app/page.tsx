import Link from "next/link";
import { PRODUCTS } from "@/lib/mock-data";

// ponytail: dev-only index of screens; delete when real auth/routing lands.
const PAGES = [
  { href: "/login", label: "01/07 · Login (GitHub, Google, email+senha)" },
  {
    href: "/produtos",
    label: "02/03 · Lista de produtos + modal Novo produto",
  },
  {
    href: "/produtos/POR",
    label: "04/05/06 · Página do produto (board, composer, painel do card)",
  },
  { href: "/esqueci-senha", label: "08 · Recuperar senha" },
  { href: "/sem-convite", label: "10 · Sem convite" },
  { href: "/time", label: "Time (membros, convites, roles)" },
  { href: "/design-system", label: "Design system (especímenes)" },
];

export default function Home() {
  return (
    <main className="mx-auto max-w-[560px] px-6 py-16">
      <h1 className="mb-1 text-[22px] font-semibold tracking-[-0.02em] text-fg-1">
        Átrios Management
      </h1>
      <p className="mb-8 text-[13.5px] text-fg-6">
        Índice das telas implementadas (mocks).
      </p>
      <div className="flex flex-col gap-2">
        {PAGES.map((p) => (
          <Link
            key={p.href}
            href={p.href}
            className="flex items-baseline gap-3 rounded-field border border-line bg-surface-card px-4 py-3 text-[13.5px] text-fg-2 transition-colors duration-200 hover:border-line-hover hover:bg-surface-card-hover"
          >
            {p.label}
            <span className="ml-auto font-mono text-[11px] text-fg-7">
              {p.href}
            </span>
          </Link>
        ))}
      </div>
      <p className="mb-2 mt-8 text-[11px] font-semibold uppercase tracking-[0.06em] text-fg-8">
        Produtos
      </p>
      <div className="flex flex-wrap gap-2">
        {PRODUCTS.map((p) => (
          <Link
            key={p.code}
            href={`/produtos/${p.code}`}
            className="inline-flex items-center gap-2 rounded-btn border border-line bg-surface-card px-3 py-1.5 text-[12.5px] text-fg-3 transition-colors duration-200 hover:border-line-hover hover:bg-surface-card-hover"
          >
            <span
              className="size-[7px] rounded-full"
              style={{ background: p.color }}
            />
            {p.name}
          </Link>
        ))}
      </div>
    </main>
  );
}
