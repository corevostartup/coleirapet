"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

type Slide = {
  id: string;
  title: string;
  description: string;
  image: string;
  ctaLabel: string;
  ctaHref: string;
};

const FALLBACK_SLIDES: Slide[] = [
  {
    id: "fallback-0",
    title: "Coleira inteligente Lyka",
    description: "Monitoramento continuo de atividade, sono e seguranca em tempo real.",
    image: "/img/coleira.png",
    ctaLabel: "Saiba mais",
    ctaHref: "#",
  },
  {
    id: "fallback-1",
    title: "Esteira MalhaCao",
    description: "Treino indoor seguro para gasto de energia e condicionamento fisico.",
    image: "/img/esteira.png",
    ctaLabel: "Comprar agora",
    ctaHref: "https://malhacaopet.com.br/products/esteira-para-cachorros-malhacao-m-1-2m?variant=46728550056189",
  },
];

export function ProductCarousel() {
  const [slides, setSlides] = useState<Slide[]>(FALLBACK_SLIDES);
  const [active, setActive] = useState(0);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/carousel-products")
      .then((r) => r.json())
      .then((d: { products?: Array<{ id: string; title: string; description: string; image: string; ctaLabel: string; ctaHref: string }> }) => {
        if (cancelled || !d.products?.length) return;
        setSlides(
          d.products.map((p) => ({
            id: p.id,
            title: p.title,
            description: p.description,
            image: p.image,
            ctaLabel: p.ctaLabel,
            ctaHref: p.ctaHref,
          })),
        );
        setActive(0);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (slides.length <= 1) return;
    const timer = setInterval(() => {
      setActive((prev) => (prev + 1) % slides.length);
    }, 6500);

    return () => clearInterval(timer);
  }, [slides.length]);

  return (
    <div>
      <div className="relative overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-50">
        <div
          className="flex transition-transform duration-700 ease-out"
          style={{ transform: `translateX(-${active * 100}%)` }}
        >
          {slides.map((slide) => (
            <article key={slide.id} className="relative min-w-full">
              <div className="flex h-[152px]">
                <div className="relative w-[42%] overflow-hidden border-r border-zinc-200">
                  <Image
                    src={slide.image}
                    alt={slide.title}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 40vw, 180px"
                    unoptimized
                  />
                  <span className="absolute left-2 top-2 rounded-full bg-black/65 px-2 py-0.5 text-[10px] font-semibold text-white">
                    ANUNCIO
                  </span>
                </div>

                <div className="flex w-[58%] flex-col justify-center p-3">
                  <p className="text-[11px] text-zinc-600">{slide.description}</p>
                  <a
                    href={slide.ctaHref}
                    target={slide.ctaHref.startsWith("http") ? "_blank" : undefined}
                    rel={slide.ctaHref.startsWith("http") ? "noreferrer" : undefined}
                    className="mt-2 inline-block rounded-full bg-emerald-500 px-3 py-1.5 text-[11px] font-medium text-white"
                  >
                    {slide.ctaLabel}
                  </a>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>

      <div className="mt-2 flex items-center justify-center gap-1.5">
        {slides.map((slide, idx) => (
          <button
            key={slide.id}
            aria-label={`Ir para produto ${idx + 1}`}
            onClick={() => setActive(idx)}
            className={`h-1.5 rounded-full transition-all ${active === idx ? "w-5 bg-emerald-500" : "w-1.5 bg-zinc-300"}`}
          />
        ))}
      </div>
    </div>
  );
}
