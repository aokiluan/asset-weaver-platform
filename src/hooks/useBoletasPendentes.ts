import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Conta investidores em estágio "boleta_em_andamento" que ainda NÃO têm
 * boleta aberta vinculada (i.e. precisam ter uma boleta iniciada).
 * Atualiza em tempo real via Realtime nas tabelas envolvidas.
 */
export function useBoletasPendentes() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const [contactsRes, boletasRes] = await Promise.all([
        supabase
          .from("investor_contacts")
          .select("id")
          .eq("stage", "boleta_em_andamento"),
        supabase
          .from("investor_boletas")
          .select("contact_id,status")
          .not("status", "in", "(concluida,cancelada)"),
      ]);

      if (cancelled) return;

      const contacts = (contactsRes.data ?? []) as { id: string }[];
      const boletas = (boletasRes.data ?? []) as { contact_id: string }[];
      const withOpenBoleta = new Set(boletas.map((b) => b.contact_id));
      const pending = contacts.filter((c) => !withOpenBoleta.has(c.id)).length;
      setCount(pending);
    }

    load();

    const channel = supabase
      .channel("boletas-pendentes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "investor_contacts" },
        () => load(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "investor_boletas" },
        () => load(),
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, []);

  return { count };
}
