import type { Metadata } from "next";
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
        <main className="flex-1">{children}</main>
        <footer className="border-t border-stone-200 bg-stone-50">
          <div className="mx-auto flex max-w-6xl justify-center px-6 py-6">
            <a
              href="https://ko-fi.com/japanesemekuru"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center rounded-xl border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-700 transition hover:bg-stone-100"
            >
              Support this project
            </a>
          </div>
        </footer>
      </body>
    </html>
  );
}
