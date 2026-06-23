"use client";

import "./globals.css";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="es">
      <body>
        <div
          className="min-h-screen flex flex-col items-center justify-center gap-4 px-6 text-center"
          style={{ background: "var(--bg)" }}
        >
          <p className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
            Algo salió mal
          </p>
          <p className="text-sm max-w-sm" style={{ color: "var(--text-secondary)" }}>
            Ocurrió un error inesperado. Intenta recargar la página; si el problema persiste,
            vuelve más tarde.
          </p>
          <button
            onClick={reset}
            className="mt-2 py-3 px-6 rounded-lg text-sm font-semibold transition-opacity active:opacity-70"
            style={{ background: "var(--btn-primary-bg)", color: "var(--btn-primary-text)" }}
          >
            Reintentar
          </button>
        </div>
      </body>
    </html>
  );
}
