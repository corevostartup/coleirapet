import type { ComponentProps } from "react";

type SvgProps = ComponentProps<"svg">;

/** Logotipo Apple (glyph) para botão escuro — alinhado às diretrizes de contraste do Sign in with Apple. */
export function AppleSignInGlyph(props: SvgProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden focusable="false" {...props}>
      <path
        fill="currentColor"
        d="M16.365 1.43c0 1.14-.41 2.26-1.23 3.25-.83 1-1.95 1.77-3.13 1.95-.13-1.06.34-2.1 1.05-2.9.71-.8 1.74-1.42 2.9-1.67.15 1.05-.03 2.1-.59 3.37Zm4.29 14.51c-.55 1.28-1.22 2.45-2 3.52-.95 1.3-1.73 2.2-2.62 2.2-.88 0-1.46-.5-2.75-.5-1.3 0-1.7.52-2.77.52-.9 0-1.6-.85-2.55-2.32-1.39-2.4-2.5-6.1-2.5-9.62 0-2.8 1.85-4.28 3.66-4.28.96 0 1.76.62 2.36.62.58 0 1.48-.66 2.56-.66.41 0 1.93.04 2.93 1.58-2.54 1.38-2.13 4.98.44 6.24Z"
      />
    </svg>
  );
}

/** Logotipo Google “G” oficial (quatro cores). */
export function GoogleSignInGlyph(props: SvgProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden focusable="false" {...props}>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22 0.81-0.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}
