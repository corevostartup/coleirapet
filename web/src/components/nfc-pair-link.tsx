"use client";

import Link from "next/link";
import type { ComponentProps } from "react";

type NativeWindow = Window & {
  __COLEIRAPET_IOS_APP__?: boolean;
  ColeiraPetNativeNFC?: { startPairing: () => void };
};

export function NFCPairLink(props: Omit<ComponentProps<typeof Link>, "href"> & { href?: string }) {
  const { href = "/profile", onClick, ...rest } = props;

  return (
    <Link
      href={href}
      {...rest}
      onClick={(e) => {
        onClick?.(e);
        if (e.defaultPrevented) return;
        const w = typeof window !== "undefined" ? (window as NativeWindow) : undefined;
        if (w?.__COLEIRAPET_IOS_APP__ && w.ColeiraPetNativeNFC?.startPairing) {
          e.preventDefault();
          w.ColeiraPetNativeNFC.startPairing();
          return;
        }
        e.preventDefault();
        window.alert("Baixe o app para fazer o pareamento.");
      }}
    />
  );
}
