import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// 1. Configuração de cores e tela para o celular
export const viewport: Viewport = {
  themeColor: "#020617", // Cor da barra do sistema/navegador
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

// 2. Metadados e configurações do PWA
export const metadata: Metadata = {
  title: "CENTRAL-OS",
  description: "Gestão e acompanhamento de ordens de serviço",
  manifest: "/manifest.json", //
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "CENTRAL-OS",
  },
  icons: {
    icon: "/icon-192.png",
    apple: "/icon-192.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-slate-950 text-slate-100">
        {children}
      </body>
    </html>
  );
}
