"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { Extension } from "@tiptap/core";
import { ReactRenderer } from "@tiptap/react";
import { Suggestion, type SuggestionOptions, type SuggestionProps } from "@tiptap/suggestion";
import type { Editor, Range } from "@tiptap/core";
import tippy, { type Instance as TippyInstance } from "tippy.js";
import {
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  CheckSquare,
  Quote,
  Code,
  Minus,
  Image as ImageIcon,
  Type,
} from "lucide-react";

interface CommandItem {
  title: string;
  description: string;
  icon: React.ReactNode;
  command: (props: { editor: Editor; range: Range }) => void;
}

const COMMANDS: CommandItem[] = [
  {
    title: "Texto",
    description: "Parágrafo de texto simples",
    icon: <Type size={18} />,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setParagraph().run();
    },
  },
  {
    title: "Título 1",
    description: "Título grande",
    icon: <Heading1 size={18} />,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setHeading({ level: 1 }).run();
    },
  },
  {
    title: "Título 2",
    description: "Título médio",
    icon: <Heading2 size={18} />,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setHeading({ level: 2 }).run();
    },
  },
  {
    title: "Título 3",
    description: "Título pequeno",
    icon: <Heading3 size={18} />,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setHeading({ level: 3 }).run();
    },
  },
  {
    title: "Lista",
    description: "Lista com marcadores",
    icon: <List size={18} />,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleBulletList().run();
    },
  },
  {
    title: "Lista numerada",
    description: "Lista com números",
    icon: <ListOrdered size={18} />,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleOrderedList().run();
    },
  },
  {
    title: "Tarefas",
    description: "Lista de tarefas com checkbox",
    icon: <CheckSquare size={18} />,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleTaskList().run();
    },
  },
  {
    title: "Citação",
    description: "Bloco de citação",
    icon: <Quote size={18} />,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleBlockquote().run();
    },
  },
  {
    title: "Código",
    description: "Bloco de código",
    icon: <Code size={18} />,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleCodeBlock().run();
    },
  },
  {
    title: "Divisor",
    description: "Linha horizontal",
    icon: <Minus size={18} />,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setHorizontalRule().run();
    },
  },
  {
    title: "Imagem",
    description: "Inserir imagem por URL",
    icon: <ImageIcon size={18} />,
    command: ({ editor, range }) => {
      const url = window.prompt("URL da imagem:");
      if (url) {
        editor.chain().focus().deleteRange(range).setImage({ src: url }).run();
      }
    },
  },
];

interface CommandListProps {
  items: CommandItem[];
  command: (item: CommandItem) => void;
}

const CommandList = React.forwardRef<
  { onKeyDown: (props: { event: KeyboardEvent }) => boolean },
  CommandListProps
>(({ items, command }, ref) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectItem = useCallback(
    (index: number) => {
      const item = items[index];
      if (item) {
        command(item);
      }
    },
    [items, command]
  );

  useEffect(() => {
    setSelectedIndex(0);
  }, [items]);

  useEffect(() => {
    if (containerRef.current) {
      const selectedEl = containerRef.current.querySelector(`[data-index="${selectedIndex}"]`);
      if (selectedEl) {
        selectedEl.scrollIntoView({ block: "nearest" });
      }
    }
  }, [selectedIndex]);

  React.useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }: { event: KeyboardEvent }) => {
      if (event.key === "ArrowUp") {
        setSelectedIndex((prev) => (prev <= 0 ? items.length - 1 : prev - 1));
        return true;
      }
      if (event.key === "ArrowDown") {
        setSelectedIndex((prev) => (prev >= items.length - 1 ? 0 : prev + 1));
        return true;
      }
      if (event.key === "Enter") {
        selectItem(selectedIndex);
        return true;
      }
      return false;
    },
  }));

  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-neutral-200 bg-white p-3 text-sm text-neutral-500 shadow-lg dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-400">
        Nenhum comando encontrado
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="max-h-[300px] w-[280px] overflow-y-auto rounded-lg border border-neutral-200 bg-white py-1 shadow-lg dark:border-neutral-700 dark:bg-neutral-800"
    >
      {items.map((item, index) => (
        <button
          key={item.title}
          data-index={index}
          onClick={() => selectItem(index)}
          className={`flex w-full items-center gap-3 px-3 py-2 text-left transition-colors ${
            index === selectedIndex
              ? "bg-yellow-50 dark:bg-yellow-500/10"
              : "hover:bg-neutral-50 dark:hover:bg-neutral-700/50"
          }`}
        >
          <div
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md border ${
              index === selectedIndex
                ? "border-yellow-500 bg-yellow-100 text-yellow-700 dark:border-yellow-500/50 dark:bg-yellow-500/20 dark:text-yellow-400"
                : "border-neutral-200 bg-neutral-50 text-neutral-500 dark:border-neutral-600 dark:bg-neutral-700 dark:text-neutral-400"
            }`}
          >
            {item.icon}
          </div>
          <div className="min-w-0 flex-1">
            <div
              className={`text-sm font-medium ${
                index === selectedIndex
                  ? "text-yellow-700 dark:text-yellow-400"
                  : "text-neutral-800 dark:text-neutral-200"
              }`}
            >
              {item.title}
            </div>
            <div className="truncate text-xs text-neutral-500 dark:text-neutral-400">
              {item.description}
            </div>
          </div>
        </button>
      ))}
    </div>
  );
});

CommandList.displayName = "CommandList";

function getSuggestion(): Omit<SuggestionOptions, "editor"> {
  return {
    items: ({ query }: { query: string }) => {
      const normalizedQuery = query.toLowerCase().trim();
      if (!normalizedQuery) return COMMANDS;
      return COMMANDS.filter(
        (item) =>
          item.title.toLowerCase().includes(normalizedQuery) ||
          item.description.toLowerCase().includes(normalizedQuery)
      );
    },
    char: "/",
    startOfLine: true,
    render: () => {
      let component: ReactRenderer | null = null;
      let popup: TippyInstance[] | null = null;

      return {
        onStart: (props: SuggestionProps) => {
          component = new ReactRenderer(CommandList, {
            props,
            editor: props.editor,
          });

          if (!props.clientRect) return;

          popup = tippy("body", {
            getReferenceClientRect: props.clientRect as () => DOMRect,
            appendTo: () => document.body,
            content: component.element,
            showOnCreate: true,
            interactive: true,
            trigger: "manual",
            placement: "bottom-start",
          });
        },
        onUpdate: (props: SuggestionProps) => {
          component?.updateProps(props);

          if (!props.clientRect || !popup?.[0]) return;
          popup[0].setProps({
            getReferenceClientRect: props.clientRect as () => DOMRect,
          });
        },
        onKeyDown: (props: { event: KeyboardEvent }) => {
          if (props.event.key === "Escape") {
            popup?.[0]?.hide();
            return true;
          }
          return (component?.ref as { onKeyDown: (p: { event: KeyboardEvent }) => boolean } | null)?.onKeyDown(props) ?? false;
        },
        onExit: () => {
          popup?.[0]?.destroy();
          component?.destroy();
        },
      };
    },
  };
}

export const SlashCommands = Extension.create({
  name: "slashCommands",

  addOptions() {
    return {
      suggestion: getSuggestion(),
    };
  },

  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        ...this.options.suggestion,
      }),
    ];
  },
});
