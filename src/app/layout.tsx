import type { Metadata } from "next";
import { Archivo } from "next/font/google";
import "./globals.css";

// Archivo variável (peso e largura num único arquivo): largura normal no texto e
// semi-expandida em títulos e na marca. Tem algarismos tabulares para as colunas de valores.
const archivo = Archivo({
  subsets: ["latin"],
  variable: "--font-archivo",
  display: "swap",
  axes: ["wdth"],
});

// Renderização dinâmica: a CSP usa um nonce novo por requisição (ver middleware).
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Slanko",
  description: "Gestão de contratos de suporte com SLA e rentabilidade",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className={`${archivo.variable} ${archivo.className}`}>{children}</body>
    </html>
  );
}
