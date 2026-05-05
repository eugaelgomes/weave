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
  icon: React.ReactNode;
  command: (props: { editor: Editor; range: Range }) => void;
}

const COMMANDS: CommandItem[] = [
  {
    title: "Texto",
    icon: <Type size={18} strokeWidth={1.7} />,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setParagraph().run();
    },
  },
  {
    title: "Título 1",
    icon: <Heading1 size={18} strokeWidth={1.7} />,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setHeading({ level: 1 }).run();
    },
  },
  {
    title: "Título 2",
    icon: <Heading2 size={18} strokeWidth={1.7} />,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setHeading({ level: 2 }).run();
    },
  },
  {
    title: "Título 3",
    icon: <Heading3 size={18} strokeWidth={1.7} />,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setHeading({ level: 3 }).run();
    },
  },
  {
    title: "Lista",
    icon: <List size={18} strokeWidth={1.7} />,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleBulletList().run();
    },
  },
  {
    title: "Lista numerada",
    icon: <ListOrdered size={18} strokeWidth={1.7} />,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleOrderedList().run();
    },
  },
  {
    title: "Tarefas",
    icon: <CheckSquare size={18} strokeWidth={1.7} />,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleTaskList().run();
    },
  },
  {
    title: "Citação",
    icon: <Quote size={18} strokeWidth={1.7} />,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleBlockquote().run();
    },
  },
  {
    title: "Código",
    icon: <Code size={18} strokeWidth={1.7} />,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleCodeBlock().run();
    },
  },
  {
    title: "Divisor",
    icon: <Minus size={18} strokeWidth={1.7} />,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setHorizontalRule().run();
    },
  },
  {
    title: "Imagem",
    icon: <ImageIcon size={18} strokeWidth={1.7} />,
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
      if (item) command(item);
    },
    [items, command]
  );

  useEffect(() => {
    setSelectedIndex(0);
  }, [items]);

  useEffect(() => {
    if (containerRef.current) {
      const selectedEl = containerRef.current.querySelector(`[data-index="${selectedIndex}"]`);
      if (selectedEl) selectedEl.scrollIntoView({ block: "nearest" });
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
    return <div className="slash-menu-empty">Nenhum resultado</div>;
  }

  return (
    <div ref={containerRef} className="slash-menu">
      {items.map((item, index) => (
        <button
          key={item.title}
          data-index={index}
          onClick={() => selectItem(index)}
          className={`slash-menu-item ${index === selectedIndex ? "slash-menu-item--active" : ""}`}
        >
          <span className="slash-menu-item__icon">{item.icon}</span>
          <span className="slash-menu-item__title">{item.title}</span>
        </button>
      ))}
    </div>
  );
});

CommandList.displayName = "CommandList";

function getSuggestion(): Omit<SuggestionOptions, "editor"> {
  return {
    items: ({ query }: { query: string }) => {
      const q = query.toLowerCase().trim();
      if (!q) return COMMANDS;
      return COMMANDS.filter((item) => item.title.toLowerCase().includes(q));
    },
    char: "/",
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
            offset: [0, 4],
            animation: false,
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
