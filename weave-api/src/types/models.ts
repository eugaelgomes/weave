export interface User {
  id: string; // BigInt convertido para string no app
  user_id?: string;
  name: string;
  user_name?: string;
  email: string;
  username?: string;
  password?: string;
  avatar_url?: string;
  system_role: "super_admin" | "admin" | "user";
  created_at: Date;
  updated_at: Date;
  birth_date?: Date;
  private_profile?: boolean;
  phone_number?: string;
  auth_with_google?: boolean;
  auth_with_github?: boolean;
  auth_with_microsoft?: boolean;
  github_id?: string;
  microsoft_id?: string;
  theme_mode?: string;
  email_verified?: boolean;
  email_verified_at?: Date;
  plan_id?: string;
  user_preference?: object;
  plan_name?: string;
  plan_details?: object;
  organization?: object;
  organizations?: object[];
  system_roles?: object;
}

export interface Note {
  id: string; // BigInt
  title: string;
  content: string | object;
  user_id: string;
  project_id?: string;
  organization_id?: string;
  status: "active" | "archived" | "trash";
  tags: string[]; // Vem do postgres text[]
  created_at: Date;
  updated_at: Date;
}

// Representação do payload gerado pelo seu JWT / middleware de Auth
export interface TokenUser {
  userId: string;
  email: string;
  role: string;
}
