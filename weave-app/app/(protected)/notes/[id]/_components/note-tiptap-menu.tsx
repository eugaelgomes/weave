"use client";

import React, { useCallback, useState } from "react";
import type { Editor } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
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
  List,
  ListOrdered,
  Quote,
  CheckSquare,
  X,
} from "lucide-react";
import clsx from "clsx";

interface NoteTiptapBubbleMenuProps {
  editor: Editor;
}

interface MenuButtonProps {
  onClick: () => void;
  isActive?: boolean;
  disabled?: boolean;
  title: string;
  children: React.ReactNode;
}

function MenuButton({ onClick, isActive, disabled, title, children }: MenuButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={clsx(
        "flex h-8 w-8 items-center justify-center rounded-md transition-colors",
        "hover:bg-neutral-100 dark:hover:bg-neutral-700",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        isActive && "bg-neutral-200 dark:bg-neutral-600 text-neutral-900 dark:text-white"
      )}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <div className="h-5 w-px bg-neutral-300 dark:bg-neutral-600 mx-0.5" />;
}

export function NoteTiptapBubbleMenu({ editor }: NoteTiptapBubbleMenuProps) {
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");

  const setLink = useCallback(() => {
    if (linkUrl.trim()) {
      const url = linkUrl.startsWith("http") ? linkUrl : `https://${linkUrl}`;
      editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
    }
    setShowLinkInput(false);
    setLinkUrl("");
  }, [editor, linkUrl]);

  const removeLink = useCallback(() => {
    editor.chain().focus().unsetLink().run();
    setShowLinkInput(false);
    setLinkUrl("");
  }, [editor]);

  const openLinkInput = useCallback(() => {
    const previousUrl = editor.getAttributes("link").href || "";
    setLinkUrl(previousUrl);
    setShowLinkInput(true);
  }, [editor]);

  if (showLinkInput) {
    return (
      <BubbleMenu
        editor={editor}
        options={{ placement: "top", offset: 8 }}
        className="flex items-center gap-1 rounded-lg border border-neutral-200 bg-white px-2 py-1.5 shadow-lg dark:border-neutral-700 dark:bg-neutral-800"
      >
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
          className="h-7 w-48 rounded border border-neutral-300 bg-transparent px-2 text-sm outline-none focus:border-yellow-500 dark:border-neutral-600"
        />
        <button
          type="button"
          onClick={setLink}
          className="flex h-7 items-center justify-center rounded bg-yellow-500 px-2 text-xs font-medium text-black hover:bg-yellow-400"
        >
          Aplicar
        </button>
        {editor.isActive("link") && (
          <button
            type="button"
            onClick={removeLink}
            title="Remover link"
            className="flex h-7 w-7 items-center justify-center rounded text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10"
          >
            <X size={14} />
          </button>
        )}
      </BubbleMenu>
    );
  }

  return (
    <BubbleMenu
      editor={editor}
      options={{ placement: "top", offset: 8 }}
      className="flex items-center gap-0.5 rounded-lg border border-neutral-200 bg-white px-1.5 py-1 shadow-lg dark:border-neutral-700 dark:bg-neutral-800"
    >
      <MenuButton
        onClick={() => editor.chain().focus().toggleBold().run()}
        isActive={editor.isActive("bold")}
        title="Negrito (Ctrl+B)"
      >
        <Bold size={16} />
      </MenuButton>
      
      <MenuButton
        onClick={() => editor.chain().focus().toggleItalic().run()}
        isActive={editor.isActive("italic")}
        title="Itálico (Ctrl+I)"
      >
        <Italic size={16} />
      </MenuButton>

      <MenuButton
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        isActive={editor.isActive("underline")}
        title="Sublinhado (Ctrl+U)"
      >
        <Underline size={16} />
      </MenuButton>

      <MenuButton
        onClick={() => editor.chain().focus().toggleStrike().run()}
        isActive={editor.isActive("strike")}
        title="Riscado"
      >
        <Strikethrough size={16} />
      </MenuButton>

      <MenuButton
        onClick={() => editor.chain().focus().toggleCode().run()}
        isActive={editor.isActive("code")}
        title="Código inline"
      >
        <Code size={16} />
      </MenuButton>

      <MenuButton
        onClick={() => editor.chain().focus().toggleHighlight().run()}
        isActive={editor.isActive("highlight")}
        title="Destaque"
      >
        <Highlighter size={16} />
      </MenuButton>

      <MenuButton
        onClick={openLinkInput}
        isActive={editor.isActive("link")}
        title="Link (Ctrl+K)"
      >
        <Link2 size={16} />
      </MenuButton>

      <Divider />

      <MenuButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        isActive={editor.isActive("heading", { level: 1 })}
        title="Título 1"
      >
        <Heading1 size={16} />
      </MenuButton>

      <MenuButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        isActive={editor.isActive("heading", { level: 2 })}
        title="Título 2"
      >
        <Heading2 size={16} />
      </MenuButton>

      <MenuButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        isActive={editor.isActive("heading", { level: 3 })}
        title="Título 3"
      >
        <Heading3 size={16} />
      </MenuButton>

      <Divider />

      <MenuButton
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        isActive={editor.isActive("bulletList")}
        title="Lista"
      >
        <List size={16} />
      </MenuButton>

      <MenuButton
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        isActive={editor.isActive("orderedList")}
        title="Lista numerada"
      >
        <ListOrdered size={16} />
      </MenuButton>

      <MenuButton
        onClick={() => editor.chain().focus().toggleTaskList().run()}
        isActive={editor.isActive("taskList")}
        title="Lista de tarefas"
      >
        <CheckSquare size={16} />
      </MenuButton>

      <MenuButton
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        isActive={editor.isActive("blockquote")}
        title="Citação"
      >
        <Quote size={16} />
      </MenuButton>
    </BubbleMenu>
  );
}
