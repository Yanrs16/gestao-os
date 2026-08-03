"use client";

import { usePathname } from "next/navigation";
import ProtectedLayoutWrapper from "@/components/ProtectedLayoutWrapper";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  // Se estiver na tela de login do admin, não ativa a verificação de sessão do wrapper
  const isLoginPage = pathname === "/admin/login";

  if (isLoginPage) return <>{children}</>;

  return <ProtectedLayoutWrapper>{children}</ProtectedLayoutWrapper>;
}
