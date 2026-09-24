// Database types in the format produced by `supabase gen types typescript`.
// Regenerate after changing migrations: `pnpm db:types` (requires `supabase start`).

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "13.0.5";
  };
  public: {
    Tables: {
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
          legal_name: string | null;
          market_role: Database["public"]["Enums"]["market_role"] | null;
          name: string;
          payouts_enabled: boolean;
          phone: string | null;
          stripe_account_id: string | null;
          stripe_customer_id: string | null;
          updated_at: string;
          vat_number: string | null;
          verification_note: string | null;
          verification_status: Database["public"]["Enums"]["verification_status"];
          verified_at: string | null;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          id?: string;
          legal_name?: string | null;
          market_role?: Database["public"]["Enums"]["market_role"] | null;
          name: string;
          payouts_enabled?: boolean;
          phone?: string | null;
          stripe_account_id?: string | null;
          stripe_customer_id?: string | null;
          updated_at?: string;
          vat_number?: string | null;
          verification_note?: string | null;
          verification_status?: Database["public"]["Enums"]["verification_status"];
          verified_at?: string | null;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          id?: string;
          legal_name?: string | null;
          market_role?: Database["public"]["Enums"]["market_role"] | null;
          name?: string;
          payouts_enabled?: boolean;
          phone?: string | null;
          stripe_account_id?: string | null;
          stripe_customer_id?: string | null;
          updated_at?: string;
          vat_number?: string | null;
          verification_note?: string | null;
          verification_status?: Database["public"]["Enums"]["verification_status"];
          verified_at?: string | null;
        };
        Relationships: [];
      };
      feedstock_types: {
        Row: {
          abp_category: number | null;
          active: boolean;
          category: Database["public"]["Enums"]["feedstock_category"];
          code: string;
          default_unit: Database["public"]["Enums"]["quantity_unit"];
          ewc_code: string | null;
          is_animal_by_product: boolean;
          name_el: string;
          name_en: string;
          sort_order: number;
          typical_biogas_m3_per_t: number | null;
          typical_dm_pct: number | null;
        };
        Insert: {
          abp_category?: number | null;
          active?: boolean;
          category?: Database["public"]["Enums"]["feedstock_category"];
          code?: string;
          default_unit?: Database["public"]["Enums"]["quantity_unit"];
          ewc_code?: string | null;
          is_animal_by_product?: boolean;
          name_el?: string;
          name_en?: string;
          sort_order?: number;
          typical_biogas_m3_per_t?: number | null;
          typical_dm_pct?: number | null;
        };
        Update: {
          abp_category?: number | null;
          active?: boolean;
          category?: Database["public"]["Enums"]["feedstock_category"];
          code?: string;
          default_unit?: Database["public"]["Enums"]["quantity_unit"];
          ewc_code?: string | null;
          is_animal_by_product?: boolean;
          name_el?: string;
          name_en?: string;
          sort_order?: number;
          typical_biogas_m3_per_t?: number | null;
          typical_dm_pct?: number | null;
        };
        Relationships: [];
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
      sites: {
        Row: {
          address: string | null;
          created_at: string;
          id: string;
          latitude: number;
          longitude: number;
          municipality: string | null;
          name: string;
          notes: string | null;
          org_id: string;
          site_type: Database["public"]["Enums"]["site_type"];
          updated_at: string;
        };
        Insert: {
          address?: string | null;
          created_at?: string;
          id?: string;
          latitude: number;
          longitude: number;
          municipality?: string | null;
          name: string;
          notes?: string | null;
          org_id: string;
          site_type: Database["public"]["Enums"]["site_type"];
          updated_at?: string;
        };
        Update: {
          address?: string | null;
          created_at?: string;
          id?: string;
          latitude?: number;
          longitude?: number;
          municipality?: string | null;
          name?: string;
          notes?: string | null;
          org_id?: string;
          site_type?: Database["public"]["Enums"]["site_type"];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "sites_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      is_org_member: { Args: { target_org: string }; Returns: boolean };
      is_org_owner: { Args: { target_org: string }; Returns: boolean };
      admin_set_verification: {
        Args: { p_note?: string; p_org_id: string; p_status: Database["public"]["Enums"]["verification_status"] };
        Returns: undefined;
      };
      complete_onboarding: {
        Args: {
          p_legal_name: string;
          p_phone: string;
          p_role: Database["public"]["Enums"]["market_role"];
          p_vat_number: string;
        };
        Returns: string;
      };
      is_platform_admin: { Args: Record<PropertyKey, never>; Returns: boolean };
      is_valid_afm: { Args: { afm: string }; Returns: boolean };
    };
    Enums: {
      app_locale: "el" | "en";
      feedstock_category:
        | "animal_manure"
        | "energy_crop"
        | "agricultural_residue"
        | "food_industry"
        | "food_waste"
        | "other";
      market_role: "buyer" | "seller";
      org_role: "owner" | "member";
      quantity_unit: "t" | "m3";
      site_type: "biogas_plant" | "livestock_farm" | "agriculture" | "food_industry" | "other";
      verification_status: "pending" | "verified" | "rejected";
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
