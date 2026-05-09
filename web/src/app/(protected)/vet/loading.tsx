export default function VetRouteLoading() {
  return (
    <main className="ios-safe-top min-h-screen px-3 pb-28 pt-4 sm:px-6">
      <div className="mx-auto w-full max-w-[440px] space-y-3" aria-busy="true" aria-label="Carregando">
        <div className="h-[72px] animate-pulse rounded-[28px] bg-sky-50/90" />
        <div className="h-[200px] animate-pulse rounded-[26px] bg-sky-50/90" />
        <div className="h-[100px] animate-pulse rounded-[26px] bg-sky-50/90" />
        <span className="sr-only">Carregando…</span>
      </div>
    </main>
  );
}
