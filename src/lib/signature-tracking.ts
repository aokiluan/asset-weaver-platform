import { supabase } from "@/integrations/supabase/client";

export interface SignerStatus {
  name: string;
  email: string;
  signed: boolean;
  publicId?: string;
}

export interface SignatureTrackingRecord {
  id: string;
  boleta_id: string;
  autentique_document_id: string;
  document_name: string | null;
  status: string;
  signers: SignerStatus[];
  finished_at: string | null;
  created_at: string;
  updated_at: string;
}

function parseSigners(value: unknown): SignerStatus[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return [];
    const s = item as Record<string, unknown>;
    return [{
      name: typeof s.name === "string" ? s.name : "",
      email: typeof s.email === "string" ? s.email : "",
      signed: Boolean(s.signed),
      publicId: typeof s.publicId === "string" ? s.publicId : undefined,
    }];
  });
}

function mapRecord(row: any): SignatureTrackingRecord {
  return { ...row, signers: parseSigners(row.signers) };
}

export async function getLatestSignatureTracking(boletaId: string): Promise<SignatureTrackingRecord | null> {
  const { data, error } = await (supabase.from as any)("signature_tracking")
    .select("*")
    .eq("boleta_id", boletaId)
    .order("created_at", { ascending: false })
    .limit(1);
  if (error) throw error;
  return data && data.length > 0 ? mapRecord(data[0]) : null;
}

export async function syncSignatureTracking(boletaId: string): Promise<SignatureTrackingRecord | null> {
  const { data, error } = await supabase.functions.invoke("sync-autentique-status", {
    body: { boletaId },
  });
  if (error) throw error;
  if (!(data as any)?.success) throw new Error((data as any)?.error || "Erro ao sincronizar");
  const tracking = (data as any)?.tracking;
  return tracking ? mapRecord(tracking) : null;
}
