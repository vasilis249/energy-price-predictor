// Database types in the format produced by `supabase gen types typescript`.
// Regenerate after changing migrations: `pnpm db:types` (requires `supabase start`).

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "13.0.5";
  };
  public: {
    Tables: {
      biogas_params: {
        Row: {
          avg_production_mw: number;
          created_at: string;
          gas_storage_hours: number;
          max_load_mw: number;
          max_starts_per_day: number;
          min_down_hours: number;
          min_load_pct: number;
          min_up_hours: number;
          plant_id: string;
          ramp_mw_per_hour: number | null;
          updated_at: string;
        };
        Insert: {
          avg_production_mw: number;
          created_at?: string;
          gas_storage_hours: number;
          max_load_mw: number;
          max_starts_per_day: number;
          min_down_hours?: number;
          min_load_pct: number;
          min_up_hours?: number;
          plant_id: string;
          ramp_mw_per_hour?: number | null;
          updated_at?: string;
        };
        Update: {
          avg_production_mw?: number;
          created_at?: string;
          gas_storage_hours?: number;
          max_load_mw?: number;
          max_starts_per_day?: number;
          min_down_hours?: number;
          min_load_pct?: number;
          min_up_hours?: number;
          plant_id?: string;
          ramp_mw_per_hour?: number | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "biogas_params_plant_id_fkey";
            columns: ["plant_id"];
            isOneToOne: true;
            referencedRelation: "plants";
            referencedColumns: ["id"];
          },
        ];
      };
      memberships: {
        Row: {
          created_at: string;
          org_id: string;
          role: Database["public"]["Enums"]["org_role"];
          user_id: string;
        };
        Insert: {
          created_at?: string;
          org_id: string;
          role?: Database["public"]["Enums"]["org_role"];
          user_id: string;
        };
        Update: {
          created_at?: string;
          org_id?: string;
          role?: Database["public"]["Enums"]["org_role"];
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "memberships_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      organizations: {
        Row: {
          created_at: string;
          created_by: string | null;
          id: string;
          name: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          id?: string;
          name: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          id?: string;
          name?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      plants: {
        Row: {
          capacity_mw: number;
          created_at: string;
          id: string;
          latitude: number | null;
          location_name: string | null;
          longitude: number | null;
          name: string;
          notes: string | null;
          org_id: string;
          plant_type: Database["public"]["Enums"]["plant_type"];
          support_scheme: Database["public"]["Enums"]["support_scheme"];
          updated_at: string;
        };
        Insert: {
          capacity_mw: number;
          created_at?: string;
          id?: string;
          latitude?: number | null;
          location_name?: string | null;
          longitude?: number | null;
          name: string;
          notes?: string | null;
          org_id: string;
          plant_type: Database["public"]["Enums"]["plant_type"];
          support_scheme?: Database["public"]["Enums"]["support_scheme"];
          updated_at?: string;
        };
        Update: {
          capacity_mw?: number;
          created_at?: string;
          id?: string;
          latitude?: number | null;
          location_name?: string | null;
          longitude?: number | null;
          name?: string;
          notes?: string | null;
          org_id?: string;
          plant_type?: Database["public"]["Enums"]["plant_type"];
          support_scheme?: Database["public"]["Enums"]["support_scheme"];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "plants_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          created_at: string;
          full_name: string | null;
          id: string;
          is_platform_admin: boolean;
          locale: Database["public"]["Enums"]["app_locale"];
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          full_name?: string | null;
          id: string;
          is_platform_admin?: boolean;
          locale?: Database["public"]["Enums"]["app_locale"];
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          full_name?: string | null;
          id?: string;
          is_platform_admin?: boolean;
          locale?: Database["public"]["Enums"]["app_locale"];
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      is_org_member: { Args: { target_org: string }; Returns: boolean };
      is_org_owner: { Args: { target_org: string }; Returns: boolean };
      save_plant: {
        Args: { p_biogas?: Json; p_org_id: string; p_plant: Json; p_plant_id?: string };
        Returns: string;
      };
    };
    Enums: {
      app_locale: "el" | "en";
      org_role: "owner" | "member";
      plant_type: "biogas" | "pv" | "wind" | "small_hydro" | "other";
      support_scheme: "fit" | "fip" | "merchant" | "unknown";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type PublicSchema = Database["public"];
export type Tables<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Row"];
export type TablesInsert<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Insert"];
export type TablesUpdate<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Update"];
export type Enums<T extends keyof PublicSchema["Enums"]> = PublicSchema["Enums"][T];
