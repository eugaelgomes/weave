const SystemSettingsRepository = require("../repositories/system-settings.repository");

class SystemSettingsCache {
  constructor() {
    this.settings = null;
    this.lastFetched = null;
    this.ttlMs = 5 * 60 * 1000; // 5 minutos de cache em memória
  }

  async load() {
    const now = Date.now();
    // Se não tiver configurações no cache ou o tempo TTL expirou
    if (!this.settings || (now - this.lastFetched > this.ttlMs)) {
      try {
        this.settings = await SystemSettingsRepository.getSettings();
        this.lastFetched = now;
      } catch (error) {
        console.error("[SystemSettingsCache] Error loading settings:", error);
        // Fallback básico para não quebrar a aplicação caso o BD falhe
        this.settings = this.settings || {
          ai_global_config: {},
          instance_branding: {},
          oauth_config: {},
          smtp_config: {},
          storage_config: {}
        };
      }
    }
    return this.settings;
  }

  /**
   * Força a limpeza e recarregamento do cache (ideal para chamar após uma mutação no Painel Admin)
   */
  async forceReload() {
    this.settings = null;
    return this.load();
  }

  async getSmtpConfig() {
    await this.load();
    return this.settings?.smtp_config || {};
  }

  async getStorageConfig() {
    await this.load();
    return this.settings?.storage_config || {};
  }

  async getOauthConfig() {
    await this.load();
    return this.settings?.oauth_config || {};
  }

  async getAiGlobalConfig() {
    await this.load();
    return this.settings?.ai_global_config || {};
  }

  async getInstanceBranding() {
    await this.load();
    return this.settings?.instance_branding || {};
  }
}

// Exporta como Singleton para toda a aplicação compartilhar a mesma instância em memória
module.exports = new SystemSettingsCache();
