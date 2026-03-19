import type { TranslationKeys } from "./pt-BR";

const esES: TranslationKeys = {
  common: {
    user: "Usuario",
    username: "usuario",
    untitled: "Sin título",
    unnamed: "Sin nombre",
    empty: "Vacío",
    loading: "Cargando...",
    save: "Guardar",
    cancel: "Cancelar",
    delete: "Eliminar",
    edit: "Editar",
    close: "Cerrar",
    confirm: "Confirmar",
    back: "Volver",
    next: "Siguiente",
    search: "Buscar",
    notes: "notas",
    projects: "proyectos",
  },

  greeting: {
    hello: "Hola,",
  },

  nav: {
    home: "Inicio",
    notes: "Notas",
    projects: "Proyectos",
    weaveAi: "Weave AI",
    chat: "Chat",
    agent: "Agente",
    notifications: "Notificaciones",
    calendar: "Calendario",
    organization: "Organización",
    settings: "Configuración",
    members: "Miembros",
    menu: "Menú",
    expandMenu: "Expandir menú",
    collapseMenu: "Contraer menú",
    recentAccess: "Acceso Reciente",
    openSidebar: "Abrir menú lateral",
    backToHome: "Volver al inicio",
  },

  home: {
    metrics: "Métricas",
    totalNotes: "Total de Notas",
    uniqueTags: "Tags únicas",
    totalProjects: "Total de Proyectos",
    activeProjects: "Proyectos Activos",
    tagCloud: "Nube de Tags",
    tagCloudDescription: "Estas son tus tags más usadas",
    notEnoughTags: "No hay suficientes tags",
  },

  navbar: {
    accountSettings: "Configuración de la Cuenta",
    theme: "Tema",
    light: "Claro",
    dark: "Oscuro",
    aboutSystem: "Acerca del Sistema",
    logout: "Cerrar sesión",
    closeMenu: "Cerrar Menú",
  },

  settings: {
    title: "Configuración de la Cuenta",
    description: "Administre sus datos personales, organización y preferencias de seguridad.",
    passwordChangeHint: "Para cambiar la contraseña, complete todos los campos de contraseña.",
    passwordMismatch: "La nueva contraseña y la confirmación no coinciden.",
    passwordTooShort: "La nueva contraseña debe tener al menos 6 caracteres.",
    profileUpdated: "Perfil actualizado con éxito.",
    updateFailed: "Error al actualizar.",
    requestingBackup: "Solicitando respaldo...",
    backupProcessing: "Respaldo en proceso...",
    backupProgress: "Procesando respaldo: {progress}%",
    backupDoneDownload: "Respaldo completado. Descarga iniciada.",
    backupDoneEmail: "Respaldo completado. Revise su correo.",
    backupFailed: "Error al generar respaldo",
    backupTakingLong: "El respaldo está tardando más de lo esperado...",
    deleteAccountWarning:
      "ATENCIÓN: Esta acción es irreversible. ¿Realmente desea eliminar su cuenta?",
    deleteAccountError: "Error al eliminar cuenta.",
    deleteAccountCritical: "Error crítico al intentar eliminar cuenta.",
    language: "Idioma",
    languageDescription: "Elija el idioma de la interfaz.",
  },
};

export default esES;
