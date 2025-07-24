export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      access_tokens: {
        Row: {
          access_token: string
          access_token_hash: string | null
          access_token_mask: string | null
          created_at: string
          user_id: string
        }
        Insert: {
          access_token?: string
          access_token_hash?: string | null
          access_token_mask?: string | null
          created_at?: string
          user_id: string
        }
        Update: {
          access_token?: string
          access_token_hash?: string | null
          access_token_mask?: string | null
          created_at?: string
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
          start_cmd: string | null
          status: string
          total_disk_size_mb: number | null
          updated_at: string
          vcpu: number
        }
        Insert: {
          created_at?: string
          dockerfile?: string | null
          env_id?: string | null
          envd_version?: string | null
          finished_at?: string | null
          firecracker_version?: string
          free_disk_size_mb: number
          id?: string
          kernel_version?: string
          ram_mb: number
          start_cmd?: string | null
          status?: string
          total_disk_size_mb?: number | null
          updated_at: string
          vcpu: number
        }
        Update: {
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
          start_cmd?: string | null
          status?: string
          total_disk_size_mb?: number | null
          updated_at?: string
          vcpu?: number
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
      snapshots: {
        Row: {
          base_env_id: string
          created_at: string | null
          env_id: string
          id: string
          metadata: Json | null
          sandbox_id: string
        }
        Insert: {
          base_env_id: string
          created_at?: string | null
          env_id: string
          id?: string
          metadata?: Json | null
          sandbox_id: string
        }
        Update: {
          base_env_id?: string
          created_at?: string | null
          env_id?: string
          id?: string
          metadata?: Json | null
          sandbox_id?: string
        }
        Relationships: []
      }
      team_api_keys: {
        Row: {
          api_key: string
          api_key_hash: string | null
          api_key_mask: string | null
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
          api_key_mask?: string | null
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
          api_key_mask?: string | null
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
          disk_mb: number
          id: string
          max_length_hours: number
          name: string
        }
        Insert: {
          concurrent_instances: number
          disk_mb?: number
          id: string
          max_length_hours: number
          name: string
        }
        Update: {
          concurrent_instances?: number
          disk_mb?: number
          id?: string
          max_length_hours?: number
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
    }
    Functions: {
      extra_for_post_user_signup: {
        Args: {
          user_id: string
          team_id: string
        }
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
        Args: {
          name: string
        }
        Returns: string
      }
      is_member_of_team: {
        Args: {
          _user_id: string
          _team_id: string
        }
        Returns: boolean
      }
      unaccent: {
        Args: {
          '': string
        }
        Returns: string
      }
      unaccent_init: {
        Args: {
          '': unknown
        }
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

type PublicSchema = Database[Extract<keyof Database, 'public'>]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema['Tables'] & PublicSchema['Views'])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions['schema']]['Tables'] &
        Database[PublicTableNameOrOptions['schema']]['Views'])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions['schema']]['Tables'] &
      Database[PublicTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema['Tables'] &
        PublicSchema['Views'])
    ? (PublicSchema['Tables'] &
        PublicSchema['Views'])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema['Tables']
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions['schema']]['Tables']
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema['Tables']
    ? PublicSchema['Tables'][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema['Tables']
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions['schema']]['Tables']
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema['Tables']
    ? PublicSchema['Tables'][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema['Enums']
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions['schema']]['Enums']
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions['schema']]['Enums'][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema['Enums']
    ? PublicSchema['Enums'][PublicEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof PublicSchema['CompositeTypes']
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof PublicSchema['CompositeTypes']
    ? PublicSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never
