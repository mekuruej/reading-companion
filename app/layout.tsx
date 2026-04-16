import type { Metadata } from "next";
import "./globals.css";
import AppHeaderGate from "../components/AppHeaderGate";

export const metadata: Metadata = {
  title: "Mekuru Reading Companion | ページをめくって、話しまくろう",
  description: "Every word carries the memory of where you met it.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-white text-black flex flex-col">
        <AppHeaderGate />
        <main className="flex-1">{children}</main>
      </body>
    </html>
  );
}