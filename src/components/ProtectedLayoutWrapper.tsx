"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function ProtectedLayoutWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    // 1. Escuta mudanças de auth em tempo real (ex: deslogou em outra aba aberta)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        router.refresh();
        router.replace("/login");
      }
    });

    // 2. Trata o botão "Voltar" / "Avançar" do navegador (BFCache)
    const handlePageShow = async (event: PageTransitionEvent) => {
      // Se a página foi carregada do cache da memória do navegador
      if (event.persisted) {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
          router.refresh();
          router.replace("/login");
        }
      }
    };

    window.addEventListener("pageshow", handlePageShow);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener("pageshow", handlePageShow);
    };
  }, [router, supabase]);

  return <>{children}</>;
}
