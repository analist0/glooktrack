/**
 * Supabase Database Types - טיפוסי מסד נתונים
 */

export type MeasurementContext =
  | "fasting"
  | "before-meal"
  | "after-meal"
  | "before-sleep"
  | "other";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string | null;
          full_name: string | null;
          avatar_url: string | null;
          diabetes_type: string | null;
          date_of_birth: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email?: string | null;
          full_name?: string | null;
          avatar_url?: string | null;
          diabetes_type?: string | null;
          date_of_birth?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string | null;
          full_name?: string | null;
          avatar_url?: string | null;
          diabetes_type?: string | null;
          date_of_birth?: string | null;
          updated_at?: string;
        };
      };
      measurements: {
        Row: {
          id: string;
          user_id: string;
          date: string;
          time: string;
          value: number;
          context: MeasurementContext;
          notes: string | null;
          device_id: string | null;
          synced_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          date: string;
          time: string;
          value: number;
          context: MeasurementContext;
          notes?: string | null;
          device_id?: string | null;
          synced_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          date?: string;
          time?: string;
          value?: number;
          context?: MeasurementContext;
          notes?: string | null;
          device_id?: string | null;
          synced_at?: string;
          updated_at?: string;
        };
      };
      settings: {
        Row: {
          id: string;
          user_id: string;
          settings_json: Record<string, unknown>;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          settings_json?: Record<string, unknown>;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          settings_json?: Record<string, unknown>;
          updated_at?: string;
        };
      };
    };
    Functions: Record<string, never>;
    Enums: {
      measurement_context: MeasurementContext;
    };
  };
}
