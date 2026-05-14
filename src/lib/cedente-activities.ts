export type CedenteActivityType =
  | "ligacao"
  | "whatsapp"
  | "email"
  | "reuniao"
  | "visita"
  | "nota"
  | "tarefa";

export const CEDENTE_ACTIVITY_TYPES: CedenteActivityType[] = [
  "ligacao",
  "whatsapp",
  "email",
  "reuniao",
  "visita",
  "nota",
  "tarefa",
];

export const CEDENTE_ACTIVITY_LABEL: Record<CedenteActivityType, string> = {
  ligacao: "Ligação",
  whatsapp: "WhatsApp",
  email: "E-mail",
  reuniao: "Reunião",
  visita: "Visita",
  nota: "Nota",
  tarefa: "Tarefa",
};

export interface CedenteActivity {
  id: string;
  cedente_id: string;
  user_id: string;
  type: CedenteActivityType;
  description: string;
  occurred_at: string;
  created_at: string;
}

export function todayISO(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
