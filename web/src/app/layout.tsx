import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import { SplashScreenRoot } from "@/components/splash-screen-root";
import "./globals.css";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist-sans" });

export const metadata: Metadata = { title: "ColeiraPet" };

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={geist.variable}>
      <body className="font-[family-name:var(--font-geist-sans)]">
        <SplashScreenRoot />
        {children}
      </body>
    </html>
  );
}
