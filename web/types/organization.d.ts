export type WorkspaceMemberRole = "owner" | "admin" | "member" | "invited";

export interface WorkspaceMembers {
  owner: string;
  admins: string[];
  members: string[];
  invited: string[];
}

export interface Workspace {
  id: string;
  name: string;
  unique_name: string;
  members: WorkspaceMembers;
  // Adicione outros campos conforme necessário
}
