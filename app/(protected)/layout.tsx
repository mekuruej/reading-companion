import AppAccessGate from "@/components/AppAccessGate";

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppAccessGate>{children}</AppAccessGate>;
}