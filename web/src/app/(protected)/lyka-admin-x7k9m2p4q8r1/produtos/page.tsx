"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { AdminSidebar, ADMIN_BASE_PATH } from "@/components/admin-sidebar";
import { TopBar } from "@/components/shell";
import type { CarouselProduct } from "@/lib/carousel-products/types";

export default function AdminProdutosPage() {
  const [products, setProducts] = useState<CarouselProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [image, setImage] = useState("");
  const [ctaLabel, setCtaLabel] = useState("");
  const [ctaHref, setCtaHref] = useState("");
  const [sortOrder, setSortOrder] = useState<number>(0);

  const resetForm = useCallback(() => {
    setEditingId(null);
    setTitle("");
    setDescription("");
    setImage("");
    setCtaLabel("");
    setCtaHref("");
    setSortOrder(0);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/carousel-products", { cache: "no-store" });
      const data = (await res.json().catch(() => null)) as { products?: CarouselProduct[]; error?: string } | null;
      if (!res.ok) throw new Error(data?.error ?? "Falha ao carregar.");
      setProducts(data?.products ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao carregar.");
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function startEdit(p: CarouselProduct) {
    setEditingId(p.id);
    setTitle(p.title);
    setDescription(p.description);
    setImage(p.image);
    setCtaLabel(p.ctaLabel);
    setCtaHref(p.ctaHref);
    setSortOrder(p.sortOrder);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      if (editingId) {
        const res = await fetch("/api/admin/carousel-products", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: editingId,
            title,
            description,
            image,
            ctaLabel,
            ctaHref,
            sortOrder,
          }),
        });
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        if (!res.ok) throw new Error(data?.error ?? "Falha ao salvar.");
      } else {
        const res = await fetch("/api/admin/carousel-products", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title,
            description,
            image,
            ctaLabel,
            ctaHref,
          }),
        });
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        if (!res.ok) throw new Error(data?.error ?? "Falha ao criar.");
      }
      resetForm();
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Remover este produto do carrossel?")) return;
    setError(null);
    try {
      const res = await fetch(`/api/admin/carousel-products?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) throw new Error(data?.error ?? "Falha ao remover.");
      if (editingId === id) resetForm();
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao remover.");
    }
  }

  return (
    <main className="ios-safe-top min-h-screen px-3 py-4 pb-10 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-[1320px]">
        <TopBar
          title="Produtos do carrossel"
          subtitle="Painel administrativo Lyka"
          action={
            <Link
              href={ADMIN_BASE_PATH}
              className="rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-zinc-700 transition hover:bg-zinc-50"
            >
              Voltar ao painel
            </Link>
          }
        >
          <p className="rounded-2xl border border-violet-200 bg-violet-50 px-3 py-2 text-[11px] text-violet-900">
            Estes itens aparecem no carrossel <strong>Produtos</strong> da Home. Com o banco vazio, a Home usa os anuncios padrao do app.
          </p>
        </TopBar>

        <div className="mt-3 grid gap-3 lg:grid-cols-12">
          <aside className="appear-up lg:col-span-3 xl:col-span-2" style={{ animationDelay: "20ms" }}>
            <AdminSidebar />
          </aside>

          <div className="space-y-3 lg:col-span-9 xl:col-span-10">
            <section className="appear-up rounded-[26px] bg-white p-4 shadow-[0_16px_28px_-22px_rgba(10,16,13,0.35)]" style={{ animationDelay: "40ms" }}>
              <h2 className="text-[14px] font-semibold text-zinc-900">{editingId ? "Editar produto" : "Novo produto"}</h2>
              <p className="mt-1 text-[11px] text-zinc-500">
                Imagem: URL completa (https://...) ou caminho local (ex.: /img/coleira.png). Ordem: numero menor aparece primeiro.
              </p>

              <form onSubmit={(e) => void handleSubmit(e)} className="mt-3 grid gap-3 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="text-[11px] font-semibold text-zinc-600">Titulo</label>
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-[13px] outline-none focus:border-emerald-400"
                    required
                    minLength={2}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-[11px] font-semibold text-zinc-600">Descricao</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    className="mt-1 w-full resize-none rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-[13px] outline-none focus:border-emerald-400"
                    required
                    minLength={2}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-[11px] font-semibold text-zinc-600">Imagem (URL ou /caminho)</label>
                  <input
                    value={image}
                    onChange={(e) => setImage(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-[13px] outline-none focus:border-emerald-400"
                    required
                    placeholder="/img/coleira.png"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-zinc-600">Texto do botao</label>
                  <input
                    value={ctaLabel}
                    onChange={(e) => setCtaLabel(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-[13px] outline-none focus:border-emerald-400"
                    required
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-zinc-600">Link do botao</label>
                  <input
                    value={ctaHref}
                    onChange={(e) => setCtaHref(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-[13px] outline-none focus:border-emerald-400"
                    required
                    placeholder="https://... ou #"
                  />
                </div>
                {editingId ? (
                  <div>
                    <label className="text-[11px] font-semibold text-zinc-600">Ordem (0 = primeiro)</label>
                    <input
                      type="number"
                      min={0}
                      value={sortOrder}
                      onChange={(e) => setSortOrder(Number.parseInt(e.target.value, 10) || 0)}
                      className="mt-1 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-[13px] outline-none focus:border-emerald-400"
                    />
                  </div>
                ) : null}

                {error ? <p className="sm:col-span-2 text-[12px] font-medium text-rose-600">{error}</p> : null}

                <div className="flex flex-wrap gap-2 sm:col-span-2">
                  <button
                    type="submit"
                    disabled={saving}
                    className="rounded-xl bg-emerald-600 px-4 py-2.5 text-[13px] font-semibold text-white hover:bg-emerald-700 disabled:bg-zinc-300"
                  >
                    {saving ? "Salvando..." : editingId ? "Salvar alteracoes" : "Adicionar produto"}
                  </button>
                  {editingId ? (
                    <button
                      type="button"
                      onClick={resetForm}
                      className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-[13px] font-semibold text-zinc-700 hover:bg-zinc-100"
                    >
                      Cancelar edicao
                    </button>
                  ) : null}
                </div>
              </form>
            </section>

            <section className="appear-up rounded-[26px] bg-white p-4 shadow-[0_16px_28px_-22px_rgba(10,16,13,0.35)]" style={{ animationDelay: "60ms" }}>
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-[14px] font-semibold text-zinc-900">No carrossel ({products.length})</h2>
                <button
                  type="button"
                  onClick={() => void load()}
                  className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-[11px] font-semibold text-zinc-700 hover:bg-zinc-100"
                >
                  Recarregar
                </button>
              </div>

              {loading ? (
                <p className="text-[12px] text-zinc-500">Carregando...</p>
              ) : products.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/80 px-3 py-4 text-[12px] text-zinc-500">
                  Nenhum produto no Firestore. A Home continua exibindo os anuncios padrao ate voce adicionar itens aqui.
                </p>
              ) : (
                <ul className="space-y-2">
                  {products.map((p) => (
                    <li
                      key={p.id}
                      className="flex flex-col gap-2 rounded-2xl border border-zinc-200 bg-zinc-50/90 p-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-semibold text-zinc-900">
                          <span className="mr-2 rounded bg-zinc-200 px-1.5 py-0.5 font-mono text-[10px] text-zinc-600">{p.sortOrder}</span>
                          {p.title}
                        </p>
                        <p className="mt-0.5 line-clamp-2 text-[11px] text-zinc-600">{p.description}</p>
                        <p className="mt-1 truncate text-[10px] text-zinc-500">{p.image}</p>
                      </div>
                      <div className="flex shrink-0 gap-2">
                        <button
                          type="button"
                          onClick={() => startEdit(p)}
                          className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-[11px] font-semibold text-zinc-800 hover:bg-zinc-50"
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDelete(p.id)}
                          className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-[11px] font-semibold text-rose-800 hover:bg-rose-100"
                        >
                          Remover
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}
