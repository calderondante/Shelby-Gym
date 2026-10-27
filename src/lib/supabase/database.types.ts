export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      activities: {
        Row: {
          active: boolean;
          created_at: string;
          created_by: string;
          description: string;
          duration_count: number;
          duration_unit: string;
          id: string;
          name: string;
          offer_label: string;
          offer_price_cents: number | null;
          price_cents: number;
          revision: number;
          updated_at: string;
        };
        Insert: {
          active?: boolean;
          created_at?: string;
          created_by?: string;
          description?: string;
          duration_count: number;
          duration_unit: string;
          id?: string;
          name: string;
          offer_label?: string;
          offer_price_cents?: number | null;
          price_cents: number;
          revision?: number;
          updated_at?: string;
        };
        Update: {
          active?: boolean;
          created_at?: string;
          created_by?: string;
          description?: string;
          duration_count?: number;
          duration_unit?: string;
          id?: string;
          name?: string;
          offer_label?: string;
          offer_price_cents?: number | null;
          price_cents?: number;
          revision?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "activities_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "staff";
            referencedColumns: ["id"];
          },
        ];
      };
      campaign_recipients: {
        Row: {
          campaign_id: string;
          customer_id: string;
        };
        Insert: {
          campaign_id: string;
          customer_id: string;
        };
        Update: {
          campaign_id?: string;
          customer_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "campaign_recipients_campaign_id_fkey";
            columns: ["campaign_id"];
            isOneToOne: false;
            referencedRelation: "campaigns";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "campaign_recipients_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "customer_overview";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "campaign_recipients_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "customers";
            referencedColumns: ["id"];
          },
        ];
      };
      campaigns: {
        Row: {
          activity_id: string | null;
          channel: string;
          created_at: string;
          created_by: string;
          id: string;
          message: string;
          offer: string;
          preparation_fingerprint: string | null;
          request_id: string;
          scheduled_for: string | null;
          segment: string;
          status: string;
          template_id: string | null;
          title: string;
        };
        Insert: {
          activity_id?: string | null;
          channel?: string;
          created_at?: string;
          created_by: string;
          id?: string;
          message: string;
          offer?: string;
          preparation_fingerprint?: string | null;
          request_id: string;
          scheduled_for?: string | null;
          segment?: string;
          status?: string;
          template_id?: string | null;
          title: string;
        };
        Update: {
          activity_id?: string | null;
          channel?: string;
          created_at?: string;
          created_by?: string;
          id?: string;
          message?: string;
          offer?: string;
          preparation_fingerprint?: string | null;
          request_id?: string;
          scheduled_for?: string | null;
          segment?: string;
          status?: string;
          template_id?: string | null;
          title?: string;
        };
        Relationships: [
          {
            foreignKeyName: "campaigns_activity_id_fkey";
            columns: ["activity_id"];
            isOneToOne: false;
            referencedRelation: "activities";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "campaigns_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "staff";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "campaigns_template_id_fkey";
            columns: ["template_id"];
            isOneToOne: false;
            referencedRelation: "communication_templates";
            referencedColumns: ["id"];
          },
        ];
      };
      communication_outbox: {
        Row: {
          body: string;
          campaign_id: string | null;
          channel: string;
          created_at: string;
          created_by: string;
          customer_id: string | null;
          dedup_key: string;
          destination: string;
          expense_id: string | null;
          id: string;
          note: string;
          owner_contact_id: string | null;
          recipient_name: string;
          scheduled_for: string;
          source: string;
          status: string;
          template_id: string | null;
          updated_at: string;
        };
        Insert: {
          body: string;
          campaign_id?: string | null;
          channel: string;
          created_at?: string;
          created_by: string;
          customer_id?: string | null;
          dedup_key: string;
          destination: string;
          expense_id?: string | null;
          id?: string;
          note?: string;
          owner_contact_id?: string | null;
          recipient_name: string;
          scheduled_for: string;
          source: string;
          status?: string;
          template_id?: string | null;
          updated_at?: string;
        };
        Update: {
          body?: string;
          campaign_id?: string | null;
          channel?: string;
          created_at?: string;
          created_by?: string;
          customer_id?: string | null;
          dedup_key?: string;
          destination?: string;
          expense_id?: string | null;
          id?: string;
          note?: string;
          owner_contact_id?: string | null;
          recipient_name?: string;
          scheduled_for?: string;
          source?: string;
          status?: string;
          template_id?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "communication_outbox_campaign_id_fkey";
            columns: ["campaign_id"];
            isOneToOne: false;
            referencedRelation: "campaigns";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "communication_outbox_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "staff";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "communication_outbox_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "customer_overview";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "communication_outbox_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "customers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "communication_outbox_expense_id_fkey";
            columns: ["expense_id"];
            isOneToOne: false;
            referencedRelation: "expense_balances";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "communication_outbox_expense_id_fkey";
            columns: ["expense_id"];
            isOneToOne: false;
            referencedRelation: "expenses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "communication_outbox_owner_contact_id_fkey";
            columns: ["owner_contact_id"];
            isOneToOne: false;
            referencedRelation: "communication_owner_contacts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "communication_outbox_template_id_fkey";
            columns: ["template_id"];
            isOneToOne: false;
            referencedRelation: "communication_templates";
            referencedColumns: ["id"];
          },
        ];
      };
      communication_owner_contacts: {
        Row: {
          active: boolean;
          created_at: string;
          created_by: string;
          id: string;
          name: string;
          phone: string;
          revision: number;
          updated_at: string;
        };
        Insert: {
          active?: boolean;
          created_at?: string;
          created_by: string;
          id?: string;
          name: string;
          phone: string;
          revision?: number;
          updated_at?: string;
        };
        Update: {
          active?: boolean;
          created_at?: string;
          created_by?: string;
          id?: string;
          name?: string;
          phone?: string;
          revision?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "communication_owner_contacts_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "staff";
            referencedColumns: ["id"];
          },
        ];
      };
      communication_rule_customers: {
        Row: {
          customer_id: string;
          rule_kind: string;
        };
        Insert: {
          customer_id: string;
          rule_kind: string;
        };
        Update: {
          customer_id?: string;
          rule_kind?: string;
        };
        Relationships: [
          {
            foreignKeyName: "communication_rule_customers_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "customer_overview";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "communication_rule_customers_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "customers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "communication_rule_customers_rule_kind_fkey";
            columns: ["rule_kind"];
            isOneToOne: false;
            referencedRelation: "communication_rules";
            referencedColumns: ["kind"];
          },
        ];
      };
      communication_rules: {
        Row: {
          audience: string;
          channel: string;
          days_before: number;
          enabled: boolean;
          kind: string;
          notify_before: boolean;
          notify_on_due: boolean;
          notify_overdue: boolean;
          offer: string;
          overdue_every: number;
          recurring_only: boolean;
          revision: number;
          send_hour: number;
          template_id: string;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          audience?: string;
          channel?: string;
          days_before?: number;
          enabled?: boolean;
          kind: string;
          notify_before?: boolean;
          notify_on_due?: boolean;
          notify_overdue?: boolean;
          offer?: string;
          overdue_every?: number;
          recurring_only?: boolean;
          revision?: number;
          send_hour?: number;
          template_id: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          audience?: string;
          channel?: string;
          days_before?: number;
          enabled?: boolean;
          kind?: string;
          notify_before?: boolean;
          notify_on_due?: boolean;
          notify_overdue?: boolean;
          offer?: string;
          overdue_every?: number;
          recurring_only?: boolean;
          revision?: number;
          send_hour?: number;
          template_id?: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "communication_rules_template_id_fkey";
            columns: ["template_id"];
            isOneToOne: false;
            referencedRelation: "communication_templates";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "communication_rules_updated_by_fkey";
            columns: ["updated_by"];
            isOneToOne: false;
            referencedRelation: "staff";
            referencedColumns: ["id"];
          },
        ];
      };
      communication_settings: {
        Row: {
          business_name: string;
          id: boolean;
          instagram_handle: string;
          revision: number;
          updated_at: string;
          updated_by: string | null;
          whatsapp_phone: string;
        };
        Insert: {
          business_name?: string;
          id?: boolean;
          instagram_handle?: string;
          revision?: number;
          updated_at?: string;
          updated_by?: string | null;
          whatsapp_phone?: string;
        };
        Update: {
          business_name?: string;
          id?: boolean;
          instagram_handle?: string;
          revision?: number;
          updated_at?: string;
          updated_by?: string | null;
          whatsapp_phone?: string;
        };
        Relationships: [
          {
            foreignKeyName: "communication_settings_updated_by_fkey";
            columns: ["updated_by"];
            isOneToOne: false;
            referencedRelation: "staff";
            referencedColumns: ["id"];
          },
        ];
      };
      communication_templates: {
        Row: {
          body: string;
          channel: string;
          id: string;
          purpose: string;
          revision: number;
          slug: string | null;
          title: string;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          body: string;
          channel: string;
          id?: string;
          purpose: string;
          revision?: number;
          slug?: string | null;
          title: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          body?: string;
          channel?: string;
          id?: string;
          purpose?: string;
          revision?: number;
          slug?: string | null;
          title?: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "communication_templates_updated_by_fkey";
            columns: ["updated_by"];
            isOneToOne: false;
            referencedRelation: "staff";
            referencedColumns: ["id"];
          },
        ];
      };
      customer_events: {
        Row: {
          created_at: string;
          created_by: string;
          customer_id: string;
          event: string;
          id: string;
        };
        Insert: {
          created_at?: string;
          created_by: string;
          customer_id: string;
          event: string;
          id?: string;
        };
        Update: {
          created_at?: string;
          created_by?: string;
          customer_id?: string;
          event?: string;
          id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "customer_events_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "staff";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "customer_events_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "customer_overview";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "customer_events_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "customers";
            referencedColumns: ["id"];
          },
        ];
      };
      customers: {
        Row: {
          age_as_of: string | null;
          age_years: number | null;
          birth_month: number | null;
          created_at: string;
          created_by: string;
          email: string;
          id: string;
          instagram: string;
          instagram_marketing_opt_in: boolean;
          marketing_opt_in: boolean;
          name: string;
          notes: string;
          phone: string;
          revision: number;
          status: string;
          status_changed_at: string;
          updated_at: string;
        };
        Insert: {
          age_as_of?: string | null;
          age_years?: number | null;
          birth_month?: number | null;
          created_at?: string;
          created_by?: string;
          email?: string;
          id?: string;
          instagram?: string;
          instagram_marketing_opt_in?: boolean;
          marketing_opt_in?: boolean;
          name: string;
          notes?: string;
          phone?: string;
          revision?: number;
          status?: string;
          status_changed_at?: string;
          updated_at?: string;
        };
        Update: {
          age_as_of?: string | null;
          age_years?: number | null;
          birth_month?: number | null;
          created_at?: string;
          created_by?: string;
          email?: string;
          id?: string;
          instagram?: string;
          instagram_marketing_opt_in?: boolean;
          marketing_opt_in?: boolean;
          name?: string;
          notes?: string;
          phone?: string;
          revision?: number;
          status?: string;
          status_changed_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "customers_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "staff";
            referencedColumns: ["id"];
          },
        ];
      };
      expense_payments: {
        Row: {
          amount_cents: number;
          created_at: string;
          created_by: string;
          entries: NonNullable<Json>;
          expense_id: string;
          id: string;
          occurred_on: string;
          reason: string;
          request_id: string;
          reversal_of: string | null;
        };
        Insert: {
          amount_cents: number;
          created_at?: string;
          created_by: string;
          entries: NonNullable<Json>;
          expense_id: string;
          id?: string;
          occurred_on: string;
          reason?: string;
          request_id: string;
          reversal_of?: string | null;
        };
        Update: {
          amount_cents?: number;
          created_at?: string;
          created_by?: string;
          entries?: NonNullable<Json>;
          expense_id?: string;
          id?: string;
          occurred_on?: string;
          reason?: string;
          request_id?: string;
          reversal_of?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "expense_payments_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "staff";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "expense_payments_expense_id_fkey";
            columns: ["expense_id"];
            isOneToOne: false;
            referencedRelation: "expense_balances";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "expense_payments_expense_id_fkey";
            columns: ["expense_id"];
            isOneToOne: false;
            referencedRelation: "expenses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "expense_payments_reversal_of_fkey";
            columns: ["reversal_of"];
            isOneToOne: true;
            referencedRelation: "expense_payments";
            referencedColumns: ["id"];
          },
        ];
      };
      expense_templates: {
        Row: {
          active: boolean;
          amount_cents: number;
          category: string;
          created_at: string;
          created_by: string;
          due_day: number;
          id: string;
          revision: number;
          title: string;
        };
        Insert: {
          active?: boolean;
          amount_cents: number;
          category?: string;
          created_at?: string;
          created_by: string;
          due_day: number;
          id?: string;
          revision?: number;
          title: string;
        };
        Update: {
          active?: boolean;
          amount_cents?: number;
          category?: string;
          created_at?: string;
          created_by?: string;
          due_day?: number;
          id?: string;
          revision?: number;
          title?: string;
        };
        Relationships: [
          {
            foreignKeyName: "expense_templates_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "staff";
            referencedColumns: ["id"];
          },
        ];
      };
      expenses: {
        Row: {
          category: string;
          created_at: string;
          created_by: string;
          due_on: string;
          id: string;
          invoice_number: string;
          notes: string;
          request_id: string;
          revision: number;
          supplier: string;
          template_id: string | null;
          template_month: string | null;
          title: string;
          total_cents: number;
        };
        Insert: {
          category: string;
          created_at?: string;
          created_by: string;
          due_on: string;
          id?: string;
          invoice_number?: string;
          notes?: string;
          request_id: string;
          revision?: number;
          supplier?: string;
          template_id?: string | null;
          template_month?: string | null;
          title: string;
          total_cents: number;
        };
        Update: {
          category?: string;
          created_at?: string;
          created_by?: string;
          due_on?: string;
          id?: string;
          invoice_number?: string;
          notes?: string;
          request_id?: string;
          revision?: number;
          supplier?: string;
          template_id?: string | null;
          template_month?: string | null;
          title?: string;
          total_cents?: number;
        };
        Relationships: [
          {
            foreignKeyName: "expenses_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "staff";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "expenses_template_id_fkey";
            columns: ["template_id"];
            isOneToOne: false;
            referencedRelation: "expense_templates";
            referencedColumns: ["id"];
          },
        ];
      };
      gym_settings: {
        Row: {
          currency: string;
          id: boolean;
          time_zone: string;
          updated_at: string;
        };
        Insert: {
          currency: string;
          id?: boolean;
          time_zone: string;
          updated_at?: string;
        };
        Update: {
          currency?: string;
          id?: boolean;
          time_zone?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      import_batches: {
        Row: {
          created_at: string;
          created_by: string;
          fingerprint: string;
          history_fingerprint: string | null;
          id: string;
          request_id: string;
          result: NonNullable<Json>;
          source: string;
        };
        Insert: {
          created_at?: string;
          created_by: string;
          fingerprint: string;
          history_fingerprint?: string | null;
          id?: string;
          request_id: string;
          result: NonNullable<Json>;
          source: string;
        };
        Update: {
          created_at?: string;
          created_by?: string;
          fingerprint?: string;
          history_fingerprint?: string | null;
          id?: string;
          request_id?: string;
          result?: NonNullable<Json>;
          source?: string;
        };
        Relationships: [
          {
            foreignKeyName: "import_batches_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "staff";
            referencedColumns: ["id"];
          },
        ];
      };
      import_customers: {
        Row: {
          batch_id: string;
          customer_id: string;
          external_id: string;
          fingerprint: string;
          history_fingerprint: string | null;
          source: string;
        };
        Insert: {
          batch_id: string;
          customer_id: string;
          external_id: string;
          fingerprint: string;
          history_fingerprint?: string | null;
          source: string;
        };
        Update: {
          batch_id?: string;
          customer_id?: string;
          external_id?: string;
          fingerprint?: string;
          history_fingerprint?: string | null;
          source?: string;
        };
        Relationships: [
          {
            foreignKeyName: "import_customers_batch_id_fkey";
            columns: ["batch_id"];
            isOneToOne: false;
            referencedRelation: "import_batches";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "import_customers_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "customer_overview";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "import_customers_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "customers";
            referencedColumns: ["id"];
          },
        ];
      };
      monthly_closings: {
        Row: {
          created_at: string;
          created_by: string;
          month: string;
          snapshot: NonNullable<Json>;
        };
        Insert: {
          created_at?: string;
          created_by: string;
          month: string;
          snapshot: NonNullable<Json>;
        };
        Update: {
          created_at?: string;
          created_by?: string;
          month?: string;
          snapshot?: NonNullable<Json>;
        };
        Relationships: [
          {
            foreignKeyName: "monthly_closings_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "staff";
            referencedColumns: ["id"];
          },
        ];
      };
      owner_notification_reads: {
        Row: {
          alert_key: string;
          read_at: string;
          staff_id: string;
        };
        Insert: {
          alert_key: string;
          read_at?: string;
          staff_id?: string;
        };
        Update: {
          alert_key?: string;
          read_at?: string;
          staff_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "owner_notification_reads_staff_id_fkey";
            columns: ["staff_id"];
            isOneToOne: false;
            referencedRelation: "staff";
            referencedColumns: ["id"];
          },
        ];
      };
      owner_notification_settings: {
        Row: {
          customers_enabled: boolean;
          days_before: number;
          enabled: boolean;
          expenses_enabled: boolean;
          id: boolean;
          notify_before: boolean;
          notify_on_due: boolean;
          notify_overdue: boolean;
          overdue_every: number;
          revision: number;
          send_hour: number;
          updated_at: string;
        };
        Insert: {
          customers_enabled?: boolean;
          days_before?: number;
          enabled?: boolean;
          expenses_enabled?: boolean;
          id?: boolean;
          notify_before?: boolean;
          notify_on_due?: boolean;
          notify_overdue?: boolean;
          overdue_every?: number;
          revision?: number;
          send_hour?: number;
          updated_at?: string;
        };
        Update: {
          customers_enabled?: boolean;
          days_before?: number;
          enabled?: boolean;
          expenses_enabled?: boolean;
          id?: boolean;
          notify_before?: boolean;
          notify_on_due?: boolean;
          notify_overdue?: boolean;
          overdue_every?: number;
          revision?: number;
          send_hour?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      paper_enrollments: {
        Row: {
          batch_id: string;
          created_at: string;
          created_by: string;
          customer_id: string;
          fingerprint: string;
          request_id: string;
          subscription_id: string;
        };
        Insert: {
          batch_id: string;
          created_at?: string;
          created_by: string;
          customer_id: string;
          fingerprint: string;
          request_id: string;
          subscription_id: string;
        };
        Update: {
          batch_id?: string;
          created_at?: string;
          created_by?: string;
          customer_id?: string;
          fingerprint?: string;
          request_id?: string;
          subscription_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "paper_enrollments_batch_id_fkey";
            columns: ["batch_id"];
            isOneToOne: true;
            referencedRelation: "import_batches";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "paper_enrollments_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "staff";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "paper_enrollments_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "customer_overview";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "paper_enrollments_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "customers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "paper_enrollments_subscription_id_fkey";
            columns: ["subscription_id"];
            isOneToOne: true;
            referencedRelation: "subscription_balances";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "paper_enrollments_subscription_id_fkey";
            columns: ["subscription_id"];
            isOneToOne: true;
            referencedRelation: "subscriptions";
            referencedColumns: ["id"];
          },
        ];
      };
      payment_batches: {
        Row: {
          created_at: string;
          created_by: string;
          id: string;
          import_batch_id: string | null;
          occurred_on: string | null;
          request_id: string;
          subscription_id: string;
        };
        Insert: {
          created_at?: string;
          created_by: string;
          id?: string;
          import_batch_id?: string | null;
          occurred_on?: string | null;
          request_id: string;
          subscription_id: string;
        };
        Update: {
          created_at?: string;
          created_by?: string;
          id?: string;
          import_batch_id?: string | null;
          occurred_on?: string | null;
          request_id?: string;
          subscription_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "payment_batches_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "staff";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "payment_batches_import_batch_id_fkey";
            columns: ["import_batch_id"];
            isOneToOne: false;
            referencedRelation: "import_batches";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "payment_batches_subscription_id_fkey";
            columns: ["subscription_id"];
            isOneToOne: false;
            referencedRelation: "subscription_balances";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "payment_batches_subscription_id_fkey";
            columns: ["subscription_id"];
            isOneToOne: false;
            referencedRelation: "subscriptions";
            referencedColumns: ["id"];
          },
        ];
      };
      payment_entries: {
        Row: {
          amount_cents: number;
          batch_id: string;
          id: string;
          method: string;
        };
        Insert: {
          amount_cents: number;
          batch_id: string;
          id?: string;
          method: string;
        };
        Update: {
          amount_cents?: number;
          batch_id?: string;
          id?: string;
          method?: string;
        };
        Relationships: [
          {
            foreignKeyName: "payment_entries_batch_id_fkey";
            columns: ["batch_id"];
            isOneToOne: false;
            referencedRelation: "payment_batches";
            referencedColumns: ["id"];
          },
        ];
      };
      raffle_draws: {
        Row: {
          birth_month: number;
          birth_year: number;
          created_at: string;
          created_by: string;
          cutoff_at: string | null;
          draw_on: string;
          snapshot_complete: boolean;
        };
        Insert: {
          birth_month: number;
          birth_year: number;
          created_at?: string;
          created_by: string;
          cutoff_at?: string | null;
          draw_on: string;
          snapshot_complete?: boolean;
        };
        Update: {
          birth_month?: number;
          birth_year?: number;
          created_at?: string;
          created_by?: string;
          cutoff_at?: string | null;
          draw_on?: string;
          snapshot_complete?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: "raffle_draws_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "staff";
            referencedColumns: ["id"];
          },
        ];
      };
      raffle_entries: {
        Row: {
          birth_month: number;
          birth_year: number;
          customer_id: string;
          customer_name: string;
          exclusion_reason: string | null;
          latest_end: string | null;
        };
        Insert: {
          birth_month: number;
          birth_year: number;
          customer_id: string;
          customer_name: string;
          exclusion_reason?: string | null;
          latest_end?: string | null;
        };
        Update: {
          birth_month?: number;
          birth_year?: number;
          customer_id?: string;
          customer_name?: string;
          exclusion_reason?: string | null;
          latest_end?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "raffle_entries_birth_year_birth_month_fkey";
            columns: ["birth_year", "birth_month"];
            isOneToOne: false;
            referencedRelation: "raffle_draws";
            referencedColumns: ["birth_year", "birth_month"];
          },
          {
            foreignKeyName: "raffle_entries_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "customer_overview";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "raffle_entries_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "customers";
            referencedColumns: ["id"];
          },
        ];
      };
      session_events: {
        Row: {
          created_at: string;
          created_by: string;
          debt_acknowledged: boolean;
          delta: number;
          id: string;
          occurred_on: string;
          reason: string;
          request_id: string;
          reversal_of: string | null;
          subscription_id: string;
        };
        Insert: {
          created_at?: string;
          created_by: string;
          debt_acknowledged?: boolean;
          delta: number;
          id?: string;
          occurred_on: string;
          reason?: string;
          request_id: string;
          reversal_of?: string | null;
          subscription_id: string;
        };
        Update: {
          created_at?: string;
          created_by?: string;
          debt_acknowledged?: boolean;
          delta?: number;
          id?: string;
          occurred_on?: string;
          reason?: string;
          request_id?: string;
          reversal_of?: string | null;
          subscription_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "session_events_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "staff";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "session_events_reversal_of_fkey";
            columns: ["reversal_of"];
            isOneToOne: true;
            referencedRelation: "session_events";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "session_events_subscription_id_fkey";
            columns: ["subscription_id"];
            isOneToOne: false;
            referencedRelation: "subscription_balances";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "session_events_subscription_id_fkey";
            columns: ["subscription_id"];
            isOneToOne: false;
            referencedRelation: "subscriptions";
            referencedColumns: ["id"];
          },
        ];
      };
      staff: {
        Row: {
          active: boolean;
          created_at: string;
          id: string;
          name: string;
          role: string;
        };
        Insert: {
          active?: boolean;
          created_at?: string;
          id: string;
          name: string;
          role: string;
        };
        Update: {
          active?: boolean;
          created_at?: string;
          id?: string;
          name?: string;
          role?: string;
        };
        Relationships: [];
      };
      subscriptions: {
        Row: {
          activity_description: string;
          activity_id: string;
          activity_name: string;
          created_at: string;
          created_by: string;
          currency: string;
          customer_id: string;
          duration_count: number;
          duration_unit: string;
          ends_on: string | null;
          id: string;
          import_batch_id: string | null;
          offer_label: string;
          opening_paid_cents: number;
          opening_sessions_used: number;
          request_fingerprint: string;
          request_id: string;
          starts_on: string;
          total_cents: number;
        };
        Insert: {
          activity_description: string;
          activity_id: string;
          activity_name: string;
          created_at?: string;
          created_by: string;
          currency: string;
          customer_id: string;
          duration_count: number;
          duration_unit: string;
          ends_on?: string | null;
          id?: string;
          import_batch_id?: string | null;
          offer_label?: string;
          opening_paid_cents?: number;
          opening_sessions_used?: number;
          request_fingerprint: string;
          request_id: string;
          starts_on: string;
          total_cents: number;
        };
        Update: {
          activity_description?: string;
          activity_id?: string;
          activity_name?: string;
          created_at?: string;
          created_by?: string;
          currency?: string;
          customer_id?: string;
          duration_count?: number;
          duration_unit?: string;
          ends_on?: string | null;
          id?: string;
          import_batch_id?: string | null;
          offer_label?: string;
          opening_paid_cents?: number;
          opening_sessions_used?: number;
          request_fingerprint?: string;
          request_id?: string;
          starts_on?: string;
          total_cents?: number;
        };
        Relationships: [
          {
            foreignKeyName: "subscriptions_activity_id_fkey";
            columns: ["activity_id"];
            isOneToOne: false;
            referencedRelation: "activities";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "subscriptions_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "staff";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "subscriptions_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "customer_overview";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "subscriptions_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "customers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "subscriptions_import_batch_id_fkey";
            columns: ["import_batch_id"];
            isOneToOne: false;
            referencedRelation: "import_batches";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      customer_overview: {
        Row: {
          activity_names: string | null;
          balance_cents: number | null;
          created_at: string | null;
          created_by: string | null;
          email: string | null;
          has_active: boolean | null;
          id: string | null;
          instagram: string | null;
          instagram_marketing_opt_in: boolean | null;
          last_end: string | null;
          marketing_opt_in: boolean | null;
          name: string | null;
          notes: string | null;
          phone: string | null;
          revision: number | null;
          status: string | null;
          status_changed_at: string | null;
          updated_at: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "customers_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "staff";
            referencedColumns: ["id"];
          },
        ];
      };
      expense_balances: {
        Row: {
          balance_cents: number | null;
          category: string | null;
          created_at: string | null;
          created_by: string | null;
          due_on: string | null;
          id: string | null;
          invoice_number: string | null;
          notes: string | null;
          paid_cents: number | null;
          request_id: string | null;
          revision: number | null;
          supplier: string | null;
          template_id: string | null;
          template_month: string | null;
          title: string | null;
          total_cents: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "expenses_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "staff";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "expenses_template_id_fkey";
            columns: ["template_id"];
            isOneToOne: false;
            referencedRelation: "expense_templates";
            referencedColumns: ["id"];
          },
        ];
      };
      owner_alerts: {
        Row: {
          alert_key: string | null;
          balance_cents: number | null;
          due_on: string | null;
          href: string | null;
          is_read: boolean | null;
          kind: string | null;
          phase: string | null;
          push_today: boolean | null;
          reference_id: string | null;
          title: string | null;
        };
        Relationships: [];
      };
      subscription_balances: {
        Row: {
          activity_description: string | null;
          activity_id: string | null;
          activity_name: string | null;
          balance_cents: number | null;
          created_at: string | null;
          created_by: string | null;
          currency: string | null;
          customer_id: string | null;
          duration_count: number | null;
          duration_unit: string | null;
          ends_on: string | null;
          id: string | null;
          import_batch_id: string | null;
          offer_label: string | null;
          opening_paid_cents: number | null;
          opening_sessions_used: number | null;
          paid_cents: number | null;
          request_fingerprint: string | null;
          request_id: string | null;
          sessions_remaining: number | null;
          starts_on: string | null;
          total_cents: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "subscriptions_activity_id_fkey";
            columns: ["activity_id"];
            isOneToOne: false;
            referencedRelation: "activities";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "subscriptions_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "staff";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "subscriptions_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "customer_overview";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "subscriptions_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "customers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "subscriptions_import_batch_id_fkey";
            columns: ["import_batch_id"];
            isOneToOne: false;
            referencedRelation: "import_batches";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Functions: {
      cancel_communication: { Args: { p_id: string }; Returns: undefined };
      change_customer_status: {
        Args: { p_id: string; p_revision: number; p_status: string };
        Returns: undefined;
      };
      claim_owner_push_jobs: { Args: { p_limit?: number }; Returns: Json };
      close_gym_month: { Args: { p_month: string }; Returns: undefined };
      configure_gym: {
        Args: { p_currency: string; p_time_zone: string };
        Returns: undefined;
      };
      configure_owner_notifications: {
        Args: { p_data: Json; p_revision: number };
        Returns: undefined;
      };
      enroll_customer: {
        Args: {
          p_activity: string;
          p_customer: Json;
          p_customer_id: string;
          p_entries: Json;
          p_expected_price: number;
          p_expected_revision: number;
          p_expected_start: string;
          p_request: string;
        };
        Returns: string;
      };
      finish_owner_push_job: {
        Args: {
          p_code?: number;
          p_id: string;
          p_lease: string;
          p_status: string;
        };
        Returns: undefined;
      };
      generate_monthly_expenses: { Args: { p_month: string }; Returns: number };
      import_gym_history: {
        Args: {
          p_clients: Json;
          p_commit?: boolean;
          p_currency: string;
          p_request: string;
          p_source: string;
        };
        Returns: Json;
      };
      owner_notification_health: {
        Args: Record<PropertyKey, never>;
        Returns: string;
      };
      owner_push_status: { Args: { p_endpoint: string }; Returns: boolean };
      pay_expense: {
        Args: {
          p_entries: Json;
          p_expense: string;
          p_reason?: string;
          p_request: string;
          p_reverse?: string;
        };
        Returns: string;
      };
      prepare_communication_automations: {
        Args: { p_day?: string };
        Returns: number;
      };
      prepare_communication_campaign: {
        Args: { p_customers: string[]; p_data: Json; p_request: string };
        Returns: string;
      };
      record_payment: {
        Args: { p_entries: Json; p_request: string; p_subscription: string };
        Returns: string;
      };
      record_raffle_draw: {
        Args: { p_draw_on: string; p_month: number; p_year: number };
        Returns: undefined;
      };
      record_session: {
        Args: {
          p_acknowledge_debt?: boolean;
          p_reason?: string;
          p_request: string;
          p_reverse?: string;
          p_subscription: string;
        };
        Returns: string;
      };
      register_owner_push: { Args: { p_data: Json }; Returns: undefined };
      register_paper_customer: {
        Args: { p_profile: Json; p_record: Json; p_request: string };
        Returns: string;
      };
      reserve_owner_push_test: {
        Args: { p_endpoint: string };
        Returns: boolean;
      };
      save_activity: {
        Args: { p_data: Json; p_id: string; p_revision: number };
        Returns: string;
      };
      save_communication_owner: {
        Args: { p_data: Json; p_id: string; p_revision: number };
        Returns: string;
      };
      save_communication_rule: {
        Args: {
          p_customers?: string[];
          p_data: Json;
          p_kind: string;
          p_revision: number;
        };
        Returns: undefined;
      };
      save_communication_settings: {
        Args: { p_data: Json; p_revision: number };
        Returns: undefined;
      };
      save_communication_template: {
        Args: { p_data: Json; p_id: string; p_revision: number };
        Returns: string;
      };
      save_expense: {
        Args: {
          p_data: Json;
          p_id: string;
          p_request: string;
          p_revision: number;
        };
        Returns: string;
      };
      save_expense_template: {
        Args: { p_data: Json; p_id: string; p_revision: number };
        Returns: string;
      };
      save_recovery_campaign: {
        Args: {
          p_activity: string;
          p_customers: string[];
          p_message: string;
          p_request: string;
          p_title: string;
        };
        Returns: string;
      };
      unregister_owner_push: {
        Args: { p_endpoint: string };
        Returns: undefined;
      };
      update_customer: {
        Args: { p_data: Json; p_id: string; p_revision: number };
        Returns: undefined;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;
