"use client";

import React, { useCallback } from "react";
import { Extension } from "@tiptap/core";
import { ReactRenderer } from "@tiptap/react";
import {
  Suggestion,
  exitSuggestion,
  type SuggestionOptions,
  type SuggestionProps,
} from "@tiptap/suggestion";
import tippy, { type Instance as TippyInstance } from "tippy.js";
import { NoteTiptapFormatToolbar } from "./note-tiptap-format-toolbar";

type SlashToolbarItem = { id: "toolbar" };

function SlashToolbarView(props: SuggestionProps<SlashToolbarItem, SlashToolbarItem>) {
  const { editor, range } = props;

  const dismiss = useCallback(() => {
    exitSuggestion(editor.view);
  }, [editor]);

  return (
    <NoteTiptapFormatToolbar
      editor={editor}
      variant="slash"
      slashRange={range}
      onAfterAction={dismiss}
    />
  );
}

function getSuggestion(): Omit<SuggestionOptions<SlashToolbarItem, SlashToolbarItem>, "editor"> {
  return {
    items: () => [{ id: "toolbar" }],
    char: "/",
    render: () => {
      let component: ReactRenderer | null = null;
      let popup: TippyInstance[] | null = null;

      return {
        onStart: (props: SuggestionProps<SlashToolbarItem, SlashToolbarItem>) => {
          component = new ReactRenderer(SlashToolbarView, {
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
            placement: "top-start",
            offset: [0, 8],
            animation: false,
          });
        },
        onUpdate: (props: SuggestionProps<SlashToolbarItem, SlashToolbarItem>) => {
          component?.updateProps(props);

          if (!props.clientRect || !popup?.[0]) return;
          popup[0].setProps({
            getReferenceClientRect: props.clientRect as () => DOMRect,
          });
        },
        onKeyDown: () => false,
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
