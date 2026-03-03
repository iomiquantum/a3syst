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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      ads_accounts: {
        Row: {
          clinic_id: string
          config: Json
          connected_at: string | null
          created_at: string
          credentials: Json
          id: string
          platform: string
          status: string
          updated_at: string
        }
        Insert: {
          clinic_id: string
          config?: Json
          connected_at?: string | null
          created_at?: string
          credentials?: Json
          id?: string
          platform: string
          status?: string
          updated_at?: string
        }
        Update: {
          clinic_id?: string
          config?: Json
          connected_at?: string | null
          created_at?: string
          credentials?: Json
          id?: string
          platform?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ads_accounts_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      ads_business_briefs: {
        Row: {
          answers: Json
          audio_url: string | null
          business_name: string | null
          clinic_id: string
          created_at: string
          description: string | null
          id: string
          industry: string | null
          is_active: boolean
          locations: Json
          name: string
          updated_at: string
        }
        Insert: {
          answers?: Json
          audio_url?: string | null
          business_name?: string | null
          clinic_id: string
          created_at?: string
          description?: string | null
          id?: string
          industry?: string | null
          is_active?: boolean
          locations?: Json
          name?: string
          updated_at?: string
        }
        Update: {
          answers?: Json
          audio_url?: string | null
          business_name?: string | null
          clinic_id?: string
          created_at?: string
          description?: string | null
          id?: string
          industry?: string | null
          is_active?: boolean
          locations?: Json
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ads_business_briefs_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      ads_campaigns: {
        Row: {
          account_id: string | null
          clinic_id: string
          created_at: string
          creatives_count: number
          currency: string
          daily_budget: number
          external_campaign_id: string | null
          id: string
          metrics: Json
          name: string
          platform: string
          status: string
          template_id: string | null
          updated_at: string
        }
        Insert: {
          account_id?: string | null
          clinic_id: string
          created_at?: string
          creatives_count?: number
          currency?: string
          daily_budget?: number
          external_campaign_id?: string | null
          id?: string
          metrics?: Json
          name: string
          platform?: string
          status?: string
          template_id?: string | null
          updated_at?: string
        }
        Update: {
          account_id?: string | null
          clinic_id?: string
          created_at?: string
          creatives_count?: number
          currency?: string
          daily_budget?: number
          external_campaign_id?: string | null
          id?: string
          metrics?: Json
          name?: string
          platform?: string
          status?: string
          template_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ads_campaigns_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "ads_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ads_campaigns_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ads_campaigns_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "ads_strategy_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      ads_strategy_templates: {
        Row: {
          channel: string
          clinic_id: string | null
          created_at: string
          currency: string
          description: string | null
          id: string
          is_global: boolean
          media_count: number
          media_type: string
          min_budget: number
          name: string
          objective: string
        }
        Insert: {
          channel: string
          clinic_id?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          is_global?: boolean
          media_count?: number
          media_type: string
          min_budget?: number
          name: string
          objective?: string
        }
        Update: {
          channel?: string
          clinic_id?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          is_global?: boolean
          media_count?: number
          media_type?: string
          min_budget?: number
          name?: string
          objective?: string
        }
        Relationships: [
          {
            foreignKeyName: "ads_strategy_templates_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_agent_config: {
        Row: {
          agent_name: string
          clinic_id: string
          created_at: string
          enabled: boolean
          greeting: string
          id: string
          language: string
          objective: string
          services: Json
          special_instructions: string
          tone: string
          updated_at: string
        }
        Insert: {
          agent_name?: string
          clinic_id: string
          created_at?: string
          enabled?: boolean
          greeting?: string
          id?: string
          language?: string
          objective?: string
          services?: Json
          special_instructions?: string
          tone?: string
          updated_at?: string
        }
        Update: {
          agent_name?: string
          clinic_id?: string
          created_at?: string
          enabled?: boolean
          greeting?: string
          id?: string
          language?: string
          objective?: string
          services?: Json
          special_instructions?: string
          tone?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_agent_config_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: true
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_agent_usage: {
        Row: {
          clinic_id: string
          conversation_id: string
          created_at: string
          id: string
          model: string
          tokens_input: number
          tokens_output: number
          triggered_by: string
        }
        Insert: {
          clinic_id: string
          conversation_id: string
          created_at?: string
          id?: string
          model?: string
          tokens_input?: number
          tokens_output?: number
          triggered_by?: string
        }
        Update: {
          clinic_id?: string
          conversation_id?: string
          created_at?: string
          id?: string
          model?: string
          tokens_input?: number
          tokens_output?: number
          triggered_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_agent_usage_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_agent_usage_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_token_usage: {
        Row: {
          action_label: string
          clinic_id: string
          cost_usd: number
          created_at: string
          generator_type: string
          id: string
          model: string
          tokens_input: number
          tokens_output: number
          user_id: string | null
        }
        Insert: {
          action_label?: string
          clinic_id: string
          cost_usd?: number
          created_at?: string
          generator_type?: string
          id?: string
          model?: string
          tokens_input?: number
          tokens_output?: number
          user_id?: string | null
        }
        Update: {
          action_label?: string
          clinic_id?: string
          cost_usd?: number
          created_at?: string
          generator_type?: string
          id?: string
          model?: string
          tokens_input?: number
          tokens_output?: number
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_token_usage_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_training_data: {
        Row: {
          answer: string
          clinic_id: string
          created_at: string
          id: string
          question: string
        }
        Insert: {
          answer: string
          clinic_id: string
          created_at?: string
          id?: string
          question: string
        }
        Update: {
          answer?: string
          clinic_id?: string
          created_at?: string
          id?: string
          question?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_training_data_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      appointments: {
        Row: {
          branch_id: string | null
          clinic_id: string
          created_at: string
          date: string
          duration: number
          id: string
          notes: string | null
          patient_id: string
          payment_id: string | null
          professional_id: string | null
          status: Database["public"]["Enums"]["appointment_status"]
          time: string
          treatment_id: string | null
          updated_at: string
        }
        Insert: {
          branch_id?: string | null
          clinic_id: string
          created_at?: string
          date: string
          duration?: number
          id?: string
          notes?: string | null
          patient_id: string
          payment_id?: string | null
          professional_id?: string | null
          status?: Database["public"]["Enums"]["appointment_status"]
          time: string
          treatment_id?: string | null
          updated_at?: string
        }
        Update: {
          branch_id?: string | null
          clinic_id?: string
          created_at?: string
          date?: string
          duration?: number
          id?: string
          notes?: string | null
          patient_id?: string
          payment_id?: string | null
          professional_id?: string | null
          status?: Database["public"]["Enums"]["appointment_status"]
          time?: string
          treatment_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointments_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_treatment_id_fkey"
            columns: ["treatment_id"]
            isOneToOne: false
            referencedRelation: "treatments"
            referencedColumns: ["id"]
          },
        ]
      }
      branches: {
        Row: {
          active: boolean
          address: string | null
          clinic_id: string
          created_at: string
          description: string | null
          id: string
          name: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          address?: string | null
          clinic_id: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          address?: string | null
          clinic_id?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "branches_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      business_labels: {
        Row: {
          ai_generated: boolean
          clinic_id: string
          created_at: string
          id: string
          initial_services: Json
          labels: Json
          updated_at: string
        }
        Insert: {
          ai_generated?: boolean
          clinic_id: string
          created_at?: string
          id?: string
          initial_services?: Json
          labels?: Json
          updated_at?: string
        }
        Update: {
          ai_generated?: boolean
          clinic_id?: string
          created_at?: string
          id?: string
          initial_services?: Json
          labels?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_labels_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: true
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      call_logs: {
        Row: {
          call_type: string
          clinic_id: string
          contact_id: string
          created_at: string
          duration_seconds: number | null
          id: string
          logged_by: string | null
          notes: string | null
          outcome: string
        }
        Insert: {
          call_type?: string
          clinic_id: string
          contact_id: string
          created_at?: string
          duration_seconds?: number | null
          id?: string
          logged_by?: string | null
          notes?: string | null
          outcome?: string
        }
        Update: {
          call_type?: string
          clinic_id?: string
          contact_id?: string
          created_at?: string
          duration_seconds?: number | null
          id?: string
          logged_by?: string | null
          notes?: string | null
          outcome?: string
        }
        Relationships: [
          {
            foreignKeyName: "call_logs_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "call_logs_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      channel_credentials: {
        Row: {
          channel: string
          clinic_id: string
          created_at: string
          credentials: Json
          id: string
          is_active: boolean
          setup_completed: boolean
          updated_at: string
          webhook_url: string | null
        }
        Insert: {
          channel: string
          clinic_id: string
          created_at?: string
          credentials?: Json
          id?: string
          is_active?: boolean
          setup_completed?: boolean
          updated_at?: string
          webhook_url?: string | null
        }
        Update: {
          channel?: string
          clinic_id?: string
          created_at?: string
          credentials?: Json
          id?: string
          is_active?: boolean
          setup_completed?: boolean
          updated_at?: string
          webhook_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "channel_credentials_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      click_events: {
        Row: {
          created_at: string
          element_tag: string | null
          id: string
          page_path: string
          session_id: string
          viewport_height: number | null
          viewport_width: number | null
          x_percent: number
          y_percent: number
          zone_name: string | null
        }
        Insert: {
          created_at?: string
          element_tag?: string | null
          id?: string
          page_path?: string
          session_id: string
          viewport_height?: number | null
          viewport_width?: number | null
          x_percent: number
          y_percent: number
          zone_name?: string | null
        }
        Update: {
          created_at?: string
          element_tag?: string | null
          id?: string
          page_path?: string
          session_id?: string
          viewport_height?: number | null
          viewport_width?: number | null
          x_percent?: number
          y_percent?: number
          zone_name?: string | null
        }
        Relationships: []
      }
      clinic_brand_styles: {
        Row: {
          clinic_id: string
          created_at: string
          id: string
          name: string
          palette: Json
          reference_images: string[]
          style_description: string
          updated_at: string
        }
        Insert: {
          clinic_id: string
          created_at?: string
          id?: string
          name?: string
          palette?: Json
          reference_images?: string[]
          style_description?: string
          updated_at?: string
        }
        Update: {
          clinic_id?: string
          created_at?: string
          id?: string
          name?: string
          palette?: Json
          reference_images?: string[]
          style_description?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clinic_brand_styles_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      clinics: {
        Row: {
          additional_info: string | null
          address: string | null
          business_category: string
          business_type: string
          city: string | null
          closing_hour: string | null
          created_at: string
          description: string | null
          id: string
          logo_url: string | null
          monthly_token_budget_usd: number | null
          name: string
          onboarding_completed: boolean | null
          onboarding_method: string | null
          opening_hour: string | null
          owner_id: string
          primary_color: string | null
          secondary_color: string | null
          slug: string | null
          updated_at: string
          whatsapp: string | null
          working_days: string[] | null
        }
        Insert: {
          additional_info?: string | null
          address?: string | null
          business_category?: string
          business_type?: string
          city?: string | null
          closing_hour?: string | null
          created_at?: string
          description?: string | null
          id?: string
          logo_url?: string | null
          monthly_token_budget_usd?: number | null
          name: string
          onboarding_completed?: boolean | null
          onboarding_method?: string | null
          opening_hour?: string | null
          owner_id: string
          primary_color?: string | null
          secondary_color?: string | null
          slug?: string | null
          updated_at?: string
          whatsapp?: string | null
          working_days?: string[] | null
        }
        Update: {
          additional_info?: string | null
          address?: string | null
          business_category?: string
          business_type?: string
          city?: string | null
          closing_hour?: string | null
          created_at?: string
          description?: string | null
          id?: string
          logo_url?: string | null
          monthly_token_budget_usd?: number | null
          name?: string
          onboarding_completed?: boolean | null
          onboarding_method?: string | null
          opening_hour?: string | null
          owner_id?: string
          primary_color?: string | null
          secondary_color?: string | null
          slug?: string | null
          updated_at?: string
          whatsapp?: string | null
          working_days?: string[] | null
        }
        Relationships: []
      }
      contacts: {
        Row: {
          branch_id: string | null
          clinic_id: string
          created_at: string
          email: string | null
          funnel_stage: string
          id: string
          location: string | null
          name: string
          notes: string | null
          patient_id: string | null
          phone: string
          phone2: string | null
          source: string | null
          tags: string[] | null
          updated_at: string
        }
        Insert: {
          branch_id?: string | null
          clinic_id: string
          created_at?: string
          email?: string | null
          funnel_stage?: string
          id?: string
          location?: string | null
          name: string
          notes?: string | null
          patient_id?: string | null
          phone: string
          phone2?: string | null
          source?: string | null
          tags?: string[] | null
          updated_at?: string
        }
        Update: {
          branch_id?: string | null
          clinic_id?: string
          created_at?: string
          email?: string | null
          funnel_stage?: string
          id?: string
          location?: string | null
          name?: string
          notes?: string | null
          patient_id?: string | null
          phone?: string
          phone2?: string | null
          source?: string | null
          tags?: string[] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contacts_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contacts_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contacts_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      content_posts: {
        Row: {
          ai_generated: boolean | null
          ai_prompt: string | null
          body: string | null
          clinic_id: string
          created_at: string
          created_by: string | null
          external_ids: Json | null
          first_comment: string | null
          hashtags: string[] | null
          id: string
          link_url: string | null
          media_type: string
          media_urls: string[] | null
          metrics: Json | null
          platforms: string[] | null
          post_type: string
          published_at: string | null
          scheduled_at: string | null
          status: string
          title: string | null
          updated_at: string
        }
        Insert: {
          ai_generated?: boolean | null
          ai_prompt?: string | null
          body?: string | null
          clinic_id: string
          created_at?: string
          created_by?: string | null
          external_ids?: Json | null
          first_comment?: string | null
          hashtags?: string[] | null
          id?: string
          link_url?: string | null
          media_type?: string
          media_urls?: string[] | null
          metrics?: Json | null
          platforms?: string[] | null
          post_type?: string
          published_at?: string | null
          scheduled_at?: string | null
          status?: string
          title?: string | null
          updated_at?: string
        }
        Update: {
          ai_generated?: boolean | null
          ai_prompt?: string | null
          body?: string | null
          clinic_id?: string
          created_at?: string
          created_by?: string | null
          external_ids?: Json | null
          first_comment?: string | null
          hashtags?: string[] | null
          id?: string
          link_url?: string | null
          media_type?: string
          media_urls?: string[] | null
          metrics?: Json | null
          platforms?: string[] | null
          post_type?: string
          published_at?: string | null
          scheduled_at?: string | null
          status?: string
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_posts_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          archived: boolean
          assigned_to: string | null
          channel: string
          chatbot_active: boolean
          clinic_id: string
          contact_id: string
          created_at: string
          id: string
          last_message_at: string | null
          last_message_preview: string | null
          status: string
          unread_count: number
          updated_at: string
          visitor_contact: string | null
          visitor_name: string | null
        }
        Insert: {
          archived?: boolean
          assigned_to?: string | null
          channel?: string
          chatbot_active?: boolean
          clinic_id: string
          contact_id: string
          created_at?: string
          id?: string
          last_message_at?: string | null
          last_message_preview?: string | null
          status?: string
          unread_count?: number
          updated_at?: string
          visitor_contact?: string | null
          visitor_name?: string | null
        }
        Update: {
          archived?: boolean
          assigned_to?: string | null
          channel?: string
          chatbot_active?: boolean
          clinic_id?: string
          contact_id?: string
          created_at?: string
          id?: string
          last_message_at?: string | null
          last_message_preview?: string | null
          status?: string
          unread_count?: number
          updated_at?: string
          visitor_contact?: string | null
          visitor_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversations_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "conversations_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      launch_registrations: {
        Row: {
          business_name: string
          created_at: string
          email: string
          full_name: string
          generations_used: number
          id: string
          industry: string
          is_fictional: boolean
          max_generations: number
          phone: string
          previous_position: number | null
          referral_code: string
          referral_count: number
          referred_by: string | null
          updated_at: string
        }
        Insert: {
          business_name: string
          created_at?: string
          email: string
          full_name: string
          generations_used?: number
          id?: string
          industry?: string
          is_fictional?: boolean
          max_generations?: number
          phone: string
          previous_position?: number | null
          referral_code?: string
          referral_count?: number
          referred_by?: string | null
          updated_at?: string
        }
        Update: {
          business_name?: string
          created_at?: string
          email?: string
          full_name?: string
          generations_used?: number
          id?: string
          industry?: string
          is_fictional?: boolean
          max_generations?: number
          phone?: string
          previous_position?: number | null
          referral_code?: string
          referral_count?: number
          referred_by?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      live_sessions: {
        Row: {
          browser: string | null
          country: string | null
          created_at: string
          current_page: string
          device_id: string | null
          device_model: string | null
          device_number: number
          device_type: string
          did_register: boolean
          duration_seconds: number | null
          ended_at: string | null
          id: string
          is_active: boolean
          last_heartbeat: string
          os: string | null
          referrer: string | null
          region: string | null
          session_id: string
          started_at: string
          timezone: string | null
          utm_campaign: string | null
          utm_source: string | null
        }
        Insert: {
          browser?: string | null
          country?: string | null
          created_at?: string
          current_page?: string
          device_id?: string | null
          device_model?: string | null
          device_number: number
          device_type?: string
          did_register?: boolean
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          is_active?: boolean
          last_heartbeat?: string
          os?: string | null
          referrer?: string | null
          region?: string | null
          session_id: string
          started_at?: string
          timezone?: string | null
          utm_campaign?: string | null
          utm_source?: string | null
        }
        Update: {
          browser?: string | null
          country?: string | null
          created_at?: string
          current_page?: string
          device_id?: string | null
          device_model?: string | null
          device_number?: number
          device_type?: string
          did_register?: boolean
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          is_active?: boolean
          last_heartbeat?: string
          os?: string | null
          referrer?: string | null
          region?: string | null
          session_id?: string
          started_at?: string
          timezone?: string | null
          utm_campaign?: string | null
          utm_source?: string | null
        }
        Relationships: []
      }
      meeting_bots: {
        Row: {
          bot_id: string | null
          clinic_id: string
          created_at: string
          error_message: string | null
          id: string
          join_url: string | null
          meeting_id: string
          recording_url: string | null
          status: string
          updated_at: string
        }
        Insert: {
          bot_id?: string | null
          clinic_id: string
          created_at?: string
          error_message?: string | null
          id?: string
          join_url?: string | null
          meeting_id: string
          recording_url?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          bot_id?: string | null
          clinic_id?: string
          created_at?: string
          error_message?: string | null
          id?: string
          join_url?: string | null
          meeting_id?: string
          recording_url?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "meeting_bots_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_bots_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_summaries: {
        Row: {
          action_items: Json
          clinic_id: string
          created_at: string
          decisions: Json
          executive_summary: string | null
          id: string
          key_topics: Json
          meeting_id: string
          sentiment: string | null
          updated_at: string
        }
        Insert: {
          action_items?: Json
          clinic_id: string
          created_at?: string
          decisions?: Json
          executive_summary?: string | null
          id?: string
          key_topics?: Json
          meeting_id: string
          sentiment?: string | null
          updated_at?: string
        }
        Update: {
          action_items?: Json
          clinic_id?: string
          created_at?: string
          decisions?: Json
          executive_summary?: string | null
          id?: string
          key_topics?: Json
          meeting_id?: string
          sentiment?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "meeting_summaries_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_summaries_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: true
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_transcripts: {
        Row: {
          clinic_id: string
          created_at: string
          id: string
          language: string | null
          meeting_id: string
          raw_transcript: Json
          speakers: Json
        }
        Insert: {
          clinic_id: string
          created_at?: string
          id?: string
          language?: string | null
          meeting_id: string
          raw_transcript?: Json
          speakers?: Json
        }
        Update: {
          clinic_id?: string
          created_at?: string
          id?: string
          language?: string | null
          meeting_id?: string
          raw_transcript?: Json
          speakers?: Json
        }
        Relationships: [
          {
            foreignKeyName: "meeting_transcripts_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_transcripts_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: true
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
        ]
      }
      meetings: {
        Row: {
          clinic_id: string
          created_at: string
          created_by: string
          duration_seconds: number | null
          ended_at: string | null
          id: string
          meeting_url: string | null
          platform: string
          started_at: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          clinic_id: string
          created_at?: string
          created_by: string
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          meeting_url?: string | null
          platform?: string
          started_at?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Update: {
          clinic_id?: string
          created_at?: string
          created_by?: string
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          meeting_url?: string | null
          platform?: string
          started_at?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "meetings_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          clinic_id: string
          content: string
          conversation_id: string
          created_at: string
          direction: string
          id: string
          media_url: string | null
          message_type: string
          sent_by: string | null
          status: string
          whatsapp_message_id: string | null
        }
        Insert: {
          clinic_id: string
          content?: string
          conversation_id: string
          created_at?: string
          direction?: string
          id?: string
          media_url?: string | null
          message_type?: string
          sent_by?: string | null
          status?: string
          whatsapp_message_id?: string | null
        }
        Update: {
          clinic_id?: string
          content?: string
          conversation_id?: string
          created_at?: string
          direction?: string
          id?: string
          media_url?: string | null
          message_type?: string
          sent_by?: string | null
          status?: string
          whatsapp_message_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      page_visits: {
        Row: {
          created_at: string
          duration_seconds: number | null
          id: string
          page_path: string
          referrer: string | null
          screen_height: number | null
          screen_width: number | null
          session_id: string
          user_agent: string | null
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
        }
        Insert: {
          created_at?: string
          duration_seconds?: number | null
          id?: string
          page_path?: string
          referrer?: string | null
          screen_height?: number | null
          screen_width?: number | null
          session_id: string
          user_agent?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Update: {
          created_at?: string
          duration_seconds?: number | null
          id?: string
          page_path?: string
          referrer?: string | null
          screen_height?: number | null
          screen_width?: number | null
          session_id?: string
          user_agent?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Relationships: []
      }
      patients: {
        Row: {
          clinic_id: string
          created_at: string
          date_of_birth: string | null
          document: string | null
          email: string
          first_name: string
          id: string
          last_name: string
          notes: string | null
          phone: string | null
          status: string
          updated_at: string
        }
        Insert: {
          clinic_id: string
          created_at?: string
          date_of_birth?: string | null
          document?: string | null
          email?: string
          first_name: string
          id?: string
          last_name: string
          notes?: string | null
          phone?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          clinic_id?: string
          created_at?: string
          date_of_birth?: string | null
          document?: string | null
          email?: string
          first_name?: string
          id?: string
          last_name?: string
          notes?: string | null
          phone?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "patients_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_methods: {
        Row: {
          clinic_id: string
          created_at: string
          id: string
          name: string
        }
        Insert: {
          clinic_id: string
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          clinic_id?: string
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_methods_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      planning_columns: {
        Row: {
          clinic_id: string
          color: string
          created_at: string
          id: string
          name: string
          position: number
          project_id: string
        }
        Insert: {
          clinic_id: string
          color?: string
          created_at?: string
          id?: string
          name: string
          position?: number
          project_id: string
        }
        Update: {
          clinic_id?: string
          color?: string
          created_at?: string
          id?: string
          name?: string
          position?: number
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "planning_columns_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "planning_columns_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "planning_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      planning_projects: {
        Row: {
          clinic_id: string
          color: string
          created_at: string
          created_by: string
          description: string | null
          id: string
          name: string
          status: string
          updated_at: string
        }
        Insert: {
          clinic_id: string
          color?: string
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          name: string
          status?: string
          updated_at?: string
        }
        Update: {
          clinic_id?: string
          color?: string
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          name?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "planning_projects_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      planning_screenshots: {
        Row: {
          capture_type: string
          captured_at: string
          clinic_id: string
          id: string
          image_url: string
          time_entry_id: string
          user_id: string
        }
        Insert: {
          capture_type?: string
          captured_at?: string
          clinic_id: string
          id?: string
          image_url: string
          time_entry_id: string
          user_id: string
        }
        Update: {
          capture_type?: string
          captured_at?: string
          clinic_id?: string
          id?: string
          image_url?: string
          time_entry_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "planning_screenshots_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "planning_screenshots_time_entry_id_fkey"
            columns: ["time_entry_id"]
            isOneToOne: false
            referencedRelation: "planning_time_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      planning_tasks: {
        Row: {
          assigned_to: string | null
          clinic_id: string
          column_id: string
          created_at: string
          created_by: string
          description: string | null
          due_date: string | null
          id: string
          position: number
          priority: string
          project_id: string
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          clinic_id: string
          column_id: string
          created_at?: string
          created_by: string
          description?: string | null
          due_date?: string | null
          id?: string
          position?: number
          priority?: string
          project_id: string
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          clinic_id?: string
          column_id?: string
          created_at?: string
          created_by?: string
          description?: string | null
          due_date?: string | null
          id?: string
          position?: number
          priority?: string
          project_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "planning_tasks_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "planning_tasks_column_id_fkey"
            columns: ["column_id"]
            isOneToOne: false
            referencedRelation: "planning_columns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "planning_tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "planning_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      planning_time_entries: {
        Row: {
          clinic_id: string
          created_at: string
          duration_seconds: number | null
          ended_at: string | null
          id: string
          notes: string | null
          started_at: string
          task_id: string
          user_id: string
        }
        Insert: {
          clinic_id: string
          created_at?: string
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          notes?: string | null
          started_at?: string
          task_id: string
          user_id: string
        }
        Update: {
          clinic_id?: string
          created_at?: string
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          notes?: string | null
          started_at?: string
          task_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "planning_time_entries_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "planning_time_entries_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "planning_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      professionals: {
        Row: {
          active: boolean
          branch_id: string | null
          clinic_id: string
          created_at: string
          email: string
          full_name: string
          id: string
          phone: string | null
          specialty_id: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          active?: boolean
          branch_id?: string | null
          clinic_id: string
          created_at?: string
          email?: string
          full_name: string
          id?: string
          phone?: string | null
          specialty_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          active?: boolean
          branch_id?: string | null
          clinic_id?: string
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          phone?: string | null
          specialty_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "professionals_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professionals_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professionals_specialty_id_fkey"
            columns: ["specialty_id"]
            isOneToOne: false
            referencedRelation: "specialties"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      prompt_templates: {
        Row: {
          clinic_id: string
          created_at: string
          id: string
          is_active: boolean
          name: string
          template: string
          type: string
          updated_at: string
        }
        Insert: {
          clinic_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          template?: string
          type: string
          updated_at?: string
        }
        Update: {
          clinic_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          template?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "prompt_templates_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      psycho_matrix_services: {
        Row: {
          clinic_id: string
          core_benefit: string
          created_at: string
          id: string
          name: string
          observations: string | null
          pain_point: string
          price: number | null
          target_price: string
          updated_at: string
        }
        Insert: {
          clinic_id: string
          core_benefit?: string
          created_at?: string
          id?: string
          name: string
          observations?: string | null
          pain_point?: string
          price?: number | null
          target_price?: string
          updated_at?: string
        }
        Update: {
          clinic_id?: string
          core_benefit?: string
          created_at?: string
          id?: string
          name?: string
          observations?: string | null
          pain_point?: string
          price?: number | null
          target_price?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "psycho_matrix_services_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      psycho_matrix_strategies: {
        Row: {
          advanced_tech: string | null
          archetype: string
          brand_voice: string
          clinic_id: string
          created_at: string
          generated_prompt: string | null
          generation: string
          id: string
          name: string
          persuasion_trigger: string
          service_id: string
          updated_at: string
        }
        Insert: {
          advanced_tech?: string | null
          archetype: string
          brand_voice: string
          clinic_id: string
          created_at?: string
          generated_prompt?: string | null
          generation: string
          id?: string
          name?: string
          persuasion_trigger: string
          service_id: string
          updated_at?: string
        }
        Update: {
          advanced_tech?: string | null
          archetype?: string
          brand_voice?: string
          clinic_id?: string
          created_at?: string
          generated_prompt?: string | null
          generation?: string
          id?: string
          name?: string
          persuasion_trigger?: string
          service_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "psycho_matrix_strategies_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "psycho_matrix_strategies_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "psycho_matrix_services"
            referencedColumns: ["id"]
          },
        ]
      }
      sales: {
        Row: {
          amount: number
          branch_id: string | null
          clinic_id: string
          created_at: string
          discount: number
          id: string
          notes: string | null
          origin: string | null
          patient_id: string | null
          payment_method_id: string | null
          status: Database["public"]["Enums"]["sale_status"]
          treatment_id: string | null
          updated_at: string
        }
        Insert: {
          amount?: number
          branch_id?: string | null
          clinic_id: string
          created_at?: string
          discount?: number
          id?: string
          notes?: string | null
          origin?: string | null
          patient_id?: string | null
          payment_method_id?: string | null
          status?: Database["public"]["Enums"]["sale_status"]
          treatment_id?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          branch_id?: string | null
          clinic_id?: string
          created_at?: string
          discount?: number
          id?: string
          notes?: string | null
          origin?: string | null
          patient_id?: string | null
          payment_method_id?: string | null
          status?: Database["public"]["Enums"]["sale_status"]
          treatment_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_payment_method_id_fkey"
            columns: ["payment_method_id"]
            isOneToOne: false
            referencedRelation: "payment_methods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_treatment_id_fkey"
            columns: ["treatment_id"]
            isOneToOne: false
            referencedRelation: "treatments"
            referencedColumns: ["id"]
          },
        ]
      }
      social_media_connections: {
        Row: {
          access_token: string
          clinic_id: string
          connected_at: string | null
          connected_by: string | null
          id: string
          is_primary: boolean | null
          metadata: Json | null
          platform: string
          platform_account_id: string
          platform_name: string
          token_expires_at: string | null
          token_last_verified_at: string | null
          token_status: string | null
          updated_at: string | null
        }
        Insert: {
          access_token?: string
          clinic_id: string
          connected_at?: string | null
          connected_by?: string | null
          id?: string
          is_primary?: boolean | null
          metadata?: Json | null
          platform: string
          platform_account_id?: string
          platform_name?: string
          token_expires_at?: string | null
          token_last_verified_at?: string | null
          token_status?: string | null
          updated_at?: string | null
        }
        Update: {
          access_token?: string
          clinic_id?: string
          connected_at?: string | null
          connected_by?: string | null
          id?: string
          is_primary?: boolean | null
          metadata?: Json | null
          platform?: string
          platform_account_id?: string
          platform_name?: string
          token_expires_at?: string | null
          token_last_verified_at?: string | null
          token_status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "social_media_connections_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      social_media_posts_log: {
        Row: {
          clinic_id: string
          connection_id: string
          content_post_id: string | null
          content_text: string | null
          created_at: string | null
          created_by: string | null
          engagement_data: Json | null
          error_message: string | null
          id: string
          media_urls: string[] | null
          platform: string
          platform_post_id: string | null
          post_type: string | null
          published_at: string | null
          scheduled_for: string | null
          status: string | null
        }
        Insert: {
          clinic_id: string
          connection_id: string
          content_post_id?: string | null
          content_text?: string | null
          created_at?: string | null
          created_by?: string | null
          engagement_data?: Json | null
          error_message?: string | null
          id?: string
          media_urls?: string[] | null
          platform: string
          platform_post_id?: string | null
          post_type?: string | null
          published_at?: string | null
          scheduled_for?: string | null
          status?: string | null
        }
        Update: {
          clinic_id?: string
          connection_id?: string
          content_post_id?: string | null
          content_text?: string | null
          created_at?: string | null
          created_by?: string | null
          engagement_data?: Json | null
          error_message?: string | null
          id?: string
          media_urls?: string[] | null
          platform?: string
          platform_post_id?: string | null
          post_type?: string | null
          published_at?: string | null
          scheduled_for?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "social_media_posts_log_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_media_posts_log_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "social_media_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_media_posts_log_content_post_id_fkey"
            columns: ["content_post_id"]
            isOneToOne: false
            referencedRelation: "content_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      specialties: {
        Row: {
          clinic_id: string
          created_at: string
          id: string
          name: string
        }
        Insert: {
          clinic_id: string
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          clinic_id?: string
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "specialties_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      treatments: {
        Row: {
          clinic_id: string
          created_at: string
          description: string | null
          duration: number
          id: string
          image_url: string | null
          name: string
          price: number
          updated_at: string
        }
        Insert: {
          clinic_id: string
          created_at?: string
          description?: string | null
          duration?: number
          id?: string
          image_url?: string | null
          name: string
          price?: number
          updated_at?: string
        }
        Update: {
          clinic_id?: string
          created_at?: string
          description?: string | null
          duration?: number
          id?: string
          image_url?: string | null
          name?: string
          price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "treatments_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          clinic_id: string
          created_at: string
          id: string
          permissions: Json
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          clinic_id: string
          created_at?: string
          id?: string
          permissions?: Json
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          clinic_id?: string
          created_at?: string
          id?: string
          permissions?: Json
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      user_token_limits: {
        Row: {
          clinic_id: string
          created_at: string
          id: string
          monthly_budget_usd: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          clinic_id: string
          created_at?: string
          id?: string
          monthly_budget_usd?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          clinic_id?: string
          created_at?: string
          id?: string
          monthly_budget_usd?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_token_limits_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_clinic_slug: { Args: { clinic_name: string }; Returns: string }
      get_launch_leaderboard: {
        Args: never
        Returns: {
          business_name: string
          full_name: string
          id: string
          previous_position: number
          referral_code: string
          referral_count: number
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_super_admin: { Args: never; Returns: boolean }
      user_has_clinic_access: {
        Args: { _clinic_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "secretary" | "professional"
      appointment_status:
        | "pendiente"
        | "confirmado"
        | "completado"
        | "cancelado"
      sale_status: "abonado" | "parcial" | "pendiente"
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
      app_role: ["admin", "secretary", "professional"],
      appointment_status: [
        "pendiente",
        "confirmado",
        "completado",
        "cancelado",
      ],
      sale_status: ["abonado", "parcial", "pendiente"],
    },
  },
} as const
