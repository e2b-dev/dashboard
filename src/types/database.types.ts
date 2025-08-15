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
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      _migrations: {
        Row: {
          id: number
          is_applied: boolean
          tstamp: string
          version_id: number
        }
        Insert: {
          id?: number
          is_applied: boolean
          tstamp?: string
          version_id: number
        }
        Update: {
          id?: number
          is_applied?: boolean
          tstamp?: string
          version_id?: number
        }
        Relationships: []
      }
      access_tokens: {
        Row: {
          access_token: string
          access_token_hash: string | null
          access_token_length: number | null
          access_token_mask: string | null
          access_token_mask_prefix: string | null
          access_token_mask_suffix: string | null
          access_token_prefix: string | null
          created_at: string
          id: string | null
          name: string
          user_id: string
        }
        Insert: {
          access_token?: string
          access_token_hash?: string | null
          access_token_length?: number | null
          access_token_mask?: string | null
          access_token_mask_prefix?: string | null
          access_token_mask_suffix?: string | null
          access_token_prefix?: string | null
          created_at?: string
          id?: string | null
          name?: string
          user_id: string
        }
        Update: {
          access_token?: string
          access_token_hash?: string | null
          access_token_length?: number | null
          access_token_mask?: string | null
          access_token_mask_prefix?: string | null
          access_token_mask_suffix?: string | null
          access_token_prefix?: string | null
          created_at?: string
          id?: string | null
          name?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "access_tokens_users_access_tokens"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "auth_users"
            referencedColumns: ["id"]
          },
        ]
      }
      clusters: {
        Row: {
          endpoint: string
          endpoint_tls: boolean
          id: string
          sandbox_proxy_domain: string | null
          token: string
        }
        Insert: {
          endpoint: string
          endpoint_tls?: boolean
          id?: string
          sandbox_proxy_domain?: string | null
          token: string
        }
        Update: {
          endpoint?: string
          endpoint_tls?: boolean
          id?: string
          sandbox_proxy_domain?: string | null
          token?: string
        }
        Relationships: []
      }
      env_aliases: {
        Row: {
          alias: string
          env_id: string
          is_renamable: boolean
        }
        Insert: {
          alias: string
          env_id: string
          is_renamable?: boolean
        }
        Update: {
          alias?: string
          env_id?: string
          is_renamable?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "env_aliases_envs_env_aliases"
            columns: ["env_id"]
            isOneToOne: false
            referencedRelation: "envs"
            referencedColumns: ["id"]
          },
        ]
      }
      env_builds: {
        Row: {
          cluster_node_id: string | null
          created_at: string
          dockerfile: string | null
          env_id: string | null
          envd_version: string | null
          finished_at: string | null
          firecracker_version: string
          free_disk_size_mb: number
          id: string
          kernel_version: string
          ram_mb: number
          ready_cmd: string | null
          reason: string | null
          start_cmd: string | null
          status: string
          total_disk_size_mb: number | null
          updated_at: string
          vcpu: number
        }
        Insert: {
          cluster_node_id?: string | null
          created_at?: string
          dockerfile?: string | null
          env_id?: string | null
          envd_version?: string | null
          finished_at?: string | null
          firecracker_version: string
          free_disk_size_mb: number
          id?: string
          kernel_version?: string
          ram_mb: number
          ready_cmd?: string | null
          reason?: string | null
          start_cmd?: string | null
          status?: string
          total_disk_size_mb?: number | null
          updated_at: string
          vcpu: number
        }
        Update: {
          cluster_node_id?: string | null
          created_at?: string
          dockerfile?: string | null
          env_id?: string | null
          envd_version?: string | null
          finished_at?: string | null
          firecracker_version?: string
          free_disk_size_mb?: number
          id?: string
          kernel_version?: string
          ram_mb?: number
          ready_cmd?: string | null
          reason?: string | null
          start_cmd?: string | null
          status?: string
          total_disk_size_mb?: number | null
          updated_at?: string
          vcpu?: number
        }
        Relationships: [
          {
            foreignKeyName: "env_builds_envs_builds"
            columns: ["env_id"]
            isOneToOne: false
            referencedRelation: "envs"
            referencedColumns: ["id"]
          },
        ]
      }
      env_defaults: {
        Row: {
          description: string | null
          env_id: string
        }
        Insert: {
          description?: string | null
          env_id: string
        }
        Update: {
          description?: string | null
          env_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "env_defaults_env_id_fkey"
            columns: ["env_id"]
            isOneToOne: true
            referencedRelation: "envs"
            referencedColumns: ["id"]
          },
        ]
      }
      envs: {
        Row: {
          build_count: number
          cluster_id: string | null
          created_at: string
          created_by: string | null
          id: string
          last_spawned_at: string | null
          public: boolean
          spawn_count: number
          team_id: string
          updated_at: string
        }
        Insert: {
          build_count?: number
          cluster_id?: string | null
          created_at?: string
          created_by?: string | null
          id: string
          last_spawned_at?: string | null
          public?: boolean
          spawn_count?: number
          team_id: string
          updated_at?: string
        }
        Update: {
          build_count?: number
          cluster_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          last_spawned_at?: string | null
          public?: boolean
          spawn_count?: number
          team_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "envs_cluster_id_fkey"
            columns: ["cluster_id"]
            isOneToOne: false
            referencedRelation: "clusters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "envs_teams_envs"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "envs_users_created_envs"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "auth_users"
            referencedColumns: ["id"]
          },
        ]
      }
      schema_migrations: {
        Row: {
          dirty: boolean
          version: number
        }
        Insert: {
          dirty: boolean
          version: number
        }
        Update: {
          dirty?: boolean
          version?: number
        }
        Relationships: []
      }
      snapshots: {
        Row: {
          allow_internet_access: boolean | null
          base_env_id: string
          created_at: string | null
          env_id: string
          env_secure: boolean
          id: string
          metadata: Json | null
          origin_node_id: string | null
          sandbox_id: string
          sandbox_started_at: string
        }
        Insert: {
          allow_internet_access?: boolean | null
          base_env_id: string
          created_at?: string | null
          env_id: string
          env_secure?: boolean
          id?: string
          metadata?: Json | null
          origin_node_id?: string | null
          sandbox_id: string
          sandbox_started_at: string
        }
        Update: {
          allow_internet_access?: boolean | null
          base_env_id?: string
          created_at?: string | null
          env_id?: string
          env_secure?: boolean
          id?: string
          metadata?: Json | null
          origin_node_id?: string | null
          sandbox_id?: string
          sandbox_started_at?: string
        }
        Relationships: []
      }
      team_api_keys: {
        Row: {
          api_key: string
          api_key_hash: string | null
          api_key_length: number | null
          api_key_mask: string | null
          api_key_mask_prefix: string | null
          api_key_mask_suffix: string | null
          api_key_prefix: string | null
          created_at: string
          created_by: string | null
          id: string
          last_used: string | null
          name: string
          team_id: string
          updated_at: string | null
        }
        Insert: {
          api_key?: string
          api_key_hash?: string | null
          api_key_length?: number | null
          api_key_mask?: string | null
          api_key_mask_prefix?: string | null
          api_key_mask_suffix?: string | null
          api_key_prefix?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          last_used?: string | null
          name?: string
          team_id: string
          updated_at?: string | null
        }
        Update: {
          api_key?: string
          api_key_hash?: string | null
          api_key_length?: number | null
          api_key_mask?: string | null
          api_key_mask_prefix?: string | null
          api_key_mask_suffix?: string | null
          api_key_prefix?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          last_used?: string | null
          name?: string
          team_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "team_api_keys_teams_team_api_keys"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_api_keys_users_created_api_keys"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "auth_users"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          blocked_reason: string | null
          cluster_id: string | null
          created_at: string
          email: string
          id: string
          is_banned: boolean
          is_blocked: boolean
          name: string
          profile_picture_url: string | null
          slug: string
          tier: string
        }
        Insert: {
          blocked_reason?: string | null
          cluster_id?: string | null
          created_at?: string
          email: string
          id?: string
          is_banned?: boolean
          is_blocked?: boolean
          name: string
          profile_picture_url?: string | null
          slug: string
          tier: string
        }
        Update: {
          blocked_reason?: string | null
          cluster_id?: string | null
          created_at?: string
          email?: string
          id?: string
          is_banned?: boolean
          is_blocked?: boolean
          name?: string
          profile_picture_url?: string | null
          slug?: string
          tier?: string
        }
        Relationships: [
          {
            foreignKeyName: "teams_cluster_id_fkey"
            columns: ["cluster_id"]
            isOneToOne: false
            referencedRelation: "clusters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teams_tiers_teams"
            columns: ["tier"]
            isOneToOne: false
            referencedRelation: "tiers"
            referencedColumns: ["id"]
          },
        ]
      }
      tiers: {
        Row: {
          concurrent_instances: number
          disk_mb: number
          id: string
          max_length_hours: number
          max_ram_mb: number
          max_vcpu: number
          name: string
        }
        Insert: {
          concurrent_instances: number
          disk_mb?: number
          id: string
          max_length_hours: number
          max_ram_mb?: number
          max_vcpu?: number
          name: string
        }
        Update: {
          concurrent_instances?: number
          disk_mb?: number
          id?: string
          max_length_hours?: number
          max_ram_mb?: number
          max_vcpu?: number
          name?: string
        }
        Relationships: []
      }
      users_teams: {
        Row: {
          added_by: string | null
          created_at: string
          id: number
          is_default: boolean
          team_id: string
          user_id: string
        }
        Insert: {
          added_by?: string | null
          created_at?: string
          id?: number
          is_default?: boolean
          team_id: string
          user_id: string
        }
        Update: {
          added_by?: string | null
          created_at?: string
          id?: number
          is_default?: boolean
          team_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "users_teams_added_by_user"
            columns: ["added_by"]
            isOneToOne: false
            referencedRelation: "auth_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "users_teams_teams_teams"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "users_teams_users_users"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "auth_users"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      auth_users: {
        Row: {
          email: string | null
          id: string | null
        }
        Insert: {
          email?: string | null
          id?: string | null
        }
        Update: {
          email?: string | null
          id?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      extra_for_post_user_signup: {
        Args: { team_id: string; user_id: string }
        Returns: undefined
      }
      generate_access_token: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      generate_team_api_key: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      generate_team_slug: {
        Args: { name: string }
        Returns: string
      }
      is_member_of_team: {
        Args: { _team_id: string; _user_id: string }
        Returns: boolean
      }
      unaccent: {
        Args: { "": string }
        Returns: string
      }
      unaccent_init: {
        Args: { "": unknown }
        Returns: unknown
      }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
