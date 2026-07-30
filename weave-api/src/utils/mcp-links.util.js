/**
 * Utilitário para formatar URLs front-end seguras de recursos do Weave,
 * permitindo que os agentes MCP retornem links clicáveis ao usuário.
 */
class McpLinksUtil {
  /**
   * Obtém a URL base do frontend.
   * @returns {string}
   */
  static getBaseUrl() {
    // Remove trailing slashes se existirem
    return (process.env.FRONTEND_URL || "https://app.theweave.dev").replace(
      /\/+$/,
      ""
    );
  }

  /**
   * Gera a URL pública de acesso para uma nota.
   * @param {string} publicId - O ID público da nota (ex: 'public_note_id')
   * @returns {string}
   */
  static getNoteUrl(publicId) {
    if (!publicId) return null;
    return `${this.getBaseUrl()}/notes/${publicId}`;
  }

  /**
   * Gera a URL pública de acesso para uma task.
   * Tasks e Notes utilizam a mesma rota de visualização no frontend (/notes/).
   * @param {string} publicId - O ID público da task (ex: 'public_task_id')
   * @returns {string}
   */
  static getTaskUrl(publicId) {
    if (!publicId) return null;
    return `${this.getBaseUrl()}/notes/${publicId}`;
  }

  /**
   * Enriquecer uma resposta de MCP com um link na propriedade `app_url`.
   * @param {object} item - O objeto original da nota/tarefa
   * @param {'note' | 'task'} type - O tipo do recurso
   * @param {string} publicIdField - O nome do campo onde está o ID público (padrão 'public_note_id' ou 'public_task_id')
   * @returns {object} - O objeto enriquecido com `app_url`
   */
  static enrichWithAppUrl(item, type, publicIdField) {
    if (!item) return item;

    const publicId = item[publicIdField];
    let appUrl = null;

    if (type === "note") {
      appUrl = this.getNoteUrl(publicId);
    } else if (type === "task") {
      appUrl = this.getTaskUrl(publicId);
    }

    return {
      ...item,
      app_url: appUrl,
    };
  }
}

module.exports = McpLinksUtil;
