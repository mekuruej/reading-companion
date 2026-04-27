import type { Metadata } from "next";
import AppHeaderGate from "@/components/AppHeaderGate";
import SupportProjectFooterGate from "@/components/SupportProjectFooterGate";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mekuru Reading Companion | ページをめくって、話しまくろう",
  description: "Every word carries the memory of where you met it.",
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
