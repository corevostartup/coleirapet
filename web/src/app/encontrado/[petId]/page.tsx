import { Suspense } from "react";
import { EncontradoForm } from "./encontrado-form";

export default async function EncontradoPage(props: { params: Promise<{ petId: string }> }) {
  const { petId } = await props.params;

  return (
    <main className="min-h-screen bg-zinc-50">
      <Suspense
        fallback={
          <div className="flex min-h-[40vh] items-center justify-center text-sm text-zinc-500">Carregando...</div>
        }
      >
        <EncontradoForm petId={petId} />
      </Suspense>
    </main>
  );
}
