import type { Metadata } from "next";

// Root layout placeholder until the dashboard UI is implemented.

export const metadata: Metadata = {
  title: "Slanko",
  description: "IT support contract management",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
