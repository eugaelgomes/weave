// src/app/services/planService.ts
import { request } from "@/app/services/api"; // Ajuste o caminho conforme seu projeto

export interface Plan {
  planId: string; // <-- Usando planId conforme descobrimos na última iteração!
  name: string;
  plan_value: number;
  currency: string;
  billing_cycle: string;
  is_active: boolean;
  user_count: string;
  org_count: string;
  details: {
    limits: {
      max_notes: number;
      max_projects: number;
      max_team_members: number;
      storage: {
        max_file_size_mb: number;
        total_monthly_upload_mb: number;
      };
      exports: {
        notes_monthly: number;
        backups_monthly: number;
      };
    };
    features: {
      dark_mode: boolean;
      collaboration_tools: boolean;
      custom_branding: boolean;
      priority_support: boolean;
    };
    weave_ai: {
      enabled: boolean;
      config: {
        default_model: string;
        monthly_messages: number;
        available_models: string[];
      };
      features: string[];
    };
  };
  personalized_for_client?: boolean;
}

export async function listPlans(): Promise<{ plans: Plan[] }> {
  return request("/plans");
}

export async function getPlan(id: string): Promise<{ plan: Plan }> {
  return request(`/plans/${id}`);
}

export async function updatePlan(id: string, data: Partial<Plan>): Promise<{ message: string; plan: Plan }> {
  return request(`/plans/${id}`, { method: "PUT", body: data });
}