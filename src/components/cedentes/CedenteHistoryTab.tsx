import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Loader2, Send, MessageSquare, ArrowRight, Pencil, FileDown, Vote, Ban, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { CedenteStage, STAGE_LABEL, STAGE_COLORS } from "@/lib/cedente-stages";
import { downloadAtaById } from "@/lib/comite-ata-pdf";

interface HistoryItem {
  id: string;
  cedente_id: string;
  user_id: string | null;
  evento: string;
  stage_anterior: CedenteStage | null;
  stage_novo: CedenteStage | null;
  detalhes: { comentario?: string; minute_id?: string; decisao?: string } | null;
  created_at: string;
}

interface ProfileLite { id: string; nome: string; cargo: string | null }

interface Props { cedenteId: string }

const fmtDateTime = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });

const dayKey = (iso: string) => new Date(iso).toLocaleDateString("pt-BR", { dateStyle: "full" } as any);

const initials = (name: string) =>
  name.split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("");

export function CedenteHistoryTab({ cedenteId }: Props) {
  const { user } = useAuth();
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [profiles, setProfiles] = useState<Record<string, ProfileLite>>({});
  const [loading, setLoading] = useState(true);
  const [comment, setComment] = useState("");
  const [posting, setPosting] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  const load = async () => {
    const { data, error } = await supabase
      .from("cedente_history")
      .select("*")
      .eq("cedente_id", cedenteId)
      .order("created_at", { ascending: false });
    if (error) {
      toast.error("Erro ao carregar histórico", { description: error.message });
      setLoading(false);
      return;
    }
    const list = (data ?? []) as HistoryItem[];
    setItems(list);
    const ids = Array.from(new Set(list.map((i) => i.user_id).filter(Boolean) as string[]));
    if (ids.length) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("id,nome,cargo")
        .in("id", ids);
      setProfiles(Object.fromEntries((profs ?? []).map((p) => [p.id, p as ProfileLite])));
    }
    setLoading(false);
  };

  useEffect(() => {
    setLoading(true);
    load();
    const channel = supabase
      .channel(`cedente_history:${cedenteId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "cedente_history", filter: `cedente_id=eq.${cedenteId}` },
        () => load(),
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cedenteId]);

  const grouped = useMemo(() => {
    const map = new Map<string, HistoryItem[]>();
    for (const it of items) {
      const k = dayKey(it.created_at);
      const arr = map.get(k) ?? [];
      arr.push(it);
      map.set(k, arr);
    }
    return Array.from(map.entries());
  }, [items]);

  const post = async () => {
    if (!comment.trim() || !user) return;
    setPosting(true);
    const { error } = await supabase.from("cedente_history").insert({
      cedente_id: cedenteId,
      user_id: user.id,
      evento: "COMENTARIO",
      detalhes: { comentario: comment.trim() } as any,
    });
    setPosting(false);
    if (error) {
      toast.error("Não foi possível publicar", { description: error.message });
      return;
    }
    setComment("");
    // realtime cuida do refresh, mas garantimos:
    load();
  };

  if (loading) {
    return (
      <div className="rounded-lg border bg-card p-6 flex items-center justify-center text-muted-foreground">
        <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Carregando histórico...
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Caixa de novo comentário */}
      <div className="rounded-lg border bg-card p-3 space-y-2">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
          <h3 className="text-[13px] font-medium">Adicionar comentário</h3>
        </div>
        <Textarea
          rows={3}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Escreva um apontamento, dúvida ou mensagem para os outros perfis envolvidos no cedente..."
          className="text-[12px]"
        />
        <div className="flex justify-end">
          <Button size="sm" className="h-7 text-[12px]" disabled={!comment.trim() || posting} onClick={post}>
            {posting ? <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" /> : <Send className="h-3.5 w-3.5 mr-2" />}
            Publicar
          </Button>
        </div>
      </div>

      {/* Timeline */}
      <div className="rounded-lg border bg-card p-3" ref={listRef}>
        {items.length === 0 ? (
          <p className="text-[12px] text-muted-foreground text-center py-6">Nenhum evento registrado ainda.</p>
        ) : (
          <div className="space-y-4">
            {grouped.map(([day, list]) => (
              <section key={day} className="space-y-2">
                <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.08em]">
                  {day}
                </div>
                <ol className="space-y-2">
                  {list.map((it) => (
                    <HistoryRow key={it.id} item={it} profile={it.user_id ? profiles[it.user_id] : undefined} />
                  ))}
                </ol>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function HistoryRow({ item, profile }: { item: HistoryItem; profile?: ProfileLite }) {
  const nome = profile?.nome ?? "—";
  const cargo = profile?.cargo ?? null;
  const isComentario = item.evento === "COMENTARIO";
  const isCriado = item.evento === "criado";
  const isStage = item.evento === "mudanca_estagio";
  const isAta = item.evento === "ata_comite";
  const comentario = item.detalhes?.comentario;
  const minuteId = item.detalhes?.minute_id;
  const decisao = item.detalhes?.decisao;

  return (
    <li className="flex gap-2.5 rounded-md border bg-background p-2.5">
      <Avatar className="h-7 w-7 shrink-0">
        <AvatarFallback className="text-[10px]">{isAta ? "CM" : initials(nome)}</AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center gap-2 flex-wrap leading-none">
          <span className="text-[12px] font-medium">{isAta ? "Comitê de Crédito" : nome}</span>
          {!isAta && cargo && <span className="text-[10px] text-muted-foreground">· {cargo}</span>}
          <span className="text-[10px] text-muted-foreground">· {fmtDateTime(item.created_at)}</span>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap leading-none">
          {isComentario && (
            <Badge variant="secondary" className="h-[18px] text-[10px] font-medium gap-1 px-1.5">
              <MessageSquare className="h-3 w-3" /> Comentário
            </Badge>
          )}
          {isCriado && item.stage_novo && (
            <Badge variant="outline" className="h-[18px] text-[10px] font-medium gap-1 px-1.5">
              <Pencil className="h-3 w-3" /> Cedente criado em
              <span style={{ color: STAGE_COLORS[item.stage_novo] }}>{STAGE_LABEL[item.stage_novo]}</span>
            </Badge>
          )}
          {isStage && item.stage_anterior && item.stage_novo && (
            <Badge variant="outline" className="h-[18px] text-[10px] font-medium gap-1 px-1.5">
              <span style={{ color: STAGE_COLORS[item.stage_anterior] }}>{STAGE_LABEL[item.stage_anterior]}</span>
              <ArrowRight className="h-3 w-3" />
              <span style={{ color: STAGE_COLORS[item.stage_novo] }}>{STAGE_LABEL[item.stage_novo]}</span>
            </Badge>
          )}
          {isAta && (
            <>
              <Badge className={`h-[18px] text-[10px] font-medium gap-1 px-1.5 ${decisao === "aprovado" ? "bg-green-600" : "bg-destructive"} text-white`}>
                <Vote className="h-3 w-3" /> Comitê {decisao === "aprovado" ? "aprovou" : "reprovou"}
              </Badge>
              {minuteId && (
                <Button
                  size="sm" variant="outline" className="h-6 text-[10px] gap-1 px-1.5"
                  onClick={() => downloadAtaById(minuteId).catch((e) => toast.error(e?.message ?? "Falha ao gerar PDF"))}
                >
                  <FileDown className="h-3 w-3" /> Baixar ata
                </Button>
              )}
            </>
          )}
        </div>
        {comentario && (
          <p className="text-[12px] leading-tight whitespace-pre-wrap pt-0.5">{comentario}</p>
        )}
      </div>
    </li>
  );
}
