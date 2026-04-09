"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Bot,
  Settings2,
  Sparkles,
  Upload,
  FileText,
  Trash2,
  BrainCircuit,
  Globe,
  Code2,
  Image as ImageIcon,
  Save,
  X,
  Loader2,
} from "lucide-react";
import { useAgent } from "@/app/_contexts/agent-context";
import { Agent, CreateAgentData } from "@/app/_services/ai-agent-service/agent-service";

const AI_MODELS = [
  { id: "gemini-1.5-flash", name: "Gemini 1.5 Flash", provider: "Google", providerId: "gemini" },
  { id: "gemini-1.5-pro", name: "Gemini 1.5 Pro", provider: "Google", providerId: "gemini" },
  {
    id: "sonar-pro",
    name: "Perplexity Sonar Pro",
    provider: "Perplexity",
    providerId: "perplexity",
  },
];

const CAPABILITIES = [
  {
    id: "web_search",
    label: "Web Search",
    icon: Globe,
    description: "Internet access for current info.",
  },
  {
    id: "code_interpreter",
    label: "Code Interpreter",
    icon: Code2,
    description: "Execute Python code and analysis.",
  },
  {
    id: "image_generation",
    label: "Image Generation",
    icon: ImageIcon,
    description: "Generate images from text.",
  },
];

interface AgentFormProps {
  initialData?: Agent;
  isEditing?: boolean;
}

export function AgentForm({ initialData, isEditing = false }: AgentFormProps) {
  const router = useRouter();
  const { createAgent, updateAgent } = useAgent();
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState(initialData?.name || "");
  const [description, setDescription] = useState(initialData?.description || "");
  const [role, setRole] = useState(initialData?.role || "assistant");
  const [tone, setTone] = useState(initialData?.tone || "professional");
  const [language, setLanguage] = useState(initialData?.language || "pt-BR");
  const [tags, setTags] = useState(initialData?.tags?.join(", ") || "");
  const [instructions, setInstructions] = useState(initialData?.instructions || "");
  const [modelId, setModelId] = useState(initialData?.model_name || "gemini-1.5-flash");
  const initialTools: string[] = initialData?.tools ?? [];
  const [selectedTools, setSelectedTools] = useState<string[]>(initialTools);

  const [files, setFiles] = useState<File[]>([]);
  const [existingFiles, setExistingFiles] = useState<{ name: string; url: string }[]>(
    initialData?.knowledge_files?.map((f) => ({ name: f.original_name, url: f.url })) || []
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFiles((prev) => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const handleSave = async () => {
    if (!name || !description || !instructions) {
      alert("Please fill in all required fields");
      return;
    }

    setLoading(true);
    try {
      const selectedModel = AI_MODELS.find((m) => m.id === modelId);
      const data: CreateAgentData = {
        name,
        description,
        instructions,
        role,
        tone,
        language,
        tags: tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
        model_name: modelId,
        model_provider: selectedModel?.providerId || "gemini",
        tools: selectedTools,
        knowledge_files: files,
      };

      if (isEditing && initialData?.id) {
        await updateAgent(initialData.id, data);
        router.refresh();
        return;
      } else {
        const newAgent = await createAgent(data);
        router.push(`/app/weave-ai/agent/${newAgent.id}`);
      }
    } catch (error) {
      console.error("Error saving agent:", error);
      alert("Failed to save agent");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    if (isEditing && initialData?.id) {
      router.push(`/app/weave-ai/agent/${initialData.id}`);
      return;
    }

    router.push("/app/weave-ai/agent");
  };

  return (
    <div className="flex h-full flex-col bg-white dark:bg-neutral-950">
      <div className="custom-scrollbar flex-1 overflow-y-auto px-2 py-1">
        <div className="mx-auto w-full max-w-4xl space-y-1.5">
          <div className="flex items-center justify-between rounded-sm border border-l-2 border-neutral-200 border-yellow-500/80 bg-neutral-50 px-2 py-1.5 text-[10px] dark:border-neutral-800 dark:bg-neutral-900">
            <div className="flex flex-col">
              <h1 className="text-[11px] font-semibold tracking-[0.3em] text-neutral-800 dark:text-neutral-100">
                {isEditing ? "Edit Agent" : "New Agent"}
              </h1>
              <p className="text-[9px] text-neutral-500">Configure assistant identity and logic.</p>
            </div>
            <div className="flex gap-1">
              <button
                onClick={handleCancel}
                className="inline-flex h-5 items-center justify-center rounded-sm border border-neutral-200 bg-white px-2 text-[9px] font-medium text-neutral-600 hover:text-yellow-600 dark:border-neutral-800 dark:bg-neutral-950"
              >
                <X className="mr-1 h-3 w-3" />
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={loading}
                className="inline-flex h-5 items-center justify-center rounded-sm border border-yellow-500 bg-brand-primary-700/95 px-2 text-[9px] font-semibold text-neutral-900 disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                ) : (
                  <Save className="mr-1 h-3 w-3" />
                )}
                {isEditing ? "Update" : "Save"}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-1.5 lg:grid-cols-12">
            {/* Left: Identity & Core Logic */}
            <div className="space-y-1.5 lg:col-span-7">
              {/* Identity Section */}
              <div className="rounded-sm border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-950">
                <div className="flex items-center gap-1 border-b border-neutral-100 px-2 py-1.5 text-[9px] font-semibold tracking-[0.3em] text-neutral-600 dark:border-neutral-800">
                  <Bot className="h-3 w-3 text-brand-primary-700" />
                  <span>Identity</span>
                </div>
                <div className="p-2">
                  <div className="flex items-center gap-2">
                    <button className="group relative flex h-9 w-9 shrink-0 items-center justify-center rounded-sm border border-dashed border-neutral-300 bg-neutral-50 text-neutral-500 transition hover:border-yellow-500 hover:text-yellow-600 dark:border-neutral-700 dark:bg-neutral-900">
                      <Sparkles className="h-3 w-3" />
                      <div className="absolute -right-1 -bottom-1 flex h-3 w-3 items-center justify-center rounded-full bg-brand-primary-700 text-[7px] font-bold text-neutral-900">
                        +
                      </div>
                    </button>
                    <div className="flex-1 space-y-1">
                      <div className="grid grid-cols-2 gap-1.5">
                        <div className="space-y-0.5">
                          <label className="text-[8px] font-semibold tracking-widest text-neutral-400">
                            Agent Name
                          </label>
                          <input
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="flex h-6 w-full rounded-sm border border-neutral-200 bg-neutral-50 px-1.5 text-[10px] focus:border-yellow-500 focus:bg-white focus:outline-none dark:border-neutral-800 dark:bg-neutral-900"
                            placeholder="Data Analyst..."
                          />
                        </div>
                        <div className="space-y-0.5">
                          <label className="text-[8px] font-semibold tracking-widest text-neutral-400">
                            Short Description
                          </label>
                          <input
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="flex h-6 w-full rounded-sm border border-neutral-200 bg-neutral-50 px-1.5 text-[10px] focus:border-yellow-500 focus:bg-white focus:outline-none dark:border-neutral-800 dark:bg-neutral-900"
                            placeholder="Help with stats..."
                          />
                        </div>
                        <div className="space-y-0.5">
                          <label className="text-[8px] font-semibold tracking-widest text-neutral-400">
                            Role
                          </label>
                          <input
                            value={role}
                            onChange={(e) => setRole(e.target.value)}
                            className="flex h-6 w-full rounded-sm border border-neutral-200 bg-neutral-50 px-1.5 text-[10px] focus:border-yellow-500 focus:bg-white focus:outline-none dark:border-neutral-800 dark:bg-neutral-900"
                            placeholder="Assistant, Coding Expert..."
                          />
                        </div>
                        <div className="space-y-0.5">
                          <label className="text-[8px] font-semibold tracking-widest text-neutral-400">
                            Tone
                          </label>
                          <input
                            value={tone}
                            onChange={(e) => setTone(e.target.value)}
                            className="flex h-6 w-full rounded-sm border border-neutral-200 bg-neutral-50 px-1.5 text-[10px] focus:border-yellow-500 focus:bg-white focus:outline-none dark:border-neutral-800 dark:bg-neutral-900"
                            placeholder="Professional, Friendly..."
                          />
                        </div>
                        <div className="space-y-0.5">
                          <label className="text-[8px] font-semibold tracking-widest text-neutral-400">
                            Language
                          </label>
                          <input
                            value={language}
                            onChange={(e) => setLanguage(e.target.value)}
                            className="flex h-6 w-full rounded-sm border border-neutral-200 bg-neutral-50 px-1.5 text-[10px] focus:border-yellow-500 focus:bg-white focus:outline-none dark:border-neutral-800 dark:bg-neutral-900"
                            placeholder="pt-BR, en-US..."
                          />
                        </div>
                        <div className="space-y-0.5">
                          <label className="text-[8px] font-semibold tracking-widest text-neutral-400">
                            Tags (comma separated)
                          </label>
                          <input
                            value={tags}
                            onChange={(e) => setTags(e.target.value)}
                            className="flex h-6 w-full rounded-sm border border-neutral-200 bg-neutral-50 px-1.5 text-[10px] focus:border-yellow-500 focus:bg-white focus:outline-none dark:border-neutral-800 dark:bg-neutral-900"
                            placeholder="stats, data, python..."
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Instructions Section */}
              <div className="flex flex-col rounded-sm border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-950">
                <div className="flex items-center gap-1 border-b border-neutral-100 px-2 py-1.5 text-[9px] font-semibold tracking-[0.3em] text-neutral-600 dark:border-neutral-800">
                  <Settings2 className="h-3 w-3 text-brand-primary-700" />
                  <span>Instructions</span>
                </div>
                <div className="relative">
                  <textarea
                    value={instructions}
                    onChange={(e) => setInstructions(e.target.value)}
                    className="min-h-[180px] w-full resize-none bg-transparent px-2 py-1.5 text-[10px] leading-relaxed text-neutral-800 placeholder:text-neutral-400 focus:outline-none dark:text-neutral-200"
                    placeholder="Define personality, tone, and specific constraints..."
                  ></textarea>
                  <div className="flex items-center justify-between border-t border-neutral-100 bg-neutral-50 px-2 py-1 text-[9px] text-neutral-400 dark:border-neutral-800 dark:bg-neutral-900/50">
                    <span>Markdown supported</span>
                    <span className="font-mono">{instructions.length} / 4000</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Model & Knowledge */}
            <div className="space-y-1.5 lg:col-span-5">
              {/* Model Config */}
              <div className="rounded-sm border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-950">
                <div className="flex items-center gap-1 border-b border-neutral-100 px-2 py-1.5 text-[9px] font-semibold tracking-[0.3em] text-neutral-600 dark:border-neutral-800">
                  <BrainCircuit className="h-3 w-3 text-brand-primary-700" />
                  <span>Model</span>
                </div>
                <div className="space-y-1.5 p-2">
                  <div className="space-y-0.5">
                    <label className="text-[8px] font-semibold tracking-widest text-neutral-400">
                      Inference Engine
                    </label>
                    <select
                      value={modelId}
                      onChange={(e) => setModelId(e.target.value)}
                      className="flex h-6 w-full rounded-sm border border-neutral-200 bg-neutral-50 px-1.5 text-[10px] focus:border-yellow-500 focus:outline-none dark:border-neutral-800 dark:bg-neutral-900"
                    >
                      {AI_MODELS.map((model) => (
                        <option key={model.id} value={model.id}>
                          {model.name} — {model.provider}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-0.5 pt-1">
                    <label className="text-[8px] font-semibold tracking-widest text-neutral-400">
                      Capabilities
                    </label>
                    <div className="space-y-0.5">
                      {CAPABILITIES.map((cap) => (
                        <label
                          key={cap.id}
                          className="flex cursor-pointer items-center gap-2 rounded-sm border border-neutral-200 bg-neutral-50/70 px-2 py-1 text-[10px] transition hover:border-yellow-500 hover:bg-yellow-50 dark:border-neutral-800 dark:bg-neutral-900"
                        >
                          <input
                            type="checkbox"
                            checked={selectedTools.includes(cap.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedTools((prev) => [...prev, cap.id]);
                              } else {
                                setSelectedTools((prev) => prev.filter((id) => id !== cap.id));
                              }
                            }}
                            className="h-3 w-3 rounded border-neutral-300 text-brand-primary-700 focus:ring-0 dark:border-neutral-700 dark:bg-neutral-950"
                          />
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <cap.icon className="h-3 w-3 text-brand-primary-700" />
                              <span className="text-[10px] font-medium text-neutral-700 dark:text-neutral-300">
                                {cap.label}
                              </span>
                            </div>
                            <p className="truncate text-[9px] text-neutral-400">
                              {cap.description}
                            </p>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Knowledge Base */}
              <div className="rounded-sm border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-950">
                <div className="flex items-center justify-between border-b border-neutral-100 px-2 py-1.5 text-[9px] font-semibold tracking-[0.3em] text-neutral-600 dark:border-neutral-800">
                  <div className="flex items-center gap-2">
                    <FileText className="h-3 w-3 text-brand-primary-700" />
                    Knowledge
                  </div>
                  <span className="text-[9px] font-bold text-neutral-400">
                    {files.length + existingFiles.length} ITEMS
                  </span>
                </div>

                <div className="space-y-1.5 p-2">
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="group flex cursor-pointer flex-col items-center justify-center rounded-sm border border-dashed border-yellow-500/40 bg-yellow-50/40 py-2 text-[10px] text-neutral-600 transition hover:border-yellow-500 hover:text-neutral-900 dark:border-yellow-500/60 dark:bg-neutral-900"
                  >
                    <Upload className="mb-1 h-3 w-3 text-brand-primary-700" />
                    <span className="font-medium">Add files</span>
                    <input
                      type="file"
                      multiple
                      className="hidden"
                      ref={fileInputRef}
                      onChange={handleFileChange}
                    />
                  </div>

                  {existingFiles.length > 0 && (
                    <div className="custom-scrollbar max-h-[120px] space-y-0.5 overflow-y-auto pr-1">
                      {existingFiles.map((file, i) => (
                        <div
                          key={`existing-${i}`}
                          className="flex items-center justify-between rounded-sm border border-neutral-200 bg-white px-2 py-1 text-[10px] dark:border-neutral-800 dark:bg-neutral-950"
                        >
                          <div className="flex items-center gap-2 truncate">
                            <FileText className="h-3 w-3 text-brand-primary-700" />
                            <a
                              href={file.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="truncate font-medium text-neutral-600 hover:underline dark:text-neutral-300"
                            >
                              {file.name}
                            </a>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {files.length > 0 && (
                    <div className="custom-scrollbar max-h-[120px] space-y-0.5 overflow-y-auto pr-1">
                      {files.map((file, i) => (
                        <div
                          key={i}
                          className="group flex items-center justify-between rounded-sm border border-neutral-200 bg-white px-2 py-1 text-[10px] dark:border-neutral-800 dark:bg-neutral-950"
                        >
                          <div className="flex items-center gap-2 truncate">
                            <FileText className="h-3 w-3 text-brand-primary-700" />
                            <span className="truncate font-medium text-neutral-600 dark:text-neutral-300">
                              {file.name}
                            </span>
                          </div>
                          <button
                            onClick={() =>
                              setFiles((prev) => prev.filter((_, index) => index !== i))
                            }
                            className="text-neutral-400 opacity-0 transition-all group-hover:opacity-100 hover:text-red-500"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
