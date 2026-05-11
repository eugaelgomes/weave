"use client";

import React from "react";
import type { Editor } from "@tiptap/react";
import { BubbleMenu, FloatingMenu } from "@tiptap/react/menus";
import { NoteTiptapFormatToolbar } from "./note-tiptap-format-toolbar";

interface NoteTiptapBubbleMenuProps {
  editor: Editor;
}

export function NoteTiptapBubbleMenu({ editor }: NoteTiptapBubbleMenuProps) {
  return (
    <BubbleMenu
      editor={editor}
      options={{ placement: "top", offset: 8 }}
      className="z-50"
    >
      <NoteTiptapFormatToolbar editor={editor} variant="bubble" />
    </BubbleMenu>
  );
}

interface NoteTiptapFloatingMenuProps {
  editor: Editor;
}

export function NoteTiptapFloatingMenu({ editor }: NoteTiptapFloatingMenuProps) {
  return (
    <FloatingMenu
      editor={editor}
      options={{ placement: "left-start", offset: 8 }}
      className="z-50"
    >
      <NoteTiptapFormatToolbar editor={editor} variant="floating" density="compact" />
    </FloatingMenu>
  );
}
