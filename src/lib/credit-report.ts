// Estrutura do relatório de crédito (8 seções) — single source of truth para UI e validação.

export type SectionKey =
  | "identificacao"
  | "empresa"
  | "rede_societaria"
  | "carteira"
  | "restritivos"
  | "financeiro"
  | "due_diligence"
  | "pleito";

export const SECTION_ORDER: SectionKey[] = [
  "identificacao",
  "empresa",
  "rede_societaria",
  "carteira",
  "restritivos",
  "financeiro",
  "due_diligence",
  "pleito",
];

export const SECTION_LABEL: Record<SectionKey, string> = {
  identificacao: "1. Identificação",
  empresa: "2. Descrição da empresa",
  rede_societaria: "3. Rede societária e coligadas",
  carteira: "4. Carteira de crédito",
  restritivos: "5. Restritivos e consultas",
  financeiro: "6. Análise econômico-financeira",
  due_diligence: "7. Due diligence digital",
  pleito: "8. Pleito e proposta",
};

export const SECTION_HINT: Record<SectionKey, string> = {
  identificacao: "Quem está sendo analisado, scores e tipo de análise.",
  empresa: "Histórico, sócios, operação, management e infraestrutura.",
  rede_societaria: "Outras empresas dos sócios e mapa de vínculos.",
  carteira: "Evolução da carteira (a vencer, vencido, prejuízo) e modalidades.",
  restritivos: "Serasa, BACEN, PGFN, ações judiciais e parecer compliance.",
  financeiro: "Balanço, DRE e indicadores dos últimos 3 exercícios.",
  due_diligence: "Site, redes, domínio, Google Maps e clientes públicos.",
  pleito: "Limite atual × proposto, avalistas, garantias e parecer final.",
};

export type FieldType = "text" | "textarea" | "number" | "select" | "date";

export interface FieldDef {
  key: string;
  label: string;
  type: FieldType;
  options?: { value: string; label: string }[];
  full?: boolean;
  required?: boolean;
}

export const SECTION_FIELDS: Record<SectionKey, FieldDef[]> = {
  identificacao: [
    { key: "data_analise", label: "Data da análise", type: "date", required: true },
    { key: "analista", label: "Analista", type: "text", required: true },
    { key: "regional", label: "Regional", type: "text" },
    { key: "executivo", label: "Executivo comercial", type: "text" },
    {
      key: "tipo_analise",
      label: "Tipo de análise",
      type: "select",
      required: true,
      options: [
        { value: "prospeccao", label: "Prospecção" },
        { value: "revisao", label: "Revisão" },
        { value: "reativacao", label: "Reativação" },
      ],
    },
    { key: "segmento", label: "Segmento", type: "text" },
    { key: "setor", label: "Setor", type: "text" },
    { key: "cnae", label: "CNAE principal", type: "text" },
    {
      key: "score_alavancagem",
      label: "Score alavancagem",
      type: "select",
      options: [
        { value: "baixo", label: "Baixo risco" },
        { value: "medio", label: "Médio risco" },
        { value: "alto", label: "Alto risco" },
      ],
    },
    {
      key: "score_compliance",
      label: "Score compliance",
      type: "select",
      options: [
        { value: "baixo", label: "Baixo risco" },
        { value: "medio", label: "Médio risco" },
        { value: "alto", label: "Alto risco" },
      ],
    },
  ],
  empresa: [
    { key: "data_fundacao", label: "Data de fundação", type: "date" },
    { key: "tempo_mercado", label: "Tempo de mercado (anos)", type: "number" },
    { key: "localizacao", label: "Localização (matriz e filiais)", type: "text", full: true },
    { key: "capital_social", label: "Capital social (R$)", type: "number" },
    { key: "faturamento_medio", label: "Faturamento médio mensal (R$)", type: "number" },
    { key: "socios", label: "Sócios (idade, % participação, entrada)", type: "textarea", full: true, required: true },
    { key: "respaldo_patrimonial", label: "Respaldo patrimonial / IRPF", type: "textarea", full: true },
    { key: "atividade", label: "Atividade — principais produtos/serviços", type: "textarea", full: true, required: true },
    { key: "pmp", label: "PMP (dias)", type: "number" },
    { key: "pmr", label: "PMR (dias)", type: "number" },
    { key: "forma_recebimento", label: "Forma de recebimento (% boleto / cc / cheque / cartão)", type: "text", full: true },
    { key: "infraestrutura", label: "Frota / parque fabril / armazéns", type: "textarea", full: true },
    { key: "management", label: "Management — executivos-chave", type: "textarea", full: true },
  ],
  rede_societaria: [
    { key: "empresas_socios", label: "Outras empresas dos sócios (CNPJ, situação, porte)", type: "textarea", full: true, required: true },
    { key: "vinculos_cruzados", label: "Sócios cruzados / vínculos familiares", type: "textarea", full: true },
    { key: "empresas_baixadas", label: "Empresas baixadas no histórico", type: "textarea", full: true },
    { key: "holding", label: "Holding / controladora", type: "text", full: true },
  ],
  carteira: [
    { key: "evolucao_carteira", label: "Evolução mensal: a vencer / vencido / prejuízo / total (12-24 meses)", type: "textarea", full: true, required: true },
    { key: "distribuicao_modalidade", label: "Distribuição por modalidade (adiantamento, empréstimos, descontos, financiamentos)", type: "textarea", full: true },
    { key: "compromissos", label: "Compromissos visão cedente (vencidos × a vencer)", type: "textarea", full: true },
  ],
  restritivos: [
    { key: "serasa_pj", label: "Serasa PJ — apontamentos / pendências", type: "textarea", full: true, required: true },
    { key: "serasa_socios", label: "Serasa sócios", type: "textarea", full: true },
    { key: "cenprot_pgfn", label: "CENPROT / PGFN", type: "textarea", full: true },
    { key: "acoes_judiciais", label: "Ações judiciais", type: "textarea", full: true },
    { key: "bacen_scr", label: "BACEN SCR (limite, créditos, coobrigação, prejuízo)", type: "textarea", full: true, required: true },
    { key: "consultas_serasa", label: "Histórico de consultas Serasa (12-14 meses)", type: "textarea", full: true },
    { key: "consultas_bancos_empresas", label: "Total consultas: bancos × empresas", type: "text", full: true },
    {
      key: "parecer_compliance_score",
      label: "Parecer compliance",
      type: "select",
      options: [
        { value: "baixo", label: "Baixo risco" },
        { value: "medio", label: "Médio risco" },
        { value: "alto", label: "Alto risco" },
      ],
    },
  ],
  financeiro: [
    { key: "balanco", label: "Balanço comparativo (3 exercícios)", type: "textarea", full: true, required: true },
    { key: "dre", label: "DRE (3 exercícios)", type: "textarea", full: true, required: true },
    { key: "liquidez_corrente", label: "Liquidez corrente", type: "number" },
    { key: "liquidez_geral", label: "Liquidez geral", type: "number" },
    { key: "endividamento", label: "Endividamento (%)", type: "number" },
    { key: "margem_ebitda", label: "Margem EBITDA (%)", type: "number" },
    { key: "roe", label: "ROE (%)", type: "number" },
    { key: "cobertura_juros", label: "Cobertura de juros", type: "number" },
    { key: "indicadores_extra", label: "Outros indicadores e comentários", type: "textarea", full: true },
  ],
  due_diligence: [
    { key: "site", label: "Site oficial", type: "text", full: true },
    { key: "linkedin", label: "LinkedIn", type: "text", full: true },
    { key: "instagram", label: "Instagram / outras redes", type: "text", full: true },
    { key: "dominio", label: "Domínio (registrante, criação, contato técnico)", type: "textarea", full: true },
    { key: "google_maps", label: "Google Maps (link Street View / aérea)", type: "text", full: true },
    { key: "clientes_publicos", label: "Principais clientes divulgados", type: "textarea", full: true },
    { key: "cases", label: "Cases de sucesso / observações", type: "textarea", full: true },
  ],
  pleito: [
    { key: "limite_atual", label: "Limite atual (modalidades, taxa, prazo, avalistas)", type: "textarea", full: true },
    { key: "limite_proposto", label: "Limite proposto (modalidades, taxa, prazo)", type: "textarea", full: true, required: true },
    { key: "pct_faturamento", label: "% sobre faturamento médio", type: "number" },
    { key: "pct_pl", label: "% sobre PL", type: "number" },
    { key: "avalistas", label: "Avalistas propostos (PF e/ou holding)", type: "textarea", full: true, required: true },
    { key: "garantias", label: "Garantias adicionais", type: "textarea", full: true },
    { key: "limite_compartilhado", label: "Limite compartilhado (matriz + filiais)", type: "textarea", full: true },
  ],
};

export function isSectionComplete(data: Record<string, any> | undefined | null, key: SectionKey): boolean {
  const fields = SECTION_FIELDS[key];
  const required = fields.filter((f) => f.required);
  const att = (data as any)?.__attachments ?? {};
  const hasValue = (fieldKey: string) => {
    const v = data?.[fieldKey];
    if (v !== null && v !== undefined && String(v).trim() !== "") return true;
    return Array.isArray(att[fieldKey]) && att[fieldKey].length > 0;
  };
  if (required.length === 0) {
    // sem obrigatórios: completo se tiver ao menos um campo (texto ou anexo) preenchido
    const anyText = Object.entries(data ?? {})
      .filter(([k]) => k !== "__attachments")
      .some(([, v]) => v !== null && v !== undefined && String(v).trim() !== "");
    const anyAtt = Object.values(att).some((arr: any) => Array.isArray(arr) && arr.length > 0);
    return anyText || anyAtt;
  }
  return required.every((f) => hasValue(f.key));
}

export function computeCompletude(report: Partial<Record<SectionKey, any>>): number {
  return SECTION_ORDER.reduce((acc, k) => acc + (isSectionComplete(report[k], k) ? 1 : 0), 0);
}

export const RECOMENDACAO_OPTIONS = [
  { value: "favoravel", label: "Favorável" },
  { value: "favoravel_ressalva", label: "Favorável c/ ressalva" },
  { value: "desfavoravel", label: "Desfavorável" },
];
