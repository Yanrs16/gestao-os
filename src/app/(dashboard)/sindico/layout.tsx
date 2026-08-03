import ProtectedLayoutWrapper from "@/components/ProtectedLayoutWrapper";

export default function SindicoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ProtectedLayoutWrapper>{children}</ProtectedLayoutWrapper>;
}
