// App Header Gate
//

"use client";

import { usePathname } from "next/navigation";
import Header from "./Header";

const HIDDEN_HEADER_ROUTES = new Set([
  "/",
  "/japanese",
  "/english",
  "/dashboard",
  "/login",
  "/legal",
  "/terms",
  "/privacy",
]);

export default function AppHeaderGate() {
  const pathname = usePathname();

  if (HIDDEN_HEADER_ROUTES.has(pathname)) {
    return null;
  }

  return <Header />;
}
