"use client";

import { useEffect, useState } from "react";
import { getTranslations, LocaleKey } from "@/app/(public)/auth/_i18n";
import { useAuth } from "@/app/_contexts/auth-context";
import { UserPreferences } from "@/types/user-preferences";

interface Props {
  locale?: LocaleKey;
  onSkip: () => void;
  onComplete: () => void;
}

export function SetProfileSettings({ locale = "pt-br", onSkip, onComplete }: Props) {
  const { user, updateUser } = useAuth();
  const t = getTranslations(locale);
  const profileT = t.profileSettings;

  const [themeMode, setThemeMode] = useState<"LIGHT" | "DARK">("LIGHT");
  const [privateProfile, setPrivateProfile] = useState(false);
  const [interfaceLanguage, setInterfaceLanguage] = useState("pt-BR");
  const [density, setDensity] = useState<"compact" | "comfortable" | "spacious">("comfortable");
  const [aiEnabled, setAiEnabled] = useState(true);
  const [aiAutoSuggestions, setAiAutoSuggestions] = useState(true);
  const [aiContextAwareAssistance, setAiContextAwareAssistance] = useState(true);
  const [notifyPush, setNotifyPush] = useState(true);
  const [notifyEmail, setNotifyEmail] = useState(true);
  const [notifySound, setNotifySound] = useState(true);
  const [notifyBrowser, setNotifyBrowser] = useState(true);
  const [notifyProjectUpdates, setNotifyProjectUpdates] = useState(true);
  const [notifyMentionsAndComments, setNotifyMentionsAndComments] = useState(true);
  const [notifyCollaborationInvites, setNotifyCollaborationInvites] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const existingPreferences = (user?.usage_preference as UserPreferences) || {};

  useEffect(() => {
    const prefs = (user?.usage_preference as UserPreferences) || {};

    if (prefs.display?.density) {
      setDensity(prefs.display.density);
    }
    if (prefs.language?.interface) {
      setInterfaceLanguage(prefs.language.interface);
    }

    setAiEnabled(prefs.ai?.enabled ?? true);
    setAiAutoSuggestions(prefs.ai?.autoSuggestions ?? true);
    setAiContextAwareAssistance(prefs.ai?.contextAwareAssistance ?? true);

    setNotifyPush(prefs.notifications?.push ?? true);
    setNotifyEmail(prefs.notifications?.email ?? true);
    setNotifySound(prefs.notifications?.sound ?? true);
    setNotifyBrowser(prefs.notifications?.browser ?? true);
    setNotifyProjectUpdates(prefs.notifications?.projectUpdates ?? true);
    setNotifyMentionsAndComments(prefs.notifications?.mentionsAndComments ?? true);
    setNotifyCollaborationInvites(prefs.notifications?.collaborationInvites ?? true);
  }, [user?.usage_preference]);

  const handleSave = async () => {
    setError(null);
    setIsLoading(true);

    const mergedUsagePreference: UserPreferences = {
      ...existingPreferences,
      display: {
        ...(existingPreferences.display || {}),
        density,
      },
      language: {
        ...(existingPreferences.language || {}),
        interface: interfaceLanguage,
        spellCheckLanguage: interfaceLanguage,
      },
      ai: {
        ...(existingPreferences.ai || {}),
        enabled: aiEnabled,
        autoSuggestions: aiAutoSuggestions,
        contextAwareAssistance: aiContextAwareAssistance,
      },
      notifications: {
        ...(existingPreferences.notifications || {}),
        push: notifyPush,
        email: notifyEmail,
        sound: notifySound,
        browser: notifyBrowser,
        projectUpdates: notifyProjectUpdates,
        mentionsAndComments: notifyMentionsAndComments,
        collaborationInvites: notifyCollaborationInvites,
      },
    };

    const result = await updateUser({
      theme_mode: themeMode,
      private_profile: privateProfile,
      usage_preference: mergedUsagePreference,
    });

    setIsLoading(false);

    if (!result.success) {
      setError(result.message || profileT.saveError);
      return;
    }

    onComplete();
  };

  return (
    <div className="flex w-full flex-col px-6 py-4 sm:px-8">
      <div className="mt-2 space-y-4">
        <div className="text-center">
          <h2 className="text-brand-secondary-900 text-xl font-bold tracking-tight">{profileT.title}</h2>
          <p className="text-brand-secondary-500 mt-1 text-sm">{profileT.subtitle}</p>
        </div>

        <div className="border-brand-secondary-200 space-y-4 rounded-xl border bg-white p-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="theme-mode" className="text-brand-secondary-600 mb-1 block text-xs font-medium">
                {profileT.themeLabel}
              </label>
              <select
                id="theme-mode"
                value={themeMode}
                onChange={(e) => setThemeMode(e.target.value as "LIGHT" | "DARK")}
                className="border-brand-secondary-200 text-brand-secondary-900 focus:ring-brand-primary-700 w-full rounded-md border-2 bg-white px-3 py-2 text-sm transition-colors focus:ring-2 focus:outline-none"
              >
                <option value="LIGHT">{profileT.themeOptions.light}</option>
                <option value="DARK">{profileT.themeOptions.dark}</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="interface-language"
                className="text-brand-secondary-600 mb-1 block text-xs font-medium"
              >
                {profileT.interfaceLanguageLabel}
              </label>
              <select
                id="interface-language"
                value={interfaceLanguage}
                onChange={(e) => setInterfaceLanguage(e.target.value)}
                className="border-brand-secondary-200 text-brand-secondary-900 focus:ring-brand-primary-700 w-full rounded-md border-2 bg-white px-3 py-2 text-sm transition-colors focus:ring-2 focus:outline-none"
              >
                <option value="pt-BR">{profileT.interfaceLanguageOptions["pt-BR"]}</option>
                <option value="en-US">{profileT.interfaceLanguageOptions["en-US"]}</option>
                <option value="es-ES">{profileT.interfaceLanguageOptions["es-ES"]}</option>
              </select>
            </div>

            <div>
              <label htmlFor="ui-density" className="text-brand-secondary-600 mb-1 block text-xs font-medium">
                {profileT.densityLabel}
              </label>
              <select
                id="ui-density"
                value={density}
                onChange={(e) =>
                  setDensity(e.target.value as "compact" | "comfortable" | "spacious")
                }
                className="border-brand-secondary-200 text-brand-secondary-900 focus:ring-brand-primary-700 w-full rounded-md border-2 bg-white px-3 py-2 text-sm transition-colors focus:ring-2 focus:outline-none"
              >
                <option value="compact">{profileT.densityOptions.compact}</option>
                <option value="comfortable">{profileT.densityOptions.comfortable}</option>
                <option value="spacious">{profileT.densityOptions.spacious}</option>
              </select>
            </div>

            <div className="flex items-center pb-0.5">
              <label className="text-brand-secondary-600 flex items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={privateProfile}
                  onChange={(e) => setPrivateProfile(e.target.checked)}
                  className="border-brand-secondary-300 text-brand-primary-500 focus:ring-brand-primary-300 h-4 w-4 rounded"
                />
                {profileT.privateProfile}
              </label>
            </div>
          </div>

          <div className="border-brand-secondary-100 mt-1 border-t pt-4">
            <p className="text-brand-secondary-700 mb-2 text-xs font-semibold">{profileT.aiSection}</p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              <ToggleButton
                label={profileT.aiOptions.enabled}
                checked={aiEnabled}
                onChange={setAiEnabled}
                disabled={isLoading}
              />
              <ToggleButton
                label={profileT.aiOptions.autoSuggestions}
                checked={aiAutoSuggestions}
                onChange={setAiAutoSuggestions}
                disabled={isLoading || !aiEnabled}
              />
              <ToggleButton
                label={profileT.aiOptions.contextAwareAssistance}
                checked={aiContextAwareAssistance}
                onChange={setAiContextAwareAssistance}
                disabled={isLoading || !aiEnabled}
              />
            </div>
          </div>

          <div className="border-brand-secondary-100 mt-1 border-t pt-4">
            <p className="text-brand-secondary-700 mb-2 text-xs font-semibold">
              {profileT.notificationsSection}
            </p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              <ToggleButton
                label={profileT.notificationOptions.push}
                checked={notifyPush}
                onChange={setNotifyPush}
                disabled={isLoading}
              />
              <ToggleButton
                label={profileT.notificationOptions.email}
                checked={notifyEmail}
                onChange={setNotifyEmail}
                disabled={isLoading}
              />
              <ToggleButton
                label={profileT.notificationOptions.sound}
                checked={notifySound}
                onChange={setNotifySound}
                disabled={isLoading}
              />
              <ToggleButton
                label={profileT.notificationOptions.browser}
                checked={notifyBrowser}
                onChange={setNotifyBrowser}
                disabled={isLoading}
              />
              <ToggleButton
                label={profileT.notificationOptions.projectUpdates}
                checked={notifyProjectUpdates}
                onChange={setNotifyProjectUpdates}
                disabled={isLoading}
              />
              <ToggleButton
                label={profileT.notificationOptions.mentionsAndComments}
                checked={notifyMentionsAndComments}
                onChange={setNotifyMentionsAndComments}
                disabled={isLoading}
              />
              <ToggleButton
                label={profileT.notificationOptions.collaborationInvites}
                checked={notifyCollaborationInvites}
                onChange={setNotifyCollaborationInvites}
                disabled={isLoading}
              />
            </div>
          </div>
        </div>

        {error && <p className="text-center text-sm text-red-600">{error}</p>}

        <div className="mt-1 flex flex-col justify-between gap-2 sm:flex-row">
          <button
            type="button"
            onClick={onSkip}
            className="border-brand-secondary-200 text-brand-secondary-700 hover:bg-brand-secondary-100 w-full rounded-md border-2 bg-white px-4 py-2 text-sm font-medium transition-colors sm:w-auto"
          >
            {profileT.skip}
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isLoading}
            className="bg-brand-primary-500 shadow-brand-primary-700/20 hover:bg-brand-primary-800 w-full rounded-md px-4 py-2 text-sm font-semibold text-white shadow-lg transition-all hover:scale-[1.02] active:scale-95 disabled:pointer-events-none disabled:opacity-50 sm:w-auto"
          >
            {isLoading ? profileT.saving : profileT.save}
          </button>
        </div>
      </div>
    </div>
  );
}

interface ToggleButtonProps {
  label: string;
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
}

function ToggleButton({ label, checked, onChange, disabled = false }: ToggleButtonProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="border-brand-secondary-200 text-brand-secondary-700 hover:bg-brand-secondary-100 flex w-full items-center justify-between rounded-md border bg-white px-3 py-2 text-xs leading-tight transition-colors disabled:cursor-not-allowed disabled:opacity-60"
    >
      <span className="truncate pr-1 text-left">{label}</span>
      <span
        className={`relative h-4 w-7 shrink-0 rounded-full transition-colors ${
          checked ? "bg-brand-primary-500" : "bg-brand-secondary-300"
        }`}
      >
        <span
          className={`absolute top-0.5 h-3 w-3 rounded-full bg-white transition-transform ${
            checked ? "left-3.5" : "left-0.5"
          }`}
        />
      </span>
    </button>
  );
}
