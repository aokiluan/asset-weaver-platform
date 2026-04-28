export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      approval_levels: {
        Row: {
          approver: Database["public"]["Enums"]["approver_kind"]
          ativo: boolean
          created_at: string
          id: string
          nome: string
          ordem: number
          updated_at: string
          valor_max: number | null
          valor_min: number
          votos_minimos: number
        }
        Insert: {
          approver: Database["public"]["Enums"]["approver_kind"]
          ativo?: boolean
          created_at?: string
          id?: string
          nome: string
          ordem?: number
          updated_at?: string
          valor_max?: number | null
          valor_min?: number
          votos_minimos?: number
        }
        Update: {
          approver?: Database["public"]["Enums"]["approver_kind"]
          ativo?: boolean
          created_at?: string
          id?: string
          nome?: string
          ordem?: number
          updated_at?: string
          valor_max?: number | null
          valor_min?: number
          votos_minimos?: number
        }
        Relationships: []
      }
      cedentes: {
        Row: {
          cep: string | null
          cidade: string | null
          cnpj: string
          created_at: string
          created_by: string | null
          email: string | null
          endereco: string | null
          estado: string | null
          faturamento_medio: number | null
          id: string
          lead_id: string | null
          limite_aprovado: number | null
          nome_fantasia: string | null
          observacoes: string | null
          owner_id: string | null
          razao_social: string
          setor: string | null
          status: Database["public"]["Enums"]["cedente_status"]
          telefone: string | null
          updated_at: string
        }
        Insert: {
          cep?: string | null
          cidade?: string | null
          cnpj: string
          created_at?: string
          created_by?: string | null
          email?: string | null
          endereco?: string | null
          estado?: string | null
          faturamento_medio?: number | null
          id?: string
          lead_id?: string | null
          limite_aprovado?: number | null
          nome_fantasia?: string | null
          observacoes?: string | null
          owner_id?: string | null
          razao_social: string
          setor?: string | null
          status?: Database["public"]["Enums"]["cedente_status"]
          telefone?: string | null
          updated_at?: string
        }
        Update: {
          cep?: string | null
          cidade?: string | null
          cnpj?: string
          created_at?: string
          created_by?: string | null
          email?: string | null
          endereco?: string | null
          estado?: string | null
          faturamento_medio?: number | null
          id?: string
          lead_id?: string | null
          limite_aprovado?: number | null
          nome_fantasia?: string | null
          observacoes?: string | null
          owner_id?: string | null
          razao_social?: string
          setor?: string | null
          status?: Database["public"]["Enums"]["cedente_status"]
          telefone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cedentes_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      committee_votes: {
        Row: {
          created_at: string
          decisao: Database["public"]["Enums"]["vote_decision"]
          id: string
          justificativa: string | null
          proposal_id: string
          updated_at: string
          voter_id: string
        }
        Insert: {
          created_at?: string
          decisao: Database["public"]["Enums"]["vote_decision"]
          id?: string
          justificativa?: string | null
          proposal_id: string
          updated_at?: string
          voter_id: string
        }
        Update: {
          created_at?: string
          decisao?: Database["public"]["Enums"]["vote_decision"]
          id?: string
          justificativa?: string | null
          proposal_id?: string
          updated_at?: string
          voter_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "committee_votes_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "credit_proposals"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_opinions: {
        Row: {
          author_id: string
          author_role: Database["public"]["Enums"]["app_role"]
          created_at: string
          id: string
          parecer: string
          pontos_atencao: string | null
          pontos_fortes: string | null
          proposal_id: string
          recomendacao: Database["public"]["Enums"]["opinion_recommendation"]
          score: number | null
          updated_at: string
        }
        Insert: {
          author_id: string
          author_role: Database["public"]["Enums"]["app_role"]
          created_at?: string
          id?: string
          parecer: string
          pontos_atencao?: string | null
          pontos_fortes?: string | null
          proposal_id: string
          recomendacao: Database["public"]["Enums"]["opinion_recommendation"]
          score?: number | null
          updated_at?: string
        }
        Update: {
          author_id?: string
          author_role?: Database["public"]["Enums"]["app_role"]
          created_at?: string
          id?: string
          parecer?: string
          pontos_atencao?: string | null
          pontos_fortes?: string | null
          proposal_id?: string
          recomendacao?: Database["public"]["Enums"]["opinion_recommendation"]
          score?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "credit_opinions_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "credit_proposals"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_proposals: {
        Row: {
          approval_level_id: string | null
          cedente_id: string
          codigo: string
          created_at: string
          created_by: string | null
          decided_at: string | null
          decided_by: string | null
          decisao_observacao: string | null
          finalidade: string | null
          garantias: string | null
          id: string
          observacoes: string | null
          prazo_dias: number | null
          stage: Database["public"]["Enums"]["proposal_stage"]
          taxa_sugerida: number | null
          updated_at: string
          valor_aprovado: number | null
          valor_solicitado: number
        }
        Insert: {
          approval_level_id?: string | null
          cedente_id: string
          codigo?: string
          created_at?: string
          created_by?: string | null
          decided_at?: string | null
          decided_by?: string | null
          decisao_observacao?: string | null
          finalidade?: string | null
          garantias?: string | null
          id?: string
          observacoes?: string | null
          prazo_dias?: number | null
          stage?: Database["public"]["Enums"]["proposal_stage"]
          taxa_sugerida?: number | null
          updated_at?: string
          valor_aprovado?: number | null
          valor_solicitado: number
        }
        Update: {
          approval_level_id?: string | null
          cedente_id?: string
          codigo?: string
          created_at?: string
          created_by?: string | null
          decided_at?: string | null
          decided_by?: string | null
          decisao_observacao?: string | null
          finalidade?: string | null
          garantias?: string | null
          id?: string
          observacoes?: string | null
          prazo_dias?: number | null
          stage?: Database["public"]["Enums"]["proposal_stage"]
          taxa_sugerida?: number | null
          updated_at?: string
          valor_aprovado?: number | null
          valor_solicitado?: number
        }
        Relationships: [
          {
            foreignKeyName: "credit_proposals_approval_level_id_fkey"
            columns: ["approval_level_id"]
            isOneToOne: false
            referencedRelation: "approval_levels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_proposals_cedente_id_fkey"
            columns: ["cedente_id"]
            isOneToOne: false
            referencedRelation: "cedentes"
            referencedColumns: ["id"]
          },
        ]
      }
      dashboard_widgets: {
        Row: {
          ativo: boolean
          config: Json
          created_at: string
          created_by: string | null
          dataset_id: string
          descricao: string | null
          id: string
          largura: number
          ordem: number
          tipo: Database["public"]["Enums"]["dashboard_widget_tipo"]
          titulo: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          config?: Json
          created_at?: string
          created_by?: string | null
          dataset_id: string
          descricao?: string | null
          id?: string
          largura?: number
          ordem?: number
          tipo: Database["public"]["Enums"]["dashboard_widget_tipo"]
          titulo: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          config?: Json
          created_at?: string
          created_by?: string | null
          dataset_id?: string
          descricao?: string | null
          id?: string
          largura?: number
          ordem?: number
          tipo?: Database["public"]["Enums"]["dashboard_widget_tipo"]
          titulo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "dashboard_widgets_dataset_id_fkey"
            columns: ["dataset_id"]
            isOneToOne: false
            referencedRelation: "report_datasets"
            referencedColumns: ["id"]
          },
        ]
      }
      documento_categorias: {
        Row: {
          ativo: boolean
          created_at: string
          descricao: string | null
          id: string
          nome: string
          obrigatorio: boolean
          ordem: number
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          id?: string
          nome: string
          obrigatorio?: boolean
          ordem?: number
        }
        Update: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          id?: string
          nome?: string
          obrigatorio?: boolean
          ordem?: number
        }
        Relationships: []
      }
      documentos: {
        Row: {
          categoria_id: string | null
          cedente_id: string
          created_at: string
          id: string
          mime_type: string | null
          nome_arquivo: string
          observacoes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["documento_status"]
          storage_path: string
          tamanho_bytes: number | null
          updated_at: string
          uploaded_by: string
        }
        Insert: {
          categoria_id?: string | null
          cedente_id: string
          created_at?: string
          id?: string
          mime_type?: string | null
          nome_arquivo: string
          observacoes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["documento_status"]
          storage_path: string
          tamanho_bytes?: number | null
          updated_at?: string
          uploaded_by: string
        }
        Update: {
          categoria_id?: string | null
          cedente_id?: string
          created_at?: string
          id?: string
          mime_type?: string | null
          nome_arquivo?: string
          observacoes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["documento_status"]
          storage_path?: string
          tamanho_bytes?: number | null
          updated_at?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "documentos_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "documento_categorias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documentos_cedente_id_fkey"
            columns: ["cedente_id"]
            isOneToOne: false
            referencedRelation: "cedentes"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_interactions: {
        Row: {
          created_at: string
          descricao: string
          id: string
          lead_id: string
          tipo: string
          user_id: string
        }
        Insert: {
          created_at?: string
          descricao: string
          id?: string
          lead_id: string
          tipo: string
          user_id: string
        }
        Update: {
          created_at?: string
          descricao?: string
          id?: string
          lead_id?: string
          tipo?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_interactions_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          created_at: string
          created_by: string | null
          documento: string | null
          email: string | null
          empresa: string | null
          id: string
          nome: string
          observacoes: string | null
          origem: string | null
          owner_id: string | null
          stage_id: string | null
          telefone: string | null
          tipo: Database["public"]["Enums"]["lead_tipo"]
          updated_at: string
          valor_estimado: number | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          documento?: string | null
          email?: string | null
          empresa?: string | null
          id?: string
          nome: string
          observacoes?: string | null
          origem?: string | null
          owner_id?: string | null
          stage_id?: string | null
          telefone?: string | null
          tipo: Database["public"]["Enums"]["lead_tipo"]
          updated_at?: string
          valor_estimado?: number | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          documento?: string | null
          email?: string | null
          empresa?: string | null
          id?: string
          nome?: string
          observacoes?: string | null
          origem?: string | null
          owner_id?: string | null
          stage_id?: string | null
          telefone?: string | null
          tipo?: Database["public"]["Enums"]["lead_tipo"]
          updated_at?: string
          valor_estimado?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "pipeline_stages"
            referencedColumns: ["id"]
          },
        ]
      }
      pipeline_stages: {
        Row: {
          ativo: boolean
          cor: string | null
          created_at: string
          id: string
          is_ganho: boolean
          is_perdido: boolean
          nome: string
          ordem: number
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          cor?: string | null
          created_at?: string
          id?: string
          is_ganho?: boolean
          is_perdido?: boolean
          nome: string
          ordem: number
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          cor?: string | null
          created_at?: string
          id?: string
          is_ganho?: boolean
          is_perdido?: boolean
          nome?: string
          ordem?: number
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          ativo: boolean
          cargo: string | null
          created_at: string
          email: string
          id: string
          nome: string
          telefone: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          cargo?: string | null
          created_at?: string
          email: string
          id: string
          nome: string
          telefone?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          cargo?: string | null
          created_at?: string
          email?: string
          id?: string
          nome?: string
          telefone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      proposal_history: {
        Row: {
          created_at: string
          detalhes: Json | null
          evento: string
          id: string
          proposal_id: string
          stage_anterior: Database["public"]["Enums"]["proposal_stage"] | null
          stage_novo: Database["public"]["Enums"]["proposal_stage"] | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          detalhes?: Json | null
          evento: string
          id?: string
          proposal_id: string
          stage_anterior?: Database["public"]["Enums"]["proposal_stage"] | null
          stage_novo?: Database["public"]["Enums"]["proposal_stage"] | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          detalhes?: Json | null
          evento?: string
          id?: string
          proposal_id?: string
          stage_anterior?: Database["public"]["Enums"]["proposal_stage"] | null
          stage_novo?: Database["public"]["Enums"]["proposal_stage"] | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "proposal_history_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "credit_proposals"
            referencedColumns: ["id"]
          },
        ]
      }
      report_datasets: {
        Row: {
          ativo: boolean
          created_at: string
          created_by: string | null
          descricao: string | null
          id: string
          nome: string
          schema: Json
          slug: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          id?: string
          nome: string
          schema?: Json
          slug: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          id?: string
          nome?: string
          schema?: Json
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      report_rows: {
        Row: {
          created_at: string
          dados: Json
          dataset_id: string
          id: number
          periodo_referencia: string
          row_index: number
          upload_id: string
        }
        Insert: {
          created_at?: string
          dados: Json
          dataset_id: string
          id?: number
          periodo_referencia: string
          row_index: number
          upload_id: string
        }
        Update: {
          created_at?: string
          dados?: Json
          dataset_id?: string
          id?: number
          periodo_referencia?: string
          row_index?: number
          upload_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "report_rows_dataset_id_fkey"
            columns: ["dataset_id"]
            isOneToOne: false
            referencedRelation: "report_datasets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_rows_upload_id_fkey"
            columns: ["upload_id"]
            isOneToOne: false
            referencedRelation: "report_uploads"
            referencedColumns: ["id"]
          },
        ]
      }
      report_uploads: {
        Row: {
          arquivo_nome: string
          created_at: string
          dataset_id: string
          erro_msg: string | null
          id: string
          linhas_total: number
          periodo_referencia: string
          status: Database["public"]["Enums"]["report_upload_status"]
          storage_path: string
          updated_at: string
          uploaded_by: string | null
        }
        Insert: {
          arquivo_nome: string
          created_at?: string
          dataset_id: string
          erro_msg?: string | null
          id?: string
          linhas_total?: number
          periodo_referencia: string
          status?: Database["public"]["Enums"]["report_upload_status"]
          storage_path: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Update: {
          arquivo_nome?: string
          created_at?: string
          dataset_id?: string
          erro_msg?: string | null
          id?: string
          linhas_total?: number
          periodo_referencia?: string
          status?: Database["public"]["Enums"]["report_upload_status"]
          storage_path?: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "report_uploads_dataset_id_fkey"
            columns: ["dataset_id"]
            isOneToOne: false
            referencedRelation: "report_datasets"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_find_user_by_email: { Args: { _email: string }; Returns: string }
      admin_list_users: {
        Args: never
        Returns: {
          ativo: boolean
          cargo: string
          created_at: string
          email: string
          id: string
          nome: string
          roles: Database["public"]["Enums"]["app_role"][]
        }[]
      }
      can_decide_proposal: { Args: { _user_id: string }; Returns: boolean }
      can_review_documento: { Args: { _user_id: string }; Returns: boolean }
      can_view_cedente: {
        Args: { _owner_id: string; _user_id: string }
        Returns: boolean
      }
      can_view_proposal: {
        Args: { _cedente_id: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin_or_gestor_comercial: {
        Args: { _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role:
        | "admin"
        | "gestor_comercial"
        | "comercial"
        | "analista_credito"
        | "comite"
        | "gestor_risco"
        | "financeiro"
        | "operacional"
      approver_kind: "analista_credito" | "gestor_risco" | "comite"
      cedente_status:
        | "prospect"
        | "em_analise"
        | "aprovado"
        | "reprovado"
        | "inativo"
      dashboard_widget_tipo: "kpi" | "bar" | "line" | "pie" | "table"
      documento_status: "pendente" | "aprovado" | "reprovado"
      lead_tipo: "cedente" | "investidor"
      opinion_recommendation:
        | "favoravel"
        | "favoravel_com_ressalva"
        | "desfavoravel"
      proposal_stage:
        | "rascunho"
        | "analise"
        | "parecer"
        | "comite"
        | "aprovado"
        | "reprovado"
        | "cancelado"
      report_upload_status: "pendente" | "processando" | "processado" | "erro"
      vote_decision: "favoravel" | "desfavoravel" | "abstencao"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: [
        "admin",
        "gestor_comercial",
        "comercial",
        "analista_credito",
        "comite",
        "gestor_risco",
        "financeiro",
        "operacional",
      ],
      approver_kind: ["analista_credito", "gestor_risco", "comite"],
      cedente_status: [
        "prospect",
        "em_analise",
        "aprovado",
        "reprovado",
        "inativo",
      ],
      dashboard_widget_tipo: ["kpi", "bar", "line", "pie", "table"],
      documento_status: ["pendente", "aprovado", "reprovado"],
      lead_tipo: ["cedente", "investidor"],
      opinion_recommendation: [
        "favoravel",
        "favoravel_com_ressalva",
        "desfavoravel",
      ],
      proposal_stage: [
        "rascunho",
        "analise",
        "parecer",
        "comite",
        "aprovado",
        "reprovado",
        "cancelado",
      ],
      report_upload_status: ["pendente", "processando", "processado", "erro"],
      vote_decision: ["favoravel", "desfavoravel", "abstencao"],
    },
  },
} as const
