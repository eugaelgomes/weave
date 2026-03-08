/**
 * Utilidades para trabalhar com colaboradores
 */

export interface CollaboratorObject {
  id?: string;
  user_id?: string;
  username?: string;
  name?: string;
  email?: string;
  avatar_url?: string;
  added_at?: string;
}

/**
 * Extrai o nome de exibição de um colaborador, que pode ser string ou objeto
 */
export function getCollaboratorDisplayName(collaborator: unknown): string {
  if (typeof collaborator === "string") {
    return collaborator;
  }

  if (typeof collaborator === "object" && collaborator !== null) {
    const obj = collaborator as CollaboratorObject;
    return obj.username || obj.name || obj.email || "U";
  }

  return "U";
}

/**
 * Extrai o avatar URL de um colaborador, se disponível
 */
export function getCollaboratorAvatarUrl(collaborator: unknown): string | null {
  if (typeof collaborator === "object" && collaborator !== null) {
    const obj = collaborator as CollaboratorObject;
    return obj.avatar_url || null;
  }

  return null;
}

/**
 * Extrai o ID de um colaborador
 */
export function getCollaboratorId(collaborator: unknown): string | null {
  if (typeof collaborator === "object" && collaborator !== null) {
    const obj = collaborator as CollaboratorObject & { user_id?: string };
    // Prioriza user_id (formato do backend) seguido por id
    return obj.user_id || obj.id || null;
  }

  return null;
}

/**
 * Verifica se o colaborador é um objeto com propriedades expandidas
 */
export function isExpandedCollaborator(collaborator: unknown): collaborator is CollaboratorObject {
  return (
    typeof collaborator === "object" &&
    collaborator !== null &&
    ("name" in collaborator || "email" in collaborator || "username" in collaborator)
  );
}
