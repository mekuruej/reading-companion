// Root Layout
//

import type { Metadata } from "next";
import AppHeaderGate from "@/components/AppHeaderGate";
import SupportProjectFooterGate from "@/components/SupportProjectFooterGate";
import "./globals.css";

export const metadata = {
  title: "Mekuru | ページをめくって、話しまくろう",
  description:
    "Every word carries the memory of where you met it.",
  openGraph: {
    title: "Mekuru | ページをめくって、話しまくろう",
    description:
      "Every word carries the memory of where you met it.",
    url: "https://mekurureads.com",
    siteName: "Mekuru",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Mekuru",
      },
    ],
    locale: "en_US",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col bg-white text-black">
        <AppHeaderGate />
        <main className="flex-1">{children}</main>
        <SupportProjectFooterGate />
      </body>
    </html>
  );
}
