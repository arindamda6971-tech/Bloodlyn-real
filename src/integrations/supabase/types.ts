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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      addresses: {
        Row: {
          address_line1: string
          address_line2: string | null
          city: string
          created_at: string
          id: string
          is_default: boolean | null
          latitude: number | null
          longitude: number | null
          pincode: string
          state: string
          type: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address_line1: string
          address_line2?: string | null
          city: string
          created_at?: string
          id?: string
          is_default?: boolean | null
          latitude?: number | null
          longitude?: number | null
          pincode: string
          state: string
          type?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          address_line1?: string
          address_line2?: string | null
          city?: string
          created_at?: string
          id?: string
          is_default?: boolean | null
          latitude?: number | null
          longitude?: number | null
          pincode?: string
          state?: string
          type?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      cart_items: {
        Row: {
          created_at: string
          family_member_id: string | null
          id: string
          lab_id: string | null
          lab_name: string | null
          package_id: string | null
          price: number | null
          quantity: number | null
          test_id: string | null
          test_name: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          family_member_id?: string | null
          id?: string
          lab_id?: string | null
          lab_name?: string | null
          package_id?: string | null
          price?: number | null
          quantity?: number | null
          test_id?: string | null
          test_name?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          family_member_id?: string | null
          id?: string
          lab_id?: string | null
          lab_name?: string | null
          package_id?: string | null
          price?: number | null
          quantity?: number | null
          test_id?: string | null
          test_name?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cart_items_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "test_packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cart_items_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "tests"
            referencedColumns: ["id"]
          },
        ]
      }
      diagnostic_centers: {
        Row: {
          address: string
          available_tests: Json | null
          city: string
          closing_time: string | null
          created_at: string
          ecg_available: boolean | null
          ecg_price: number | null
          email: string | null
          home_collection_available: boolean | null
          id: string
          is_active: boolean | null
          is_verified: boolean | null
          latitude: number | null
          logo_url: string | null
          longitude: number | null
          name: string
          opening_time: string | null
          phone: string | null
          pincode: string
          pricing: Json | null
          rating: number | null
          reviews_count: number | null
          services: Json | null
          state: string
          updated_at: string
          vendor_id: string | null
        }
        Insert: {
          address: string
          available_tests?: Json | null
          city: string
          closing_time?: string | null
          created_at?: string
          ecg_available?: boolean | null
          ecg_price?: number | null
          email?: string | null
          home_collection_available?: boolean | null
          id?: string
          is_active?: boolean | null
          is_verified?: boolean | null
          latitude?: number | null
          logo_url?: string | null
          longitude?: number | null
          name: string
          opening_time?: string | null
          phone?: string | null
          pincode: string
          pricing?: Json | null
          rating?: number | null
          reviews_count?: number | null
          services?: Json | null
          state: string
          updated_at?: string
          vendor_id?: string | null
        }
        Update: {
          address?: string
          available_tests?: Json | null
          city?: string
          closing_time?: string | null
          created_at?: string
          ecg_available?: boolean | null
          ecg_price?: number | null
          email?: string | null
          home_collection_available?: boolean | null
          id?: string
          is_active?: boolean | null
          is_verified?: boolean | null
          latitude?: number | null
          logo_url?: string | null
          longitude?: number | null
          name?: string
          opening_time?: string | null
          phone?: string | null
          pincode?: string
          pricing?: Json | null
          rating?: number | null
          reviews_count?: number | null
          services?: Json | null
          state?: string
          updated_at?: string
          vendor_id?: string | null
        }
        Relationships: []
      }
      family_members: {
        Row: {
          age: string
          created_at: string
          custom_relationship: string | null
          full_name: string
          gender: string
          id: string
          phone: string
          relationship: string
          updated_at: string
          user_id: string
        }
        Insert: {
          age: string
          created_at?: string
          custom_relationship?: string | null
          full_name: string
          gender: string
          id?: string
          phone: string
          relationship: string
          updated_at?: string
          user_id: string
        }
        Update: {
          age?: string
          created_at?: string
          custom_relationship?: string | null
          full_name?: string
          gender?: string
          id?: string
          phone?: string
          relationship?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      order_items: {
        Row: {
          created_at: string
          family_member_id: string | null
          id: string
          order_id: string | null
          package_id: string | null
          price: number
          quantity: number | null
          test_id: string | null
        }
        Insert: {
          created_at?: string
          family_member_id?: string | null
          id?: string
          order_id?: string | null
          package_id?: string | null
          price: number
          quantity?: number | null
          test_id?: string | null
        }
        Update: {
          created_at?: string
          family_member_id?: string | null
          id?: string
          order_id?: string | null
          package_id?: string | null
          price?: number
          quantity?: number | null
          test_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "test_packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "tests"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          address_id: string | null
          coupon_code: string | null
          created_at: string
          discount: number | null
          family_member_id: string | null
          id: string
          lab_name: string | null
          order_number: string | null
          payment_method: string | null
          payment_status: string | null
          phlebotomist_id: string | null
          report_url: string | null
          scheduled_date: string | null
          scheduled_time_slot: string | null
          special_instructions: string | null
          status: string | null
          subtotal: number
          test_name: string | null
          total: number
          updated_at: string
          user_id: string
          vendor_id: string | null
        }
        Insert: {
          address_id?: string | null
          coupon_code?: string | null
          created_at?: string
          discount?: number | null
          family_member_id?: string | null
          id?: string
          lab_name?: string | null
          order_number?: string | null
          payment_method?: string | null
          payment_status?: string | null
          phlebotomist_id?: string | null
          report_url?: string | null
          scheduled_date?: string | null
          scheduled_time_slot?: string | null
          special_instructions?: string | null
          status?: string | null
          subtotal?: number
          test_name?: string | null
          total?: number
          updated_at?: string
          user_id: string
          vendor_id?: string | null
        }
        Update: {
          address_id?: string | null
          coupon_code?: string | null
          created_at?: string
          discount?: number | null
          family_member_id?: string | null
          id?: string
          lab_name?: string | null
          order_number?: string | null
          payment_method?: string | null
          payment_status?: string | null
          phlebotomist_id?: string | null
          report_url?: string | null
          scheduled_date?: string | null
          scheduled_time_slot?: string | null
          special_instructions?: string | null
          status?: string | null
          subtotal?: number
          test_name?: string | null
          total?: number
          updated_at?: string
          user_id?: string
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_address_id_fkey"
            columns: ["address_id"]
            isOneToOne: false
            referencedRelation: "addresses"
            referencedColumns: ["id"]
          },
        ]
      }
      package_tests: {
        Row: {
          package_id: string
          test_id: string
        }
        Insert: {
          package_id: string
          test_id: string
        }
        Update: {
          package_id?: string
          test_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "package_tests_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "test_packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "package_tests_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "tests"
            referencedColumns: ["id"]
          },
        ]
      }
      phlebotomists: {
        Row: {
          created_at: string
          current_latitude: number | null
          current_longitude: number | null
          experience_years: number | null
          id: string
          is_available: boolean | null
          name: string
          phone: string | null
          photo_url: string | null
          rating: number | null
          reviews_count: number | null
          verification_id: string | null
        }
        Insert: {
          created_at?: string
          current_latitude?: number | null
          current_longitude?: number | null
          experience_years?: number | null
          id?: string
          is_available?: boolean | null
          name: string
          phone?: string | null
          photo_url?: string | null
          rating?: number | null
          reviews_count?: number | null
          verification_id?: string | null
        }
        Update: {
          created_at?: string
          current_latitude?: number | null
          current_longitude?: number | null
          experience_years?: number | null
          id?: string
          is_available?: boolean | null
          name?: string
          phone?: string | null
          photo_url?: string | null
          rating?: number | null
          reviews_count?: number | null
          verification_id?: string | null
        }
        Relationships: []
      }
      products: {
        Row: {
          availability: boolean
          category: string | null
          created_at: string
          description: string | null
          id: string
          name: string | null
          price: number
          product_name: string
          test_id: string | null
          updated_at: string
          vendor_id: string
        }
        Insert: {
          availability?: boolean
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name?: string | null
          price?: number
          product_name: string
          test_id?: string | null
          updated_at?: string
          vendor_id: string
        }
        Update: {
          availability?: boolean
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name?: string | null
          price?: number
          product_name?: string
          test_id?: string | null
          updated_at?: string
          vendor_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          blood_group: string | null
          created_at: string
          date_of_birth: string | null
          email: string | null
          full_name: string | null
          gender: string | null
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          blood_group?: string | null
          created_at?: string
          date_of_birth?: string | null
          email?: string | null
          full_name?: string | null
          gender?: string | null
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          blood_group?: string | null
          created_at?: string
          date_of_birth?: string | null
          email?: string | null
          full_name?: string | null
          gender?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      referrals: {
        Row: {
          created_at: string
          id: string
          referred_id: string
          referrer_id: string
          reward_amount: number | null
          status: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          referred_id: string
          referrer_id: string
          reward_amount?: number | null
          status?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          referred_id?: string
          referrer_id?: string
          reward_amount?: number | null
          status?: string | null
        }
        Relationships: []
      }
      reports: {
        Row: {
          abnormal_count: number | null
          ai_recommendations: Json | null
          ai_summary: string | null
          created_at: string
          family_member_id: string | null
          generated_at: string | null
          id: string
          lab_name: string | null
          order_id: string | null
          parameters: Json | null
          pdf_url: string | null
          risk_level: string | null
          status: string | null
          test_id: string | null
          user_id: string
        }
        Insert: {
          abnormal_count?: number | null
          ai_recommendations?: Json | null
          ai_summary?: string | null
          created_at?: string
          family_member_id?: string | null
          generated_at?: string | null
          id?: string
          lab_name?: string | null
          order_id?: string | null
          parameters?: Json | null
          pdf_url?: string | null
          risk_level?: string | null
          status?: string | null
          test_id?: string | null
          user_id: string
        }
        Update: {
          abnormal_count?: number | null
          ai_recommendations?: Json | null
          ai_summary?: string | null
          created_at?: string
          family_member_id?: string | null
          generated_at?: string | null
          id?: string
          lab_name?: string | null
          order_id?: string | null
          parameters?: Json | null
          pdf_url?: string | null
          risk_level?: string | null
          status?: string | null
          test_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reports_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "tests"
            referencedColumns: ["id"]
          },
        ]
      }
      rewards: {
        Row: {
          created_at: string
          id: string
          referral_code: string | null
          referral_count: number | null
          total_points: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          referral_code?: string | null
          referral_count?: number | null
          total_points?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          referral_code?: string | null
          referral_count?: number | null
          total_points?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      serviceable_pincodes: {
        Row: {
          city: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          pincode: string
          state: string | null
        }
        Insert: {
          city?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          pincode: string
          state?: string | null
        }
        Update: {
          city?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          pincode?: string
          state?: string | null
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          amount_paid: number
          created_at: string
          end_date: string
          id: string
          is_auto_renew: boolean
          membership_type: string
          start_date: string
          status: string
          subscriber_name: string | null
          subscriber_type: string
          subscription_plan: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount_paid: number
          created_at?: string
          end_date: string
          id?: string
          is_auto_renew?: boolean
          membership_type?: string
          start_date?: string
          status?: string
          subscriber_name?: string | null
          subscriber_type?: string
          subscription_plan: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount_paid?: number
          created_at?: string
          end_date?: string
          id?: string
          is_auto_renew?: boolean
          membership_type?: string
          start_date?: string
          status?: string
          subscriber_name?: string | null
          subscriber_type?: string
          subscription_plan?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      test_categories: {
        Row: {
          created_at: string
          description: string | null
          icon: string | null
          id: string
          is_active: boolean | null
          name: string
          sort_order: number | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          sort_order?: number | null
        }
        Update: {
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          sort_order?: number | null
        }
        Relationships: []
      }
      test_packages: {
        Row: {
          color: string | null
          created_at: string
          description: string | null
          diagnostic_center_id: string | null
          discount_percent: number | null
          icon: string | null
          id: string
          is_active: boolean | null
          is_popular: boolean | null
          name: string
          original_price: number | null
          price: number
          tests_count: number | null
        }
        Insert: {
          color?: string | null
          created_at?: string
          description?: string | null
          diagnostic_center_id?: string | null
          discount_percent?: number | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          is_popular?: boolean | null
          name: string
          original_price?: number | null
          price: number
          tests_count?: number | null
        }
        Update: {
          color?: string | null
          created_at?: string
          description?: string | null
          diagnostic_center_id?: string | null
          discount_percent?: number | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          is_popular?: boolean | null
          name?: string
          original_price?: number | null
          price?: number
          tests_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "test_packages_diagnostic_center_id_fkey"
            columns: ["diagnostic_center_id"]
            isOneToOne: false
            referencedRelation: "diagnostic_centers"
            referencedColumns: ["id"]
          },
        ]
      }
      tests: {
        Row: {
          category_id: string | null
          created_at: string
          description: string | null
          discount_percent: number | null
          fasting_hours: number | null
          fasting_required: boolean | null
          id: string
          is_active: boolean | null
          is_popular: boolean | null
          name: string
          original_price: number | null
          parameters: Json | null
          preparation_instructions: string | null
          price: number
          report_time_hours: number | null
          sample_type: string | null
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          description?: string | null
          discount_percent?: number | null
          fasting_hours?: number | null
          fasting_required?: boolean | null
          id?: string
          is_active?: boolean | null
          is_popular?: boolean | null
          name: string
          original_price?: number | null
          parameters?: Json | null
          preparation_instructions?: string | null
          price: number
          report_time_hours?: number | null
          sample_type?: string | null
        }
        Update: {
          category_id?: string | null
          created_at?: string
          description?: string | null
          discount_percent?: number | null
          fasting_hours?: number | null
          fasting_required?: boolean | null
          id?: string
          is_active?: boolean | null
          is_popular?: boolean | null
          name?: string
          original_price?: number | null
          parameters?: Json | null
          preparation_instructions?: string | null
          price?: number
          report_time_hours?: number | null
          sample_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tests_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "test_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      user_prescriptions: {
        Row: {
          analysis_result: Json | null
          created_at: string
          id: string
          image_url: string
          status: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          analysis_result?: Json | null
          created_at?: string
          id?: string
          image_url: string
          status?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          analysis_result?: Json | null
          created_at?: string
          id?: string
          image_url?: string
          status?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
    }
    Views: {
      phlebotomists_public: {
        Row: {
          experience_years: number | null
          id: string | null
          is_available: boolean | null
          name: string | null
          photo_url: string | null
          rating: number | null
          reviews_count: number | null
        }
        Insert: {
          experience_years?: number | null
          id?: string | null
          is_available?: boolean | null
          name?: string | null
          photo_url?: string | null
          rating?: number | null
          reviews_count?: number | null
        }
        Update: {
          experience_years?: number | null
          id?: string | null
          is_available?: boolean | null
          name?: string | null
          photo_url?: string | null
          rating?: number | null
          reviews_count?: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "vendor" | "user"
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
      app_role: ["admin", "vendor", "user"],
    },
  },
} as const
