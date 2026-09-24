// Database types in the format produced by `supabase gen types typescript`.
// Regenerate after changing migrations: `pnpm db:types` (requires `supabase start`).

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "13.0.5";
  };
  public: {
    Tables: {
      listings: {
        Row: {
          available_from: string;
          available_until: string | null;
          created_at: string;
          description: string | null;
          dm_pct: number | null;
          feedstock_code: string;
          id: string;
          org_id: string;
          price_per_unit: number;
          published_at: string | null;
          quantity: number;
          quantity_period: Database["public"]["Enums"]["quantity_period"];
          site_id: string;
          status: Database["public"]["Enums"]["listing_status"];
          title: string;
          transport: Database["public"]["Enums"]["transport_terms"];
          unit: Database["public"]["Enums"]["quantity_unit"];
          updated_at: string;
        };
        Insert: {
          available_from: string;
          available_until?: string | null;
          created_at?: string;
          description?: string | null;
          dm_pct?: number | null;
          feedstock_code: string;
          id?: string;
          org_id: string;
          price_per_unit: number;
          published_at?: string | null;
          quantity: number;
          quantity_period: Database["public"]["Enums"]["quantity_period"];
          site_id: string;
          status?: Database["public"]["Enums"]["listing_status"];
          title: string;
          transport?: Database["public"]["Enums"]["transport_terms"];
          unit: Database["public"]["Enums"]["quantity_unit"];
          updated_at?: string;
        };
        Update: {
          available_from?: string;
          available_until?: string | null;
          created_at?: string;
          description?: string | null;
          dm_pct?: number | null;
          feedstock_code?: string;
          id?: string;
          org_id?: string;
          price_per_unit?: number;
          published_at?: string | null;
          quantity?: number;
          quantity_period?: Database["public"]["Enums"]["quantity_period"];
          site_id?: string;
          status?: Database["public"]["Enums"]["listing_status"];
          title?: string;
          transport?: Database["public"]["Enums"]["transport_terms"];
          unit?: Database["public"]["Enums"]["quantity_unit"];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "listings_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "listings_site_id_fkey";
            columns: ["site_id"];
            isOneToOne: false;
            referencedRelation: "sites";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "listings_feedstock_code_fkey";
            columns: ["feedstock_code"];
            isOneToOne: false;
            referencedRelation: "feedstock_types";
            referencedColumns: ["code"];
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
      search_listings: {
        Args: {
          p_feedstock_codes?: string[];
          p_limit?: number;
          p_listing_id?: string;
          p_max_km?: number;
          p_price?: string;
          p_site_id: string;
        };
        Returns: {
          approx_lat: number;
          approx_lon: number;
          available_from: string;
          available_until: string | null;
          description: string | null;
          distance_km: number;
          dm_pct: number | null;
          feedstock_code: string;
          listing_id: string;
          municipality: string | null;
          price_per_unit: number;
          published_at: string | null;
          quantity: number;
          quantity_period: Database["public"]["Enums"]["quantity_period"];
          seller_name: string;
          title: string;
          transport: Database["public"]["Enums"]["transport_terms"];
          unit: Database["public"]["Enums"]["quantity_unit"];
        }[];
      };
      set_listing_status: {
        Args: { p_listing_id: string; p_status: Database["public"]["Enums"]["listing_status"] };
        Returns: undefined;
      };
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
      listing_status: "draft" | "active" | "paused" | "closed";
      market_role: "buyer" | "seller";
      org_role: "owner" | "member";
      quantity_period: "week" | "month" | "year";
      quantity_unit: "t" | "m3";
      site_type: "biogas_plant" | "livestock_farm" | "agriculture" | "food_industry" | "other";
      transport_terms: "seller_delivers" | "buyer_collects" | "negotiable";
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
