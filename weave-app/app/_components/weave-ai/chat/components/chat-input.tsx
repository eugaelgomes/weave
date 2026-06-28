import React, { Dispatch, SetStateAction } from "react";
import {
  Send,
  Paperclip,
  X,
  Settings2,
  Unlock,
  Lock,
  Globe,
  NotebookPen,
  FolderKanban,
  FileText,
  ChevronDown,
} from "lucide-react";
import { useLanguage } from "@/app/_contexts/language-context";
import { type AIModel } from "@/app/_contexts/chat-context";
import { type Agent } from "@/app/_contexts/agent-context";
import { cn } from "@/lib/utils";

// Assume ModelIcon and AgentIcon are imported or defined here for brevity
// (You might want to extract these to shared components as well)
import { ModelIcon, AgentIcon } from "../../shared/chat-icons";

export interface ChatInputProps {
  input: string;
  setInput: (value: string) => void;
  handleSend: () => void;
  canSendAiMessage: boolean;
  loading: boolean;
  messagesLength: number;
  isSandboxOpen: boolean;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  handleFilesSelected: (files: FileList | null) => void;
  selectedFiles: File[];
  handleRemoveFile: (file: File) => void;
  contextItems: { id: string; type: "note" | "project"; title: string }[];
  handleRemoveContext: (type: "note" | "project", id: string) => void;
  
  // Options state
  showOptionsMenu: boolean;
  setShowOptionsMenu: Dispatch<SetStateAction<boolean>>;
  allowEdit: boolean;
  setAllowEdit: Dispatch<SetStateAction<boolean>>;
  allowWebSearch: boolean;
  setAllowWebSearch: Dispatch<SetStateAction<boolean>>;

  // Context Menu state
  showContextMenu: boolean;
  setShowContextMenu: Dispatch<SetStateAction<boolean>>;
  contextSearch: string;
  setContextSearch: Dispatch<SetStateAction<string>>;
  filteredNotes: any[];
  filteredProjects: any[];
  noteContextLimit: number;
  setNoteContextLimit: Dispatch<SetStateAction<number>>;
  projectContextLimit: number;
  setProjectContextLimit: Dispatch<SetStateAction<number>>;
  handleAddContext: (type: "note" | "project", id: string, title: string) => void;

  // Model Menu State
  isModelMenuOpen: boolean;
  setIsModelMenuOpen: Dispatch<SetStateAction<boolean>>;
  selectedModel: AIModel | null;
  setSelectedModel: Dispatch<SetStateAction<AIModel | null>>;
  models: AIModel[];
  formatModelLabel: (model: AIModel) => string;

  // Agent Menu State
  isAgentMenuOpen: boolean;
  setIsAgentMenuOpen: Dispatch<SetStateAction<boolean>>;
  selectedAgent: Agent | null;
  selectedAgentId: string | null;
  setSelectedAgentId: Dispatch<SetStateAction<string | null>>;
  agents: Agent[];

  user: any;
  orgId: string;
  router: any;
  fileError: string | null;
  error: string | null;
}

export function ChatInput(props: ChatInputProps) {
  const { t } = useLanguage();

  return (
    <div
      className={cn(
        "pointer-events-none absolute right-0 left-0 z-10 px-4 transition-all duration-700 ease-in-out",
        props.messagesLength === 0 && !props.loading
          ? "top-1/2 -translate-y-1/2 bg-transparent pb-0"
          : `bottom-0 translate-y-0 bg-gradient-to-t from-white via-white/95 to-transparent pt-10 dark:from-[#1d1d1b] dark:via-[#1d1d1b]/95 dark:to-transparent ${
              props.isSandboxOpen ? "pb-2" : "pb-4"
            }`
      )}
    >
      <div
        className={cn(
          "pointer-events-auto mx-auto flex w-full flex-col gap-2 px-2 transition-all duration-500 ease-in-out sm:px-4",
          props.messagesLength === 0 && !props.loading
            ? "max-w-2xl"
            : props.isSandboxOpen
              ? "max-w-2xl"
              : "max-w-4xl"
        )}
      >
        {props.messagesLength === 0 && !props.loading && (
          <div className="animate-in fade-in flex flex-col items-center gap-4 pb-3 text-center duration-500">
            <h2 className="text-lg font-medium tracking-tight text-neutral-500 dark:text-neutral-400">
              {t.weaveAi.welcomeGreetingPrefix}{" "}
              <span className="font-semibold text-neutral-700 dark:text-neutral-200">
                {props.user?.user_name?.split(" ")[0] || props.user?.username || ""}
              </span>
              {", "}
              {t.weaveAi.welcomeGreetingSuffix}{" "}
              <span className="font-fredoka text-brand-yellow dark:text-brand-yellow font-semibold tracking-tight">
                Weave AI
              </span>{" "}
              {t.weaveAi.welcomeGreetingAction}
            </h2>
            <div className="mt-2 flex flex-wrap justify-center gap-2">
              {[
                t.weaveAi.suggestionTask,
                t.weaveAi.suggestionProject,
                t.weaveAi.suggestionSchedule,
                t.weaveAi.suggestionResearch,
                t.weaveAi.suggestionSummarize,
              ].map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => props.setInput(suggestion)}
                  className="rounded-full border border-neutral-200/60 bg-white/50 px-3 py-1.5 text-[10px] font-medium text-neutral-600 transition-all hover:bg-neutral-100 dark:border-neutral-800/60 dark:bg-neutral-900/40 dark:text-neutral-400 dark:hover:bg-neutral-800"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap gap-1">
            {props.selectedFiles.map((file) => (
              <div
                key={`${file.name}-${file.size}`}
                className="border-brand-orange/50 bg-brand-orange/15 text-brand-orange dark:border-brand-orange/40 dark:bg-brand-orange/20 dark:text-brand-yellow flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px]"
              >
                <Paperclip className="h-2.5 w-2.5" />
                <span className="font-medium">{file.name}</span>
                <button
                  onClick={() => props.handleRemoveFile(file)}
                  title={t.common.remove}
                  aria-label={t.common.remove}
                  className="hover:text-brand-red dark:hover:text-brand-red"
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              </div>
            ))}

            {props.contextItems.map((item) => (
              <div
                key={`${item.type}-${item.id}`}
                className="border-brand-navy/30 bg-brand-beige text-brand-navy dark:border-brand-beige/20 dark:bg-brand-navy/30 dark:text-brand-beige flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px]"
              >
                {item.type === "note" ? (
                  <FileText className="h-2.5 w-2.5" />
                ) : (
                  <FolderKanban className="h-2.5 w-2.5" />
                )}
                <span className="font-medium">{item.title}</span>
                <button
                  onClick={() => props.handleRemoveContext(item.type, item.id)}
                  title={t.common.remove}
                  aria-label={t.common.remove}
                  className="hover:text-brand-red dark:hover:text-brand-red"
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div
          className={`focus-within:ring-neutral-400/10 dark:focus-within:ring-neutral-500/10 relative flex flex-col gap-1 rounded-2xl bg-white/70 p-2 backdrop-blur-lg transition-all duration-700 focus-within:ring-1 dark:bg-[#252525]/70 ${
            props.messagesLength === 0 && !props.loading
              ? "shadow-2xl shadow-black/5 dark:shadow-black/40"
              : "shadow-lg shadow-black/5 dark:shadow-black/20"
          }`}
        >
          {/* Elegant Inner Cloud Glow */}
          <div
            className={`absolute inset-0 -z-10 overflow-hidden rounded-2xl transition-opacity duration-1000 ${
              props.messagesLength === 0 && !props.loading ? "opacity-100" : "opacity-0"
            }`}
          >
            <div
              className="bg-brand-yellow/20 dark:bg-brand-yellow/10 absolute top-0 -left-10 h-full w-2/3 animate-pulse rounded-full blur-2xl"
              style={{ animationDuration: "4s" }}
            />
            <div
              className="absolute top-0 -right-10 h-full w-2/3 animate-pulse rounded-full bg-sky-400/20 blur-2xl dark:bg-sky-500/10"
              style={{ animationDuration: "5s", animationDelay: "1s" }}
            />
          </div>

          <input
            ref={props.fileInputRef}
            type="file"
            multiple
            accept=".png,.jpg,.jpeg,.pdf,.csv,.xls"
            className="hidden"
            onChange={(event) => {
              props.handleFilesSelected(event.target.files);
              event.currentTarget.value = "";
            }}
          />

          <textarea
            ref={props.textareaRef}
            rows={1}
            value={props.input}
            onChange={(e) => props.setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                props.handleSend();
              }
            }}
            disabled={!props.canSendAiMessage}
            placeholder={
              props.canSendAiMessage
                ? t.weaveAi.inputPlaceholder
                : (t.weaveAi.limitReached ?? "Monthly AI message limit reached")
            }
            className="max-h-32 min-h-[56px] w-full resize-none bg-transparent px-1 py-2 text-sm outline-none placeholder:text-neutral-400 disabled:cursor-not-allowed disabled:opacity-50 dark:text-neutral-100 dark:placeholder:text-neutral-500"
          />

          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-1">
              <button
                onClick={() => props.fileInputRef.current?.click()}
                title={t.weaveAi.attachFiles}
                aria-label={t.weaveAi.attachFiles}
                className="transition-all duration-200 active:scale-95 hover:scale-105 hover:bg-brand-beige hover:text-brand-navy dark:hover:bg-brand-navy/30 dark:hover:text-brand-beige flex h-8 w-8 items-center justify-center rounded-full text-neutral-400"
              >
                <Paperclip className="h-4 w-4" />
              </button>

              {/* Options Menu */}
              <div className="relative">
                <button
                  onClick={() => props.setShowOptionsMenu(!props.showOptionsMenu)}
                  title="Opções"
                  aria-label="Opções"
                  className="transition-all duration-200 active:scale-95 hover:scale-105 hover:bg-brand-beige hover:text-brand-navy dark:hover:bg-brand-navy/30 dark:hover:text-brand-beige flex h-8 w-8 items-center justify-center rounded-full text-neutral-400"
                >
                  <Settings2 className="h-4 w-4" />
                </button>

                {props.showOptionsMenu && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => props.setShowOptionsMenu(false)}
                    />
                    <div className="dark:border-surface-dark-border absolute bottom-full left-0 z-20 mb-2 w-48 overflow-hidden rounded border border-neutral-200 bg-white p-1 shadow-lg dark:bg-[#1d1d1b]">
                      <button
                        onClick={() => {
                          props.setAllowEdit(!props.allowEdit);
                          props.setShowOptionsMenu(false);
                        }}
                        className="hover:bg-brand-beige dark:hover:bg-brand-navy/30 flex w-full items-center justify-between gap-2 rounded px-2 py-2 text-left text-xs transition-colors"
                      >
                        <div className="flex items-center gap-2 text-neutral-600 dark:text-neutral-300">
                          {props.allowEdit ? (
                            <Unlock className="text-brand-yellow h-3.5 w-3.5" />
                          ) : (
                            <Lock className="h-3.5 w-3.5" />
                          )}
                          <span>{t.weaveAi.allowEdit}</span>
                        </div>
                        {props.allowEdit && (
                          <div className="bg-brand-yellow h-1.5 w-1.5 rounded-full"></div>
                        )}
                      </button>

                      <button
                        onClick={() => {
                          props.setAllowWebSearch(!props.allowWebSearch);
                          props.setShowOptionsMenu(false);
                        }}
                        className="hover:bg-brand-beige dark:hover:bg-brand-navy/30 flex w-full items-center justify-between gap-2 rounded px-2 py-2 text-left text-xs transition-colors"
                      >
                        <div className="flex items-center gap-2 text-neutral-600 dark:text-neutral-300">
                          <Globe
                            className={`h-3.5 w-3.5 ${props.allowWebSearch ? "text-brand-yellow" : ""}`}
                          />
                          <span>{t.weaveAi.webSearch}</span>
                        </div>
                        {props.allowWebSearch && (
                          <div className="bg-brand-yellow h-1.5 w-1.5 rounded-full"></div>
                        )}
                      </button>
                    </div>
                  </>
                )}
              </div>

              <div className="relative">
                <button
                  onClick={() => props.setShowContextMenu(!props.showContextMenu)}
                  title={t.weaveAi.indexContext}
                  aria-label={t.weaveAi.indexContext}
                  className="transition-all duration-200 active:scale-95 hover:scale-105 hover:bg-brand-beige hover:text-brand-navy dark:hover:bg-brand-navy/30 dark:hover:text-brand-beige flex h-8 w-8 items-center justify-center rounded-full text-neutral-400"
                >
                  <NotebookPen className="h-4 w-4" />
                </button>

                {props.showContextMenu && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => props.setShowContextMenu(false)}
                    />
                    <div className="dark:border-surface-dark-border absolute bottom-full left-0 z-20 mb-2 w-56 overflow-hidden rounded border border-neutral-200 bg-white shadow-lg dark:bg-[#1d1d1b]">
                      <div className="dark:border-surface-dark-border border-b border-neutral-100 p-1">
                        <input
                          value={props.contextSearch}
                          onChange={(event) => props.setContextSearch(event.target.value)}
                          placeholder={t.weaveAi.searchContext}
                          className="focus:border-brand-yellow dark:border-surface-dark-border-strong w-full rounded border border-neutral-200 bg-white px-2 py-1 text-xs outline-none dark:bg-[#1d1d1b]"
                        />
                      </div>
                      <div className="max-h-48 overflow-y-auto p-1">
                        <div className="px-1.5 py-1 text-[9px] font-bold text-neutral-400">
                          {t.weaveAi.tasks}
                        </div>
                        {props.filteredNotes.slice(0, props.noteContextLimit).map((note: any) => (
                          <button
                            key={note.id}
                            onClick={() => props.handleAddContext("note", note.id, note.title)}
                            className="hover:bg-brand-beige dark:hover:bg-brand-navy/30 flex w-full items-center gap-1.5 rounded px-2 py-1.5 text-left text-xs"
                          >
                            <FileText className="text-brand-orange h-3 w-3" />
                            <span className="truncate">{note.title}</span>
                          </button>
                        ))}
                        {props.filteredNotes.length > props.noteContextLimit && (
                          <button
                            type="button"
                            onClick={() => props.setNoteContextLimit((prev) => prev + 10)}
                            className="text-brand-navy hover:bg-brand-beige dark:text-brand-yellow dark:hover:bg-brand-navy/30 w-full rounded px-2 py-1 text-left text-[10px] font-semibold"
                          >
                            {t.common.showMore}
                          </button>
                        )}

                        <div className="dark:border-surface-dark-border mt-1 border-t border-neutral-100 px-1.5 py-1 text-[9px] font-bold text-neutral-400">
                          {t.weaveAi.projects}
                        </div>
                        {props.filteredProjects.slice(0, props.projectContextLimit).map((project: any) => (
                          <button
                            key={project.id}
                            onClick={() => props.handleAddContext("project", project.id, project.title)}
                            className="hover:bg-brand-beige dark:hover:bg-brand-navy/30 flex w-full items-center gap-1.5 rounded px-2 py-1.5 text-left text-xs"
                          >
                            <FolderKanban className="text-brand-navy dark:text-brand-yellow h-3 w-3" />
                            <span className="truncate">{project.title}</span>
                          </button>
                        ))}
                        {props.filteredProjects.length > props.projectContextLimit && (
                          <button
                            type="button"
                            onClick={() => props.setProjectContextLimit((prev) => prev + 10)}
                            className="text-brand-navy hover:bg-brand-beige dark:text-brand-yellow dark:hover:bg-brand-navy/30 w-full rounded px-2 py-1 text-left text-[10px] font-semibold"
                          >
                            {t.common.showMore}
                          </button>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>

              <div className="relative ml-1">
                <button
                  onClick={() => props.setIsModelMenuOpen((v) => !v)}
                  className="transition-all duration-200 active:scale-95 hover:scale-105 hover:bg-brand-beige hover:text-brand-navy dark:hover:bg-brand-navy/30 dark:hover:text-brand-beige flex h-7 items-center gap-1 rounded-full bg-transparent px-2 py-0.5 text-[10px] font-medium text-neutral-600 dark:text-neutral-400"
                >
                  <ModelIcon
                    model={props.selectedModel}
                    className="h-3.5 w-3.5 flex-shrink-0 object-contain"
                  />
                  <span className="max-w-[120px] truncate text-[10px] font-semibold text-neutral-500">
                    {props.loading
                      ? t.common.loading
                      : props.selectedModel
                        ? props.formatModelLabel(props.selectedModel)
                        : ""}
                  </span>
                  <ChevronDown className="h-2.5 w-2.5 flex-shrink-0 text-neutral-400" />
                </button>

                {props.isModelMenuOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => props.setIsModelMenuOpen(false)}
                    />
                    <div className="dark:border-surface-dark-border absolute bottom-full left-0 z-20 mb-2 w-48 overflow-hidden rounded border border-neutral-200 bg-white shadow-lg dark:bg-[#1d1d1b]">
                      <div className="max-h-48 overflow-y-auto p-0.5">
                        {props.models.map((model) => (
                          <button
                            key={model.id}
                            onClick={() => {
                              props.setSelectedModel(model);
                              props.setIsModelMenuOpen(false);
                            }}
                            className={`hover:bg-brand-beige dark:hover:bg-brand-navy/30 flex w-full items-center gap-1.5 rounded px-1.5 py-1 text-left text-xs ${
                              props.selectedModel?.id === model.id
                                ? "bg-brand-beige text-brand-navy dark:bg-brand-navy/30 dark:text-brand-beige"
                                : ""
                            }`}
                          >
                            <ModelIcon
                              model={model}
                              className="h-3.5 w-3.5 flex-shrink-0 object-contain"
                            />
                            <span className="truncate">{props.formatModelLabel(model)}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>

              <div className="relative ml-1">
                <button
                  onClick={() => props.setIsAgentMenuOpen((prev) => !prev)}
                  className="transition-all duration-200 active:scale-95 hover:scale-105 hover:bg-brand-beige hover:text-brand-navy dark:hover:bg-brand-navy/30 dark:hover:text-brand-beige flex h-7 items-center gap-1 rounded-full bg-transparent px-2 py-0.5 text-[10px] font-medium text-neutral-600 dark:text-neutral-400"
                >
                  <AgentIcon
                    agent={props.selectedAgent}
                    className="h-3.5 w-3.5 flex-shrink-0 rounded-full object-cover"
                  />
                  <span className="max-w-[80px] truncate text-[10px] font-semibold text-neutral-500">
                    {props.loading ? t.common.loading : props.selectedAgent?.name || t.nav.agent}
                  </span>
                  <ChevronDown className="h-2.5 w-2.5 flex-shrink-0 text-neutral-400" />
                </button>

                {props.isAgentMenuOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => props.setIsAgentMenuOpen(false)}
                    />
                    <div className="dark:border-surface-dark-border absolute right-0 bottom-full z-20 mb-2 w-56 overflow-hidden rounded border border-neutral-200 bg-white shadow-lg dark:bg-[#1d1d1b]">
                      <div className="max-h-48 overflow-y-auto p-0.5">
                        <button
                          onClick={() => {
                            props.setSelectedAgentId(null);
                            props.setIsAgentMenuOpen(false);
                          }}
                          className={`hover:bg-brand-beige dark:hover:bg-brand-navy/30 flex w-full items-center gap-1.5 rounded px-1.5 py-1 text-xs ${
                            !props.selectedAgentId
                              ? "bg-brand-beige text-brand-navy dark:bg-brand-navy/30 dark:text-brand-beige"
                              : ""
                          }`}
                        >
                          <AgentIcon agent={null} className="h-3.5 w-3.5 flex-shrink-0" />
                          <span>Agente padrão</span>
                        </button>
                        {props.agents.map((agent) => (
                          <button
                            key={agent.id}
                            onClick={() => {
                              props.setSelectedAgentId(agent.id);
                              props.setIsAgentMenuOpen(false);
                            }}
                            className={`hover:bg-brand-beige dark:hover:bg-brand-navy/30 flex w-full items-center gap-1.5 rounded px-1.5 py-1 text-left text-xs ${
                              props.selectedAgentId === agent.id
                                ? "bg-brand-beige text-brand-navy dark:bg-brand-navy/30 dark:text-brand-beige"
                                : ""
                            }`}
                          >
                            <AgentIcon
                              agent={agent}
                              className="h-3.5 w-3.5 flex-shrink-0 rounded-full object-cover"
                            />
                            <span className="truncate">{agent.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            <button
              onClick={props.handleSend}
              disabled={!props.input.trim() || !props.canSendAiMessage}
              title="Enviar mensagem"
              aria-label="Enviar mensagem"
              className="bg-neutral-300 dark:bg-neutral-600 dark:text-neutral-200 hover:bg-neutral-400 dark:hover:bg-neutral-500 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full transition-all duration-200 active:scale-95 hover:scale-105 disabled:scale-100 disabled:opacity-30 disabled:pointer-events-none"
            >
              <Send className="ml-0.5 h-4 w-4" />
            </button>
          </div>
        </div>

        {!props.canSendAiMessage && (
          <p className="text-brand-red text-[11px]">
            {t.weaveAi.limitReached ?? "Monthly AI message limit reached."}{" "}
            <button
              onClick={() => props.router.push(`/${props.orgId}/settings/plans`)}
              className="hover:text-brand-orange underline"
            >
              {t.weaveAi.viewPlans ?? "View plans"}
            </button>
          </p>
        )}
        {props.fileError ? <p className="text-brand-red text-[11px]">{props.fileError}</p> : null}
        {props.error ? <p className="text-brand-red text-[11px]">{props.error}</p> : null}
      </div>
    </div>
  );
}
