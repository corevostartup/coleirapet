import type { ReactNode } from "react";
import { TagNfcWebProgressOverlay } from "@/components/tag-nfc-web-progress-overlay";

export default function TagNfcLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <TagNfcWebProgressOverlay />
      {children}
    </>
  );
}
