import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";

import { GITHUB_URL, SiteSidebar, SiteTopBar } from "@/components/site/site-nav";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains" });

export const metadata: Metadata = {
  title: {
    default: "Tom Tesson — data engineer, portfolio Antilles",
    template: "%s · Tom Tesson",
  },
  description:
    "Cinq projets de data engineering sur des données réelles des Antilles : batch, IoT, temps réel, lakehouse et entrepôt cloud. Comment ils fonctionnent et ce qu’ils démontrent.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fr" className={`h-full antialiased ${inter.variable} ${mono.variable}`}>
      <body className="min-h-full font-sans lg:flex">
        <SiteSidebar />
        <SiteTopBar />
        <div className="flex min-h-full min-w-0 flex-1 flex-col">
          <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10 sm:px-8 lg:px-12 lg:py-14">{children}</main>
          <footer className="border-t border-border">
            <div className="mx-auto flex max-w-5xl flex-wrap justify-between gap-4 px-4 py-6 text-sm text-ink-muted sm:px-8 lg:px-12">
              <span>Tom Tesson · data engineer · Antilles</span>
              <span>
                Données : Open-Meteo, Météo-France, NOAA, AIS (licences ouvertes). Code source sur{" "}
                <a href={GITHUB_URL} className="underline hover:text-ink">
                  GitHub
                </a>
                .
              </span>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
