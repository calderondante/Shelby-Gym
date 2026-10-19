
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "public": {
          Tables: {
            "activities": {
                  Row: {
                    "active": boolean,"created_at": string,"created_by": string,"description": string,"duration_count": number,"duration_unit": string,"id": string,"name": string,"offer_label": string,"offer_price_cents": number | null,"price_cents": number,"revision": number,"updated_at": string
                  }
                  Insert: {
                    "active"?: boolean,"created_at"?: string,"created_by"?: string,"description"?: string,"duration_count": number,"duration_unit": string,"id"?: string,"name": string,"offer_label"?: string,"offer_price_cents"?: number | null,"price_cents": number,"revision"?: number,"updated_at"?: string
                  }
                  Update: {
                    "active"?: boolean,"created_at"?: string,"created_by"?: string,"description"?: string,"duration_count"?: number,"duration_unit"?: string,"id"?: string,"name"?: string,"offer_label"?: string,"offer_price_cents"?: number | null,"price_cents"?: number,"revision"?: number,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "activities_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "staff"
      referencedColumns: ["id"]
    }
                  ]
                },"customer_events": {
                  Row: { "id": string,"customer_id": string,"event": string,"created_by": string,"created_at": string }
                  Insert: { "id"?: string,"customer_id": string,"event": string,"created_by": string,"created_at"?: string }
                  Update: { "id"?: string,"customer_id"?: string,"event"?: string,"created_by"?: string,"created_at"?: string }
                  Relationships: [
                    { foreignKeyName: "customer_events_customer_id_fkey"; columns: ["customer_id"]; isOneToOne: false; referencedRelation: "customers"; referencedColumns: ["id"] },
                    { foreignKeyName: "customer_events_created_by_fkey"; columns: ["created_by"]; isOneToOne: false; referencedRelation: "staff"; referencedColumns: ["id"] }
                  ]
                },"customers": {
                  Row: {
                    "age_as_of": string | null,"age_years": number | null,"status": string,"status_changed_at": string,"created_at": string,"created_by": string,"email": string,"id": string,"name": string,"notes": string,"phone": string,"revision": number,"updated_at": string
                  }
                  Insert: {
                    "age_as_of"?: string | null,"age_years"?: number | null,"status"?: string,"status_changed_at"?: string,"created_at"?: string,"created_by"?: string,"email"?: string,"id"?: string,"name": string,"notes"?: string,"phone"?: string,"revision"?: number,"updated_at"?: string
                  }
                  Update: {
                    "age_as_of"?: string | null,"age_years"?: number | null,"status"?: string,"status_changed_at"?: string,"created_at"?: string,"created_by"?: string,"email"?: string,"id"?: string,"name"?: string,"notes"?: string,"phone"?: string,"revision"?: number,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "customers_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "staff"
      referencedColumns: ["id"]
    }
                  ]
                },"gym_settings": {
                  Row: {
                    "currency": string,"id": boolean,"time_zone": string,"updated_at": string
                  }
                  Insert: {
                    "currency": string,"id"?: boolean,"time_zone": string,"updated_at"?: string
                  }
                  Update: {
                    "currency"?: string,"id"?: boolean,"time_zone"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"import_batches": {
                  Row: {
                    "created_at": string,"created_by": string,"fingerprint": string,"history_fingerprint": string | null,"id": string,"request_id": string,"result": NonNullable<Json>,"source": string
                  }
                  Insert: {
                    "created_at"?: string,"created_by": string,"fingerprint": string,"history_fingerprint"?: string | null,"id"?: string,"request_id": string,"result": NonNullable<Json>,"source": string
                  }
                  Update: {
                    "created_at"?: string,"created_by"?: string,"fingerprint"?: string,"history_fingerprint"?: string | null,"id"?: string,"request_id"?: string,"result"?: NonNullable<Json>,"source"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "import_batches_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "staff"
      referencedColumns: ["id"]
    }
                  ]
                },"import_customers": {
                  Row: {
                    "batch_id": string,"customer_id": string,"external_id": string,"fingerprint": string,"history_fingerprint": string | null,"source": string
                  }
                  Insert: {
                    "batch_id": string,"customer_id": string,"external_id": string,"fingerprint": string,"history_fingerprint"?: string | null,"source": string
                  }
                  Update: {
                    "batch_id"?: string,"customer_id"?: string,"external_id"?: string,"fingerprint"?: string,"history_fingerprint"?: string | null,"source"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "import_customers_batch_id_fkey"
      columns: ["batch_id"]
isOneToOne: false
      referencedRelation: "import_batches"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "import_customers_customer_id_fkey"
      columns: ["customer_id"]
isOneToOne: false
      referencedRelation: "customer_overview"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "import_customers_customer_id_fkey"
      columns: ["customer_id"]
isOneToOne: false
      referencedRelation: "customers"
      referencedColumns: ["id"]
    }
                  ]
                },"payment_batches": {
                  Row: {
                    "created_at": string,"created_by": string,"id": string,"import_batch_id": string | null,"occurred_on": string | null,"request_id": string,"subscription_id": string
                  }
                  Insert: {
                    "created_at"?: string,"created_by": string,"id"?: string,"import_batch_id"?: string | null,"occurred_on"?: string | null,"request_id": string,"subscription_id": string
                  }
                  Update: {
                    "created_at"?: string,"created_by"?: string,"id"?: string,"import_batch_id"?: string | null,"occurred_on"?: string | null,"request_id"?: string,"subscription_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "payment_batches_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "staff"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "payment_batches_import_batch_id_fkey"
      columns: ["import_batch_id"]
isOneToOne: false
      referencedRelation: "import_batches"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "payment_batches_subscription_id_fkey"
      columns: ["subscription_id"]
isOneToOne: false
      referencedRelation: "subscription_balances"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "payment_batches_subscription_id_fkey"
      columns: ["subscription_id"]
isOneToOne: false
      referencedRelation: "subscriptions"
      referencedColumns: ["id"]
    }
                  ]
                },"payment_entries": {
                  Row: {
                    "amount_cents": number,"batch_id": string,"id": string,"method": string
                  }
                  Insert: {
                    "amount_cents": number,"batch_id": string,"id"?: string,"method": string
                  }
                  Update: {
                    "amount_cents"?: number,"batch_id"?: string,"id"?: string,"method"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "payment_entries_batch_id_fkey"
      columns: ["batch_id"]
isOneToOne: false
      referencedRelation: "payment_batches"
      referencedColumns: ["id"]
    }
                  ]
                },"staff": {
                  Row: {
                    "active": boolean,"created_at": string,"id": string,"name": string,"role": string
                  }
                  Insert: {
                    "active"?: boolean,"created_at"?: string,"id": string,"name": string,"role": string
                  }
                  Update: {
                    "active"?: boolean,"created_at"?: string,"id"?: string,"name"?: string,"role"?: string
                  }
                  Relationships: [
                    
                  ]
                },"subscriptions": {
                  Row: {
                    "activity_description": string,"activity_id": string,"activity_name": string,"created_at": string,"created_by": string,"currency": string,"customer_id": string,"duration_count": number,"duration_unit": string,"ends_on": string,"id": string,"import_batch_id": string | null,"offer_label": string,"opening_paid_cents": number,"request_fingerprint": string,"request_id": string,"starts_on": string,"total_cents": number
                  }
                  Insert: {
                    "activity_description": string,"activity_id": string,"activity_name": string,"created_at"?: string,"created_by": string,"currency": string,"customer_id": string,"duration_count": number,"duration_unit": string,"ends_on": string,"id"?: string,"import_batch_id"?: string | null,"offer_label"?: string,"opening_paid_cents"?: number,"request_fingerprint": string,"request_id": string,"starts_on": string,"total_cents": number
                  }
                  Update: {
                    "activity_description"?: string,"activity_id"?: string,"activity_name"?: string,"created_at"?: string,"created_by"?: string,"currency"?: string,"customer_id"?: string,"duration_count"?: number,"duration_unit"?: string,"ends_on"?: string,"id"?: string,"import_batch_id"?: string | null,"offer_label"?: string,"opening_paid_cents"?: number,"request_fingerprint"?: string,"request_id"?: string,"starts_on"?: string,"total_cents"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "subscriptions_activity_id_fkey"
      columns: ["activity_id"]
isOneToOne: false
      referencedRelation: "activities"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "subscriptions_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "staff"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "subscriptions_customer_id_fkey"
      columns: ["customer_id"]
isOneToOne: false
      referencedRelation: "customer_overview"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "subscriptions_customer_id_fkey"
      columns: ["customer_id"]
isOneToOne: false
      referencedRelation: "customers"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "subscriptions_import_batch_id_fkey"
      columns: ["import_batch_id"]
isOneToOne: false
      referencedRelation: "import_batches"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            "customer_overview": {
                  Row: {
                    "activity_names": string | null,"balance_cents": number | null,"status": string | null,"status_changed_at": string | null,"created_at": string | null,"created_by": string | null,"email": string | null,"has_active": boolean | null,"id": string | null,"last_end": string | null,"name": string | null,"notes": string | null,"phone": string | null,"revision": number | null,"updated_at": string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "customers_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "staff"
      referencedColumns: ["id"]
    }
                  ]
                },"subscription_balances": {
                  Row: {
                    "activity_description": string | null,"activity_id": string | null,"activity_name": string | null,"balance_cents": number | null,"created_at": string | null,"created_by": string | null,"currency": string | null,"customer_id": string | null,"duration_count": number | null,"duration_unit": string | null,"ends_on": string | null,"id": string | null,"import_batch_id": string | null,"offer_label": string | null,"opening_paid_cents": number | null,"paid_cents": number | null,"request_fingerprint": string | null,"request_id": string | null,"starts_on": string | null,"total_cents": number | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "subscriptions_activity_id_fkey"
      columns: ["activity_id"]
isOneToOne: false
      referencedRelation: "activities"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "subscriptions_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "staff"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "subscriptions_customer_id_fkey"
      columns: ["customer_id"]
isOneToOne: false
      referencedRelation: "customer_overview"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "subscriptions_customer_id_fkey"
      columns: ["customer_id"]
isOneToOne: false
      referencedRelation: "customers"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "subscriptions_import_batch_id_fkey"
      columns: ["import_batch_id"]
isOneToOne: false
      referencedRelation: "import_batches"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Functions: {
            "change_customer_status":
{ Args: { "p_id": string,"p_revision": number,"p_status": string }; Returns: undefined
                           },
"configure_gym":
{ Args: { "p_currency": string,"p_time_zone": string }; Returns: undefined
                           },
"enroll_customer":
{ Args: { "p_activity": string,"p_customer": Json,"p_customer_id": string,"p_entries": Json,"p_expected_price": number,"p_expected_revision": number,"p_expected_start": string,"p_request": string }; Returns: string
                           },
"import_gym_history":
{ Args: { "p_clients": Json,"p_commit"?: boolean,"p_currency": string,"p_request": string,"p_source": string }; Returns: Json
                           },
"record_payment":
{ Args: { "p_entries": Json,"p_request": string,"p_subscription": string }; Returns: string
                           },
"save_activity":
{ Args: { "p_data": Json,"p_id": string,"p_revision": number }; Returns: string
                           },
"update_customer":
{ Args: { "p_data": Json,"p_id": string,"p_revision": number }; Returns: undefined
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

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "public": {
          Enums: {
            
          }
        }
} as const
