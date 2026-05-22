"use client";

import React, { useCallback, useRef, useState } from "react";
import type { Editor } from "@tiptap/react";
import type { ChainedCommands, Range } from "@tiptap/core";
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Code,
  Link2,
  Highlighter,
  Heading1,
  Heading2,
  Heading3,
  Heading4,
  List,
  ListOrdered,
  Quote,
  CheckSquare,
  X,
  Minus,
  Image as ImageIcon,
  FileCode,
  Upload,
  Loader2,
  Video,
} from "lucide-react";
import clsx from "clsx";
import { toast } from "sonner";
import { CODE_BLOCK_LANGUAGE_OPTIONS } from "./rich-editor-code-languages";
import { getRichEditorImageUploader } from "./rich-editor-bridge";

const INLINE_IMAGE_MAX_BYTES = 5 * 1024 * 1024;
const INLINE_IMAGE_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "image/gif",
]);

const INLINE_VIDEO_MAX_BYTES = 25 * 1024 * 1024;
const INLINE_VIDEO_TYPES = new Set(["video/mp4", "video/webm", "video/quicktime", "video/ogg"]);

export interface RichEditorFormatToolbarProps {
  editor: Editor;
  variant: "bubble" | "slash" | "floating";
  /** When set (slash suggestion), `deleteRange` runs before each action */
  slashRange?: Range | null;
  /** Tighter layout for floating menu or narrow slash popup */
  density?: "default" | "compact";
  /** Called after a toolbar action (e.g. close slash suggestion) */
  onAfterAction?: () => void;
}

interface MenuButtonProps {
  onClick: () => void;
  isActive?: boolean;
  disabled?: boolean;
  title: string;
  children: React.ReactNode;
  compact?: boolean;
}

export function MenuButton({
  onClick,
  isActive,
  disabled,
  title,
  children,
  compact,
}: MenuButtonProps) {
  return (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={clsx(
        "flex items-center justify-center rounded-md transition-colors",
        compact ? "h-7 w-7" : "h-8 w-8",
        "hover:bg-neutral-100 dark:hover:bg-neutral-700",
        "disabled:cursor-not-allowed disabled:opacity-50",
        isActive && "bg-neutral-200 text-neutral-900 dark:bg-neutral-600 dark:text-white"
      )}
    >
      {children}
    </button>
  );
}

export function ToolbarDivider({ compact }: { compact?: boolean }) {
  return (
    <div
      className={clsx(
        "mx-0.5 bg-neutral-300 dark:bg-neutral-600",
        compact ? "h-4 w-px" : "h-5 w-px"
      )}
    />
  );
}

export function RichEditorFormatToolbar({
  editor,
  variant,
  slashRange,
  density = "default",
  onAfterAction,
}: RichEditorFormatToolbarProps) {
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [imageUploading, setImageUploading] = useState(false);
  const [videoUploading, setVideoUploading] = useState(false);
  const imageFileInputRef = useRef<HTMLInputElement>(null);
  const videoFileInputRef = useRef<HTMLInputElement>(null);
  const uploadDocumentImages = getRichEditorImageUploader(editor);

  const compact = density === "compact" || variant === "floating";

  const runChain = useCallback(
    (build: (chain: ChainedCommands) => ChainedCommands) => {
      let chain = editor.chain().focus();
      if (slashRange) {
        chain = chain.deleteRange(slashRange);
      }
      build(chain).run();
      onAfterAction?.();
    },
    [editor, slashRange, onAfterAction]
  );

  const setLink = useCallback(() => {
    if (!linkUrl.trim()) {
      setShowLinkInput(false);
      setLinkUrl("");
      return;
    }
    const url = linkUrl.startsWith("http") ? linkUrl : `https://${linkUrl}`;
    let chain = editor.chain().focus();
    if (slashRange) {
      chain = chain.deleteRange(slashRange);
    } else if (!editor.state.selection.empty) {
      chain = chain.extendMarkRange("link");
    }
    chain.setLink({ href: url }).run();
    onAfterAction?.();
    setShowLinkInput(false);
    setLinkUrl("");
  }, [editor, linkUrl, onAfterAction, slashRange]);

  const removeLink = useCallback(() => {
    runChain((c) => c.unsetLink());
    setShowLinkInput(false);
    setLinkUrl("");
  }, [runChain]);

  const openLinkInput = useCallback(() => {
    const previousUrl = editor.getAttributes("link").href || "";
    setLinkUrl(previousUrl);
    setShowLinkInput(true);
  }, [editor]);

  const insertImageUrls = useCallback(
    (urls: string[]) => {
      if (urls.length === 0) return;
      let chain = editor.chain().focus();
      if (slashRange) {
        chain = chain.deleteRange(slashRange);
      }
      for (const src of urls) {
        chain = chain.setImage({ src });
      }
      chain.run();
      onAfterAction?.();
    },
    [editor, onAfterAction, slashRange]
  );

  const insertVideoUrls = useCallback(
    (urls: string[]) => {
      if (urls.length === 0) return;
      let chain = editor.chain().focus();
      if (slashRange) {
        chain = chain.deleteRange(slashRange);
      }
      for (const src of urls) {
        chain = chain.insertContent({ type: "video", attrs: { src } });
      }
      chain.run();
      onAfterAction?.();
    },
    [editor, onAfterAction, slashRange]
  );

  const validateImageFiles = useCallback((files: File[]) => {
    for (const file of files) {
      if (!INLINE_IMAGE_TYPES.has(file.type)) {
        toast.error(`Formato não permitido: ${file.name}. Use PNG, JPEG, WEBP ou GIF.`);
        return false;
      }
      if (file.size > INLINE_IMAGE_MAX_BYTES) {
        toast.error(`Ficheiro demasiado grande: ${file.name} (máximo 5 MB).`);
        return false;
      }
    }
    return true;
  }, []);

  const handleImageFilesSelected = useCallback(
    async (fileList: FileList | null) => {
      if (!fileList?.length) return;
      const files = Array.from(fileList);
      if (!validateImageFiles(files)) {
        if (imageFileInputRef.current) imageFileInputRef.current.value = "";
        return;
      }
      if (!uploadDocumentImages) {
        toast.error("Upload de imagens não disponível.");
        if (imageFileInputRef.current) imageFileInputRef.current.value = "";
        return;
      }
      setImageUploading(true);
      try {
        const urls = await uploadDocumentImages(files);
        insertImageUrls(urls);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Não foi possível enviar a imagem.");
      } finally {
        setImageUploading(false);
        if (imageFileInputRef.current) imageFileInputRef.current.value = "";
      }
    },
    [insertImageUrls, uploadDocumentImages, validateImageFiles]
  );

  const validateVideoFiles = useCallback((files: File[]) => {
    for (const file of files) {
      if (!INLINE_VIDEO_TYPES.has(file.type)) {
        toast.error(`Formato de vídeo não permitido: ${file.name}. Use MP4, WebM, MOV ou OGG.`);
        return false;
      }
      if (file.size > INLINE_VIDEO_MAX_BYTES) {
        toast.error(`Vídeo demasiado grande: ${file.name} (máximo 25 MB).`);
        return false;
      }
    }
    return true;
  }, []);

  const handleVideoFilesSelected = useCallback(
    async (fileList: FileList | null) => {
      if (!fileList?.length) return;
      const files = Array.from(fileList);
      if (!validateVideoFiles(files)) {
        if (videoFileInputRef.current) videoFileInputRef.current.value = "";
        return;
      }
      if (!uploadDocumentImages) {
        toast.error("Upload de vídeos não disponível.");
        if (videoFileInputRef.current) videoFileInputRef.current.value = "";
        return;
      }
      setVideoUploading(true);
      try {
        const urls = await uploadDocumentImages(files);
        insertVideoUrls(urls);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Não foi possível enviar o vídeo.");
      } finally {
        setVideoUploading(false);
        if (videoFileInputRef.current) videoFileInputRef.current.value = "";
      }
    },
    [insertVideoUrls, uploadDocumentImages, validateVideoFiles]
  );

  const barClass = clsx(
    "rounded-lg border border-neutral-200 bg-white shadow-lg dark:border-surface-dark-border-strong dark:bg-neutral-800",
    variant === "slash" &&
      "max-w-[min(100vw-1rem,42rem)] flex flex-wrap items-center gap-0.5 px-1 py-1",
    variant !== "slash" && "flex items-center gap-0.5 px-1.5 py-1",
    compact && variant !== "slash" && "gap-0 px-1 py-0.5"
  );

  if (showLinkInput) {
    return (
      <div className={clsx(barClass, "gap-1 px-2 py-1.5")} onMouseDown={(e) => e.preventDefault()}>
        <input
          type="text"
          value={linkUrl}
          onChange={(e) => setLinkUrl(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              setLink();
            }
            if (e.key === "Escape") {
              setShowLinkInput(false);
              setLinkUrl("");
            }
          }}
          placeholder="https://..."
          autoFocus
          className="dark:border-surface-dark-border-muted h-7 min-w-0 flex-1 rounded border border-neutral-300 bg-transparent px-2 text-sm outline-none focus:border-yellow-500"
        />
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={setLink}
          className="flex h-7 shrink-0 items-center justify-center rounded bg-yellow-500 px-2 text-xs font-medium text-black hover:bg-yellow-400"
        >
          Aplicar
        </button>
        {editor.isActive("link") && (
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={removeLink}
            title="Remover link"
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10"
          >
            <X size={14} />
          </button>
        )}
      </div>
    );
  }

  const iconSize = compact ? 15 : 16;
  const codeBlockLanguage =
    (editor.getAttributes("codeBlock").language as string | undefined) || "plaintext";
  const codeLanguageSelectOptions = CODE_BLOCK_LANGUAGE_OPTIONS.some(
    (o) => o.value === codeBlockLanguage
  )
    ? CODE_BLOCK_LANGUAGE_OPTIONS
    : [{ value: codeBlockLanguage, label: codeBlockLanguage }, ...CODE_BLOCK_LANGUAGE_OPTIONS];

  return (
    <div className={barClass} onMouseDown={(e) => e.preventDefault()}>
      <MenuButton
        compact={compact}
        onClick={() => runChain((c) => c.toggleBold())}
        isActive={editor.isActive("bold")}
        title="Negrito (Ctrl+B)"
      >
        <Bold size={iconSize} />
      </MenuButton>

      <MenuButton
        compact={compact}
        onClick={() => runChain((c) => c.toggleItalic())}
        isActive={editor.isActive("italic")}
        title="Itálico (Ctrl+I)"
      >
        <Italic size={iconSize} />
      </MenuButton>

      <MenuButton
        compact={compact}
        onClick={() => runChain((c) => c.toggleUnderline())}
        isActive={editor.isActive("underline")}
        title="Sublinhado (Ctrl+U)"
      >
        <Underline size={iconSize} />
      </MenuButton>

      <MenuButton
        compact={compact}
        onClick={() => runChain((c) => c.toggleStrike())}
        isActive={editor.isActive("strike")}
        title="Riscado"
      >
        <Strikethrough size={iconSize} />
      </MenuButton>

      <MenuButton
        compact={compact}
        onClick={() => runChain((c) => c.toggleCode())}
        isActive={editor.isActive("code")}
        title="Código inline"
      >
        <Code size={iconSize} />
      </MenuButton>

      <MenuButton
        compact={compact}
        onClick={() => runChain((c) => c.toggleHighlight())}
        isActive={editor.isActive("highlight")}
        title="Destaque"
      >
        <Highlighter size={iconSize} />
      </MenuButton>

      <MenuButton
        compact={compact}
        onClick={() => openLinkInput()}
        isActive={editor.isActive("link")}
        title="Link (Ctrl+K)"
      >
        <Link2 size={iconSize} />
      </MenuButton>

      <ToolbarDivider compact={compact} />

      <MenuButton
        compact={compact}
        onClick={() => runChain((c) => c.toggleHeading({ level: 1 }))}
        isActive={editor.isActive("heading", { level: 1 })}
        title="Título 1"
      >
        <Heading1 size={iconSize} />
      </MenuButton>

      <MenuButton
        compact={compact}
        onClick={() => runChain((c) => c.toggleHeading({ level: 2 }))}
        isActive={editor.isActive("heading", { level: 2 })}
        title="Título 2"
      >
        <Heading2 size={iconSize} />
      </MenuButton>

      <MenuButton
        compact={compact}
        onClick={() => runChain((c) => c.toggleHeading({ level: 3 }))}
        isActive={editor.isActive("heading", { level: 3 })}
        title="Título 3"
      >
        <Heading3 size={iconSize} />
      </MenuButton>

      <MenuButton
        compact={compact}
        onClick={() => runChain((c) => c.toggleHeading({ level: 4 }))}
        isActive={editor.isActive("heading", { level: 4 })}
        title="Título 4"
      >
        <Heading4 size={iconSize} />
      </MenuButton>

      <ToolbarDivider compact={compact} />

      <MenuButton
        compact={compact}
        onClick={() => runChain((c) => c.toggleBulletList())}
        isActive={editor.isActive("bulletList")}
        title="Lista"
      >
        <List size={iconSize} />
      </MenuButton>

      <MenuButton
        compact={compact}
        onClick={() => runChain((c) => c.toggleOrderedList())}
        isActive={editor.isActive("orderedList")}
        title="Lista numerada"
      >
        <ListOrdered size={iconSize} />
      </MenuButton>

      <MenuButton
        compact={compact}
        onClick={() => runChain((c) => c.toggleTaskList())}
        isActive={editor.isActive("taskList")}
        title="Lista de tarefas"
      >
        <CheckSquare size={iconSize} />
      </MenuButton>

      <MenuButton
        compact={compact}
        onClick={() => runChain((c) => c.toggleBlockquote())}
        isActive={editor.isActive("blockquote")}
        title="Citação"
      >
        <Quote size={iconSize} />
      </MenuButton>

      <ToolbarDivider compact={compact} />

      <MenuButton
        compact={compact}
        onClick={() => runChain((c) => c.toggleCodeBlock())}
        isActive={editor.isActive("codeBlock")}
        title="Bloco de código"
      >
        <FileCode size={iconSize} />
      </MenuButton>

      {editor.isActive("codeBlock") && (
        <select
          value={codeBlockLanguage}
          onMouseDown={(e) => e.preventDefault()}
          onChange={(e) => {
            const language = e.target.value;
            editor.chain().focus().updateAttributes("codeBlock", { language }).run();
          }}
          title="Linguagem do código"
          aria-label="Linguagem do código"
          className={clsx(
            "dark:border-surface-dark-border-muted shrink-0 cursor-pointer rounded-md border border-neutral-300 bg-white px-1 text-xs text-neutral-800 outline-none dark:bg-[#1d1d1b] dark:text-neutral-100",
            compact ? "h-7 max-w-[6.5rem]" : "h-8 max-w-[9rem]"
          )}
        >
          {codeLanguageSelectOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      )}

      <MenuButton
        compact={compact}
        onClick={() => runChain((c) => c.setHorizontalRule())}
        isActive={false}
        title="Divisor"
      >
        <Minus size={iconSize} />
      </MenuButton>

      <input
        ref={imageFileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/jpg,image/webp,image/gif"
        multiple
        className="sr-only"
        tabIndex={-1}
        onChange={(e) => void handleImageFilesSelected(e.target.files)}
      />

      <MenuButton
        compact={compact}
        disabled={imageUploading || !uploadDocumentImages}
        onClick={() => imageFileInputRef.current?.click()}
        isActive={false}
        title={
          uploadDocumentImages ? "Carregar imagem do computador" : "Carregar imagem (indisponível)"
        }
      >
        {imageUploading ? (
          <Loader2 size={iconSize} className="animate-spin" />
        ) : (
          <Upload size={iconSize} />
        )}
      </MenuButton>

      <MenuButton
        compact={compact}
        onClick={() => {
          const raw =
            typeof window !== "undefined" ? window.prompt("URL da imagem (https://…):") : null;
          const trimmed = raw?.trim();
          if (!trimmed) return;
          const src = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
          insertImageUrls([src]);
        }}
        isActive={false}
        title="Imagem por URL"
      >
        <ImageIcon size={iconSize} />
      </MenuButton>

      <input
        ref={videoFileInputRef}
        type="file"
        accept="video/mp4,video/webm,video/quicktime,video/ogg"
        multiple
        className="sr-only"
        tabIndex={-1}
        onChange={(e) => void handleVideoFilesSelected(e.target.files)}
      />

      <MenuButton
        compact={compact}
        disabled={videoUploading || !uploadDocumentImages}
        onClick={() => videoFileInputRef.current?.click()}
        isActive={false}
        title={
          uploadDocumentImages ? "Carregar vídeo (máx. 25 MB)" : "Carregar vídeo (indisponível)"
        }
      >
        {videoUploading ? (
          <Loader2 size={iconSize} className="animate-spin" />
        ) : (
          <Video size={iconSize} />
        )}
      </MenuButton>
    </div>
  );
}
