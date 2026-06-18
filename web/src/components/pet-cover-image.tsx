import { getPetImageOrDefault } from "@/lib/pets/image";

type Props = {
  src: string | null | undefined;
  alt: string;
  className?: string;
  /** Prioridade de carregamento no hero da Home. */
  priority?: boolean;
};

/** Foto de capa com <img> nativo — evita 500 do next/image com URLs externas (ImgBB) no Webpack 16. */
export function PetCoverImage({ src, alt, className = "", priority = false }: Props) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={getPetImageOrDefault(src)}
      alt={alt}
      className={className}
      decoding={priority ? "sync" : "async"}
      fetchPriority={priority ? "high" : undefined}
    />
  );
}
