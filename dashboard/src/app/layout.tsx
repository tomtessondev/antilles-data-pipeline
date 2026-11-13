import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Antilles weather & air quality",
    template: "%s · Antilles weather & air quality",
  },
  description:
    "Daily weather, rainfall and air quality (PM10, Saharan dust) for six towns in Guadeloupe and Martinique.",
};

const REPO_URL = "https://github.com/tomtessondev/antilles-data-pipeline";
const DOCS_URL = "https://tomtessondev.github.io/antilles-data-pipeline/";

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="flex min-h-full flex-col font-sans">
        <header className="border-b border-border">
          <div className="mx-auto flex max-w-6xl items-baseline justify-between gap-4 px-4 py-4">
            <Link href="/" className="font-semibold tracking-tight">
              Antilles weather &amp; air quality
            </Link>
            <nav className="flex gap-4 text-sm text-ink-secondary">
              <a href={DOCS_URL} className="hover:text-ink">
                Data model
              </a>
              <a href={REPO_URL} className="hover:text-ink">
                Source
              </a>
            </nav>
          </div>
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">{children}</main>
        <footer className="border-t border-border">
          <p className="mx-auto max-w-6xl px-4 py-4 text-sm text-ink-muted">
            Data: <a href="https://open-meteo.com/" className="underline">Open-Meteo</a>{" "}
            forecast and air-quality APIs (CAMS model), CC BY 4.0. Commune outlines: IGN Admin
            Express, Licence Ouverte. Extracted daily into DuckDB and modelled with dbt.
          </p>
        </footer>
      </body>
    </html>
  );
}
