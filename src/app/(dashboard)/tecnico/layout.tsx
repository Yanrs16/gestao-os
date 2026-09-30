import ProtectedLayoutWrapper from "@/components/ProtectedLayoutWrapper";

export default function TecnicoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ProtectedLayoutWrapper>{children}</ProtectedLayoutWrapper>;
}
