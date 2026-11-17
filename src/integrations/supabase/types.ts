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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      analytics_events: {
        Row: {
          created_at: string
          event: string
          id: string
          metadata: Json | null
          plan_id: string | null
          session_id: string | null
        }
        Insert: {
          created_at?: string
          event: string
          id?: string
          metadata?: Json | null
          plan_id?: string | null
          session_id?: string | null
        }
        Update: {
          created_at?: string
          event?: string
          id?: string
          metadata?: Json | null
          plan_id?: string | null
          session_id?: string | null
        }
        Relationships: []
      }
      benefits: {
        Row: {
          active: boolean
          created_at: string
          description: string
          icon: string
          id: string
          sort_order: number
          title: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          description?: string
          icon?: string
          id?: string
          sort_order?: number
          title: string
        }
        Update: {
          active?: boolean
          created_at?: string
          description?: string
          icon?: string
          id?: string
          sort_order?: number
          title?: string
        }
        Relationships: []
      }
      content: {
        Row: {
          created_at: string
          description: string
          id: string
          is_preview: boolean
          media_type: string
          media_url: string | null
          published: boolean
          sort_order: number
          thumbnail_url: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string
          id?: string
          is_preview?: boolean
          media_type?: string
          media_url?: string | null
          published?: boolean
          sort_order?: number
          thumbnail_url?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          is_preview?: boolean
          media_type?: string
          media_url?: string | null
          published?: boolean
          sort_order?: number
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      content_previews: {
        Row: {
          active: boolean
          created_at: string
          description: string
          id: string
          locked: boolean
          sort_order: number
          thumbnail_url: string | null
          title: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          description?: string
          id?: string
          locked?: boolean
          sort_order?: number
          thumbnail_url?: string | null
          title?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          description?: string
          id?: string
          locked?: boolean
          sort_order?: number
          thumbnail_url?: string | null
          title?: string
        }
        Relationships: []
      }
      customers: {
        Row: {
          created_at: string
          document: string | null
          email: string
          id: string
          name: string
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          document?: string | null
          email: string
          id?: string
          name: string
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          document?: string | null
          email?: string
          id?: string
          name?: string
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      faqs: {
        Row: {
          active: boolean
          answer: string
          created_at: string
          id: string
          question: string
          sort_order: number
        }
        Insert: {
          active?: boolean
          answer?: string
          created_at?: string
          id?: string
          question: string
          sort_order?: number
        }
        Update: {
          active?: boolean
          answer?: string
          created_at?: string
          id?: string
          question?: string
          sort_order?: number
        }
        Relationships: []
      }
      orders: {
        Row: {
          amount: number
          created_at: string
          customer_id: string
          external_id: string | null
          gateway: string
          id: string
          method: Database["public"]["Enums"]["payment_method"]
          plan_id: string
          status: Database["public"]["Enums"]["payment_status"]
          transaction_id: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          customer_id: string
          external_id?: string | null
          gateway?: string
          id?: string
          method: Database["public"]["Enums"]["payment_method"]
          plan_id: string
          status?: Database["public"]["Enums"]["payment_status"]
          transaction_id?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          customer_id?: string
          external_id?: string | null
          gateway?: string
          id?: string
          method?: Database["public"]["Enums"]["payment_method"]
          plan_id?: string
          status?: Database["public"]["Enums"]["payment_status"]
          transaction_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          boleto_line: string | null
          boleto_url: string | null
          created_at: string
          expires_at: string | null
          gateway: string
          id: string
          method: Database["public"]["Enums"]["payment_method"]
          order_id: string
          paid_at: string | null
          pix_copy_paste: string | null
          pix_qr_code: string | null
          raw_reference_data: Json | null
          status: Database["public"]["Enums"]["payment_status"]
          transaction_id: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          boleto_line?: string | null
          boleto_url?: string | null
          created_at?: string
          expires_at?: string | null
          gateway?: string
          id?: string
          method: Database["public"]["Enums"]["payment_method"]
          order_id: string
          paid_at?: string | null
          pix_copy_paste?: string | null
          pix_qr_code?: string | null
          raw_reference_data?: Json | null
          status?: Database["public"]["Enums"]["payment_status"]
          transaction_id?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          boleto_line?: string | null
          boleto_url?: string | null
          created_at?: string
          expires_at?: string | null
          gateway?: string
          id?: string
          method?: Database["public"]["Enums"]["payment_method"]
          order_id?: string
          paid_at?: string | null
          pix_copy_paste?: string | null
          pix_qr_code?: string | null
          raw_reference_data?: Json | null
          status?: Database["public"]["Enums"]["payment_status"]
          transaction_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      plans: {
        Row: {
          active: boolean
          benefits: Json
          billing_period: Database["public"]["Enums"]["billing_period"]
          created_at: string
          cta_label: string
          description: string
          duration_days: number
          highlight_label: string | null
          highlighted: boolean
          id: string
          name: string
          price: number
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          benefits?: Json
          billing_period?: Database["public"]["Enums"]["billing_period"]
          created_at?: string
          cta_label?: string
          description?: string
          duration_days?: number
          highlight_label?: string | null
          highlighted?: boolean
          id?: string
          name: string
          price: number
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          benefits?: Json
          billing_period?: Database["public"]["Enums"]["billing_period"]
          created_at?: string
          cta_label?: string
          description?: string
          duration_days?: number
          highlight_label?: string | null
          highlighted?: boolean
          id?: string
          name?: string
          price?: number
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          full_name?: string | null
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          accent_color: string | null
          avatar_url: string | null
          bio: string
          cover_url: string | null
          cta_label: string
          display_name: string
          handle: string
          headline: string
          id: number
          methods_enabled: Json
          payment_info: string
          social_links: Json
          social_proof: string | null
          subheadline: string
          updated_at: string
        }
        Insert: {
          accent_color?: string | null
          avatar_url?: string | null
          bio?: string
          cover_url?: string | null
          cta_label?: string
          display_name?: string
          handle?: string
          headline?: string
          id?: number
          methods_enabled?: Json
          payment_info?: string
          social_links?: Json
          social_proof?: string | null
          subheadline?: string
          updated_at?: string
        }
        Update: {
          accent_color?: string | null
          avatar_url?: string | null
          bio?: string
          cover_url?: string | null
          cta_label?: string
          display_name?: string
          handle?: string
          headline?: string
          id?: number
          methods_enabled?: Json
          payment_info?: string
          social_links?: Json
          social_proof?: string | null
          subheadline?: string
          updated_at?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          order_id: string | null
          plan_id: string
          starts_at: string
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at: string
          id?: string
          order_id?: string | null
          plan_id: string
          starts_at?: string
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          order_id?: string | null
          plan_id?: string
          starts_at?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      webhook_events: {
        Row: {
          created_at: string
          error: string | null
          event_id: string
          event_type: string | null
          gateway: string
          id: string
          payload: Json | null
          processed: boolean
          processed_at: string | null
          signature_valid: boolean
          transaction_id: string | null
        }
        Insert: {
          created_at?: string
          error?: string | null
          event_id: string
          event_type?: string | null
          gateway?: string
          id?: string
          payload?: Json | null
          processed?: boolean
          processed_at?: string | null
          signature_valid?: boolean
          transaction_id?: string | null
        }
        Update: {
          created_at?: string
          error?: string | null
          event_id?: string
          event_type?: string | null
          gateway?: string
          id?: string
          payload?: Json | null
          processed?: boolean
          processed_at?: string | null
          signature_valid?: boolean
          transaction_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      apply_payment_status: {
        Args: {
          _order_id: string
          _status: Database["public"]["Enums"]["payment_status"]
        }
        Returns: undefined
      }
      has_active_access: { Args: { _user_id: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
      billing_period:
        | "monthly"
        | "quarterly"
        | "semiannual"
        | "annual"
        | "custom"
      payment_method: "pix" | "card" | "boleto"
      payment_status:
        | "PENDING"
        | "APPROVED"
        | "DECLINED"
        | "CANCELED"
        | "REFUNDED"
        | "EXPIRED"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["admin", "user"],
      billing_period: [
        "monthly",
        "quarterly",
        "semiannual",
        "annual",
        "custom",
      ],
      payment_method: ["pix", "card", "boleto"],
      payment_status: [
        "PENDING",
        "APPROVED",
        "DECLINED",
        "CANCELED",
        "REFUNDED",
        "EXPIRED",
      ],
    },
  },
} as const
