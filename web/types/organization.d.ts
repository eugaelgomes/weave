export type OrganizationMemberRole = "owner" | "admin" | "member" | "invited";

export interface OrganizationMembers {
  owner: string;
  admins: string[];
  members: string[];
  invited: string[];
}

export interface Organization {
  id: string;
  name: string;
  unique_name: string;
  members: OrganizationMembers;
  // Adicione outros campos conforme necessário
}
