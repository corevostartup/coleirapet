"use client";

import { getPetImageOrDefault } from "@/lib/pets/image";

type Props = {
  src: string | null | undefined;
  alt: string;
  className?: string;
};

/** Foto do pet com <img> nativo — evita falhas do next/image com URLs externas (ImgBB) no Webpack 16. */
export function PetAvatarImage({ src, alt, className = "" }: Props) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={getPetImageOrDefault(src)} alt={alt} className={className} decoding="async" />
  );
}
