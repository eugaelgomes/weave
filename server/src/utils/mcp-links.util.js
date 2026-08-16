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
    return (process.env.FRONTEND_URL || "https://app.theweave.dev").replace(/\/+$/, "");
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
   * Gera a URL pública de acesso para um projeto.
   * @param {string} projectId - O ID interno do projeto
   * @returns {string}
   */
  static getProjectUrl(projectId) {
    if (!projectId) return null;
    return `${this.getBaseUrl()}/projects/${projectId}`;
  }

  /**
   * Gera a URL pública de acesso para um comentário.
   * @param {string} notePublicId - O ID da nota
   * @param {string} commentId - O ID do comentário
   * @returns {string}
   */
  static getCommentUrl(notePublicId, commentId) {
    if (!notePublicId || !commentId) return null;
    return `${this.getBaseUrl()}/notes/${notePublicId}/${commentId}`;
  }

  /**
   * Enriquecer uma resposta de MCP com um link na propriedade `app_url`.
   * @param {object} item - O objeto original
   * @param {'note' | 'task' | 'project' | 'comment'} type - O tipo do recurso
   * @param {string} publicIdField - O nome do campo onde está o ID público principal
   * @param {string} [secondaryIdField] - Campo secundário (ex: comment_id)
   * @returns {object} - O objeto enriquecido com `app_url`
   */
  static enrichWithAppUrl(item, type, publicIdField, secondaryIdField) {
    if (!item) return item;

    const publicId = item[publicIdField];
    const secondaryId = secondaryIdField ? item[secondaryIdField] : null;
    let appUrl = null;

    if (type === "note" || type === "task") {
      appUrl = this.getNoteUrl(publicId);
    } else if (type === "project") {
      appUrl = this.getProjectUrl(publicId);
    } else if (type === "comment") {
      appUrl = this.getCommentUrl(publicId, secondaryId);
    }

    return {
      ...item,
      app_url: appUrl,
    };
  }
}

module.exports = McpLinksUtil;
