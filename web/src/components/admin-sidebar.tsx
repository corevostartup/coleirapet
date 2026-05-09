"use client";

import { usePathname } from "next/navigation";

export const ADMIN_BASE_PATH = "/lyka-admin-x7k9m2p4q8r1";

const items: { label: string; href: string }[] = [
  { label: "Visao geral", href: `${ADMIN_BASE_PATH}#admin-overview` },
  { label: "Usuarios", href: `${ADMIN_BASE_PATH}#admin-usuarios` },
  { label: "Moderacao", href: `${ADMIN_BASE_PATH}#admin-moderacao` },
  { label: "Suporte", href: `${ADMIN_BASE_PATH}#admin-suporte` },
  { label: "Produtos", href: `${ADMIN_BASE_PATH}/produtos` },
  { label: "Termos de Uso", href: `${ADMIN_BASE_PATH}#admin-termos` },
  { label: "Politicas de Privacidade", href: `${ADMIN_BASE_PATH}#admin-privacidade` },
  { label: "Financeiro", href: `${ADMIN_BASE_PATH}#admin-financeiro` },
  { label: "Regioes", href: `${ADMIN_BASE_PATH}#admin-regioes` },
  { label: "Auditoria", href: `${ADMIN_BASE_PATH}#admin-auditoria` },
  { label: "Acoes rapidas", href: `${ADMIN_BASE_PATH}#admin-acoes` },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const onProdutos = pathname === `${ADMIN_BASE_PATH}/produtos` || pathname?.startsWith(`${ADMIN_BASE_PATH}/produtos/`);

  return (
    <nav className="sticky top-4 rounded-[24px] border border-zinc-200 bg-white p-3 shadow-[0_12px_24px_-20px_rgba(15,23,42,0.45)]">
      <p className="px-2 pb-2 text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Menu administrativo</p>
      <ul className="space-y-1">
        {items.map((item) => {
          const isProdutosLink = item.href === `${ADMIN_BASE_PATH}/produtos`;
          const active = isProdutosLink && onProdutos;
          return (
            <li key={item.href}>
              <a
                href={item.href}
                className={`block rounded-xl px-2.5 py-2 text-[12px] font-medium transition ${
                  active ? "bg-emerald-50 text-emerald-800" : "text-zinc-700 hover:bg-emerald-50 hover:text-emerald-800"
                }`}
              >
                {item.label}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
