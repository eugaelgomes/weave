export const formatDate = (date: string | Date | null | undefined) => {
  if (!date) return "N/A";

  const parsedDate = new Date(date);
  if (isNaN(parsedDate.getTime())) return "N/A";

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(parsedDate);
};

/**
 * Formata nomes de funções/roles vindos do backend para exibição na UI.
 * Ex: "workspace_admin" -> "Administrador" ou "ADMIN" -> "Admin"
 */
export const formatRoleName = (role: string | undefined | null): string => {
  if (!role) return "Membro";

  // Dicionário de tradução para termos específicos da regra de negócio
  const roleMap: Record<string, string> = {
    super_admin: "Super Administrador",
    admin: "Administrador",
    owner: "Proprietário",
    member: "Membro",
    viewer: "Visualizador",
    editor: "Editor",
    billing: "Financeiro",
  };

  const normalizedRole = role.toLowerCase().trim();

  // 1. Verifica se existe tradução mapeada
  if (roleMap[normalizedRole]) {
    return roleMap[normalizedRole];
  }

  // 2. Fallback: Transforma snake_case/kebab-case em espaços e Capitaliza
  // Ex: "project_manager" -> "Project Manager"
  return normalizedRole.replace(/[_-]/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
};
