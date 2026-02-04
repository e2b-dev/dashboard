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
    PostgrestVersion: '10.2.0 (e07807d)'
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
          access_token_hash: string
          access_token_length: number
          access_token_mask_prefix: string
          access_token_mask_suffix: string
          access_token_prefix: string
          created_at: string
          id: string
          name: string
          user_id: string
        }
        Insert: {
          access_token_hash: string
          access_token_length: number
          access_token_mask_prefix: string
          access_token_mask_suffix: string
          access_token_prefix: string
          created_at?: string
          id?: string
          name?: string
          user_id: string
        }
        Update: {
          access_token_hash?: string
          access_token_length?: number
          access_token_mask_prefix?: string
          access_token_mask_suffix?: string
          access_token_prefix?: string
          created_at?: string
          id?: string
          name?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'access_tokens_users_access_tokens'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'auth_users'
            referencedColumns: ['id']
          },
        ]
      }
      addons: {
        Row: {
          added_by: string
          description: string | null
          extra_concurrent_sandboxes: number
          extra_concurrent_template_builds: number
          extra_disk_mb: number
          extra_max_ram_mb: number
          extra_max_vcpu: number
          id: string
          idempotency_key: string | null
          name: string
          team_id: string
          valid_from: string
          valid_to: string | null
        }
        Insert: {
          added_by: string
          description?: string | null
          extra_concurrent_sandboxes?: number
          extra_concurrent_template_builds?: number
          extra_disk_mb?: number
          extra_max_ram_mb?: number
          extra_max_vcpu?: number
          id?: string
          idempotency_key?: string | null
          name: string
          team_id: string
          valid_from?: string
          valid_to?: string | null
        }
        Update: {
          added_by?: string
          description?: string | null
          extra_concurrent_sandboxes?: number
          extra_concurrent_template_builds?: number
          extra_disk_mb?: number
          extra_max_ram_mb?: number
          extra_max_vcpu?: number
          id?: string
          idempotency_key?: string | null
          name?: string
          team_id?: string
          valid_from?: string
          valid_to?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'addons_teams_addons'
            columns: ['team_id']
            isOneToOne: false
            referencedRelation: 'team_limits'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'addons_teams_addons'
            columns: ['team_id']
            isOneToOne: false
            referencedRelation: 'teams'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'addons_users_addons'
            columns: ['added_by']
            isOneToOne: false
            referencedRelation: 'auth_users'
            referencedColumns: ['id']
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
            foreignKeyName: 'env_aliases_envs_env_aliases'
            columns: ['env_id']
            isOneToOne: false
            referencedRelation: 'envs'
            referencedColumns: ['id']
          },
        ]
      }
      env_builds: {
        Row: {
          cluster_node_id: string
          created_at: string
          dockerfile: string | null
          env_id: string
          envd_version: string | null
          finished_at: string | null
          firecracker_version: string
          free_disk_size_mb: number
          id: string
          kernel_version: string
          ram_mb: number
          ready_cmd: string | null
          reason: Json
          start_cmd: string | null
          status: string
          total_disk_size_mb: number | null
          updated_at: string
          vcpu: number
          version: string | null
        }
        Insert: {
          cluster_node_id: string
          created_at?: string
          dockerfile?: string | null
          env_id: string
          envd_version?: string | null
          finished_at?: string | null
          firecracker_version: string
          free_disk_size_mb: number
          id?: string
          kernel_version?: string
          ram_mb: number
          ready_cmd?: string | null
          reason?: Json
          start_cmd?: string | null
          status?: string
          total_disk_size_mb?: number | null
          updated_at: string
          vcpu: number
          version?: string | null
        }
        Update: {
          cluster_node_id?: string
          created_at?: string
          dockerfile?: string | null
          env_id?: string
          envd_version?: string | null
          finished_at?: string | null
          firecracker_version?: string
          free_disk_size_mb?: number
          id?: string
          kernel_version?: string
          ram_mb?: number
          ready_cmd?: string | null
          reason?: Json
          start_cmd?: string | null
          status?: string
          total_disk_size_mb?: number | null
          updated_at?: string
          vcpu?: number
          version?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'env_builds_envs_builds'
            columns: ['env_id']
            isOneToOne: false
            referencedRelation: 'envs'
            referencedColumns: ['id']
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
            foreignKeyName: 'env_defaults_env_id_fkey'
            columns: ['env_id']
            isOneToOne: true
            referencedRelation: 'envs'
            referencedColumns: ['id']
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
            foreignKeyName: 'envs_cluster_id_fkey'
            columns: ['cluster_id']
            isOneToOne: false
            referencedRelation: 'clusters'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'envs_teams_envs'
            columns: ['team_id']
            isOneToOne: false
            referencedRelation: 'team_limits'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'envs_teams_envs'
            columns: ['team_id']
            isOneToOne: false
            referencedRelation: 'teams'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'envs_users_created_envs'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'auth_users'
            referencedColumns: ['id']
          },
        ]
      }
      feedback: {
        Row: {
          created_at: string | null
          email: string | null
          id: number
          text: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          id?: number
          text?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          id?: number
          text?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'feedback_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'auth_users'
            referencedColumns: ['id']
          },
        ]
      }
      snapshots: {
        Row: {
          allow_internet_access: boolean | null
          auto_pause: boolean
          base_env_id: string
          created_at: string | null
          env_id: string
          env_secure: boolean
          id: string
          metadata: Json | null
          origin_node_id: string
          sandbox_id: string
          sandbox_started_at: string
          team_id: string
        }
        Insert: {
          allow_internet_access?: boolean | null
          auto_pause?: boolean
          base_env_id: string
          created_at?: string | null
          env_id: string
          env_secure?: boolean
          id?: string
          metadata?: Json | null
          origin_node_id: string
          sandbox_id: string
          sandbox_started_at?: string
          team_id: string
        }
        Update: {
          allow_internet_access?: boolean | null
          auto_pause?: boolean
          base_env_id?: string
          created_at?: string | null
          env_id?: string
          env_secure?: boolean
          id?: string
          metadata?: Json | null
          origin_node_id?: string
          sandbox_id?: string
          sandbox_started_at?: string
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'fk_snapshots_team'
            columns: ['team_id']
            isOneToOne: false
            referencedRelation: 'team_limits'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'fk_snapshots_team'
            columns: ['team_id']
            isOneToOne: false
            referencedRelation: 'teams'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'snapshots_envs_base_env_id'
            columns: ['base_env_id']
            isOneToOne: false
            referencedRelation: 'envs'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'snapshots_envs_env_id'
            columns: ['env_id']
            isOneToOne: false
            referencedRelation: 'envs'
            referencedColumns: ['id']
          },
        ]
      }
      team_api_keys: {
        Row: {
          api_key_hash: string
          api_key_length: number
          api_key_mask_prefix: string
          api_key_mask_suffix: string
          api_key_prefix: string
          created_at: string
          created_by: string | null
          id: string
          last_used: string | null
          name: string
          team_id: string
          updated_at: string | null
        }
        Insert: {
          api_key_hash: string
          api_key_length: number
          api_key_mask_prefix: string
          api_key_mask_suffix: string
          api_key_prefix: string
          created_at?: string
          created_by?: string | null
          id?: string
          last_used?: string | null
          name?: string
          team_id: string
          updated_at?: string | null
        }
        Update: {
          api_key_hash?: string
          api_key_length?: number
          api_key_mask_prefix?: string
          api_key_mask_suffix?: string
          api_key_prefix?: string
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
            foreignKeyName: 'team_api_keys_teams_team_api_keys'
            columns: ['team_id']
            isOneToOne: false
            referencedRelation: 'team_limits'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'team_api_keys_teams_team_api_keys'
            columns: ['team_id']
            isOneToOne: false
            referencedRelation: 'teams'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'team_api_keys_users_created_api_keys'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'auth_users'
            referencedColumns: ['id']
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
          is_default: boolean | null
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
          is_default?: boolean | null
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
          is_default?: boolean | null
          name?: string
          profile_picture_url?: string | null
          slug?: string
          tier?: string
        }
        Relationships: [
          {
            foreignKeyName: 'teams_cluster_id_fkey'
            columns: ['cluster_id']
            isOneToOne: false
            referencedRelation: 'clusters'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'teams_tiers_teams'
            columns: ['tier']
            isOneToOne: false
            referencedRelation: 'tiers'
            referencedColumns: ['id']
          },
        ]
      }
      tiers: {
        Row: {
          concurrent_instances: number
          concurrent_template_builds: number
          disk_mb: number
          id: string
          max_length_hours: number
          max_ram_mb: number
          max_vcpu: number
          name: string
        }
        Insert: {
          concurrent_instances: number
          concurrent_template_builds?: number
          disk_mb?: number
          id: string
          max_length_hours: number
          max_ram_mb?: number
          max_vcpu?: number
          name: string
        }
        Update: {
          concurrent_instances?: number
          concurrent_template_builds?: number
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
            foreignKeyName: 'users_teams_added_by_user'
            columns: ['added_by']
            isOneToOne: false
            referencedRelation: 'auth_users'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'users_teams_teams_teams'
            columns: ['team_id']
            isOneToOne: false
            referencedRelation: 'team_limits'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'users_teams_teams_teams'
            columns: ['team_id']
            isOneToOne: false
            referencedRelation: 'teams'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'users_teams_users_users'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'auth_users'
            referencedColumns: ['id']
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
      team_limits: {
        Row: {
          concurrent_sandboxes: number | null
          concurrent_template_builds: number | null
          disk_mb: number | null
          id: string | null
          max_length_hours: number | null
          max_ram_mb: number | null
          max_vcpu: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      append_array: {
        Args: { id: string; new_element: Json }
        Returns: undefined
      }
      extra_for_post_user_signup: {
        Args: { team_id: string; user_id: string }
        Returns: undefined
      }
      generate_access_token: { Args: never; Returns: string }
      generate_sandbox_video_stream_token: { Args: never; Returns: string }
      generate_team_api_key: { Args: never; Returns: string }
      generate_team_slug: { Args: { name: string }; Returns: string }
      get_project_user_ids: { Args: never; Returns: string[] }
      is_member_of_team: {
        Args: { _team_id: string; _user_id: string }
        Returns: boolean
      }
      temp_create_access_token: { Args: never; Returns: string }
      unaccent: { Args: { '': string }; Returns: string }
    }
    Enums: {
      deployment_state: 'generating' | 'deploying' | 'finished' | 'error'
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] &
        DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] &
        DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema['Enums']
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema['CompositeTypes']
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      deployment_state: ['generating', 'deploying', 'finished', 'error'],
    },
  },
} as const
