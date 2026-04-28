// App Header Gate
//

"use client";

import { usePathname } from "next/navigation";
import Header from "./Header";

export default function AppHeaderGate() {
  const pathname = usePathname();

  if (pathname === "/" || pathname === "/legal") return null;

  return <Header />;
}
