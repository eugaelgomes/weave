"use client";

import { useState } from "react";
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
} from "lucide-react";

const AI_MODELS = [
  { id: "gpt-4-turbo", name: "GPT-4 Turbo", provider: "OpenAI" },
  { id: "gpt-3.5-turbo", name: "GPT-3.5 Turbo", provider: "OpenAI" },
  { id: "claude-3-opus", name: "Claude 3 Opus", provider: "Anthropic" },
  { id: "gemini-pro", name: "Gemini Pro", provider: "Google" },
];

const capabilities = [
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

export default function AgentPage() {
  const [files, setFiles] = useState<string[]>(["company_policy.pdf", "project_specs.docx"]);

  return (
    <div className="flex h-full flex-col bg-white dark:bg-black">
      <div className="custom-scrollbar flex-1 overflow-y-auto px-3 py-2">
        <div className="mx-auto w-full max-w-5xl space-y-2">
          {/* Action Bar - Compacta */}
          <div className="flex items-center justify-between rounded-lg border border-neutral-200 bg-neutral-50/50 px-2 py-1.5 dark:border-neutral-800 dark:bg-neutral-900/30">
            <div className="flex flex-col">
              <h1 className="text-xs font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
                New Agent
              </h1>
              <p className="text-[10px] text-neutral-500">
                Configure assistant identity and logic.
              </p>
            </div>
            <div className="flex gap-1.5">
              <button className="inline-flex h-6 items-center justify-center rounded-md border border-neutral-200 bg-white px-2 text-[10px] font-medium text-neutral-700 hover:bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-300 dark:hover:bg-neutral-900">
                <X className="mr-1 h-3 w-3" />
                Cancel
              </button>
              <button className="inline-flex h-6 items-center justify-center rounded-md bg-neutral-900 px-2 text-[10px] font-medium text-white hover:bg-neutral-800 dark:bg-neutral-50 dark:text-neutral-900 dark:hover:bg-neutral-200">
                <Save className="mr-1 h-3 w-3" />
                Save Agent
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-2 lg:grid-cols-12">
            {/* Left: Identity & Core Logic */}
            <div className="space-y-2 lg:col-span-7">
              {/* Identity Section */}
              <div className="rounded-lg border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-950">
                <div className="flex items-center gap-2 border-b border-neutral-100 p-2 px-3 dark:border-neutral-800">
                  <Bot className="h-3.5 w-3.5 text-neutral-500" />
                  <h3 className="text-[10px] font-semibold tracking-wider text-neutral-700 dark:text-neutral-300">
                    Identity
                  </h3>
                </div>
                <div className="p-2">
                  <div className="flex items-center gap-3">
                    <button className="group relative flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-dashed border-neutral-300 bg-neutral-50 transition-all hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-900">
                      <Sparkles className="h-3.5 w-3.5 text-neutral-400 group-hover:text-neutral-600" />
                      <div className="absolute -right-1 -bottom-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-neutral-900 text-[8px] text-white dark:bg-neutral-100 dark:text-neutral-900">
                        +
                      </div>
                    </button>
                    <div className="flex-1 space-y-1.5">
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-0.5">
                          <label className="text-[9px] font-bold text-neutral-400">
                            Agent Name
                          </label>
                          <input
                            className="flex h-7 w-full rounded-md border border-neutral-200 bg-neutral-50 px-2 text-[11px] transition-all focus:bg-white focus:ring-1 focus:ring-neutral-400 focus:outline-none dark:border-neutral-800 dark:bg-neutral-900 dark:focus:ring-neutral-700"
                            placeholder="Data Analyst..."
                          />
                        </div>
                        <div className="space-y-0.5">
                          <label className="text-[9px] font-bold text-neutral-400">
                            Short Description
                          </label>
                          <input
                            className="flex h-7 w-full rounded-md border border-neutral-200 bg-neutral-50 px-2 text-[11px] transition-all focus:bg-white focus:ring-1 focus:ring-neutral-400 focus:outline-none dark:border-neutral-800 dark:bg-neutral-900 dark:focus:ring-neutral-700"
                            placeholder="Help with stats..."
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Instructions Section */}
              <div className="flex flex-col rounded-lg border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-950">
                <div className="flex items-center gap-2 border-b border-neutral-100 p-2 px-3 dark:border-neutral-800">
                  <Settings2 className="h-3.5 w-3.5 text-neutral-500" />
                  <h3 className="text-[10px] font-semibold tracking-wider text-neutral-700 dark:text-neutral-300">
                    Instructions
                  </h3>
                </div>
                <div className="relative">
                  <textarea
                    className="min-h-[250px] w-full resize-none bg-transparent p-2 text-[11px] leading-relaxed text-neutral-800 placeholder:text-neutral-400 focus:outline-none dark:text-neutral-200"
                    placeholder="Define personality, tone, and specific constraints..."
                  ></textarea>
                  <div className="flex items-center justify-between border-t border-neutral-50 bg-neutral-50/50 p-1 px-3 text-[9px] text-neutral-400 dark:border-neutral-800 dark:bg-neutral-900/50">
                    <span>Markdown supported</span>
                    <span className="font-mono">0 / 4000</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Model & Knowledge */}
            <div className="space-y-2 lg:col-span-5">
              {/* Model Config */}
              <div className="rounded-lg border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-950">
                <div className="flex items-center gap-2 border-b border-neutral-100 p-2 px-3 dark:border-neutral-800">
                  <BrainCircuit className="h-3.5 w-3.5 text-neutral-500" />
                  <h3 className="text-[10px] font-semibold tracking-wider text-neutral-700 dark:text-neutral-300">
                    Model
                  </h3>
                </div>
                <div className="space-y-2 p-2">
                  <div className="space-y-0.5">
                    <label className="text-[9px] font-bold tracking-tight text-neutral-400">
                      Inference Engine
                    </label>
                    <select className="flex h-7 w-full rounded-md border border-neutral-200 bg-neutral-50 px-2 text-[11px] focus:outline-none dark:border-neutral-800 dark:bg-neutral-900">
                      {AI_MODELS.map((model) => (
                        <option key={model.id} value={model.id}>
                          {model.name} — {model.provider}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1 pt-1">
                    <label className="text-[9px] font-bold text-neutral-400">Capabilities</label>
                    <div className="space-y-0.5">
                      {capabilities.map((cap) => (
                        <label
                          key={cap.id}
                          className="flex cursor-pointer items-center gap-2 rounded-md border border-neutral-100 bg-neutral-50/50 p-1.5 transition-colors hover:bg-neutral-100 dark:border-neutral-800 dark:bg-neutral-900/30 dark:hover:bg-neutral-800/60"
                        >
                          <input
                            type="checkbox"
                            id={cap.id}
                            className="h-3 w-3 rounded border-neutral-300 text-neutral-900 focus:ring-0 dark:border-neutral-700 dark:bg-neutral-950"
                          />
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <cap.icon className="h-3 w-3 text-neutral-500" />
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
              <div className="rounded-lg border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-950">
                <div className="flex items-center justify-between border-b border-neutral-100 p-2 px-3 dark:border-neutral-800">
                  <div className="flex items-center gap-2">
                    <FileText className="h-3.5 w-3.5 text-neutral-500" />
                    <h3 className="text-[10px] font-semibold tracking-wider text-neutral-700 dark:text-neutral-300">
                      Knowledge
                    </h3>
                  </div>
                  <span className="text-[9px] font-bold text-neutral-400">
                    {files.length} ITEMS
                  </span>
                </div>

                <div className="space-y-1.5 p-2">
                  <div className="group flex cursor-pointer flex-col items-center justify-center rounded-md border border-dashed border-neutral-200 bg-neutral-50/50 py-3 transition-all hover:border-neutral-300 hover:bg-neutral-100 dark:border-neutral-800 dark:bg-neutral-900/30 dark:hover:bg-neutral-800/60">
                    <Upload className="mb-1 h-3 w-3 text-neutral-400 group-hover:text-neutral-600" />
                    <span className="text-[10px] font-medium text-neutral-600 dark:text-neutral-400">
                      Add files
                    </span>
                  </div>

                  {files.length > 0 && (
                    <div className="custom-scrollbar max-h-[140px] space-y-0.5 overflow-y-auto pr-1">
                      {files.map((file, i) => (
                        <div
                          key={i}
                          className="group flex items-center justify-between rounded-md border border-neutral-100 bg-white p-1 px-2 text-[10px] dark:border-neutral-800 dark:bg-neutral-950"
                        >
                          <div className="flex items-center gap-2 truncate">
                            <FileText className="h-3 w-3 text-blue-500" />
                            <span className="truncate font-medium text-neutral-600 dark:text-neutral-300">
                              {file}
                            </span>
                          </div>
                          <button
                            onClick={() => setFiles(files.filter((f) => f !== file))}
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
