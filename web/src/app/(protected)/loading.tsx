/** Fallback instantaneo nas trocas de rota (RSC) — melhora percecao de velocidade no WebView. */
export default function ProtectedRouteLoading() {
  return (
    <main className="ios-safe-top min-h-screen px-3 pb-28 pt-4 sm:px-6">
      <div className="mx-auto w-full max-w-[440px] space-y-3" aria-busy="true" aria-label="Carregando">
        <div className="h-[72px] animate-pulse rounded-[28px] bg-zinc-100/90" />
        <div className="h-[180px] animate-pulse rounded-[26px] bg-zinc-100/90" />
        <div className="h-[120px] animate-pulse rounded-[26px] bg-zinc-100/90" />
        <div className="h-[140px] animate-pulse rounded-[26px] bg-zinc-100/90" />
        <span className="sr-only">Carregando…</span>
      </div>
    </main>
  );
}
