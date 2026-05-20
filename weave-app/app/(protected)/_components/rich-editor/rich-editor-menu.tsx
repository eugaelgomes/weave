"use client";

import React from "react";
import type { Editor } from "@tiptap/react";
import { BubbleMenu, FloatingMenu } from "@tiptap/react/menus";
import { RichEditorFormatToolbar } from "./rich-editor-format-toolbar";

interface RichEditorBubbleMenuProps {
  editor: Editor;
}

export function RichEditorBubbleMenu({ editor }: RichEditorBubbleMenuProps) {
  return (
    <BubbleMenu
      editor={editor}
      options={{ placement: "top", offset: 8 }}
      className="z-50"
    >
      <RichEditorFormatToolbar editor={editor} variant="bubble" />
    </BubbleMenu>
  );
}

interface RichEditorFloatingMenuProps {
  editor: Editor;
}

export function RichEditorFloatingMenu({ editor }: RichEditorFloatingMenuProps) {
  return (
    <FloatingMenu
      editor={editor}
      options={{ placement: "left-start", offset: 8 }}
      className="z-50"
    >
      <RichEditorFormatToolbar editor={editor} variant="floating" density="compact" />
    </FloatingMenu>
  );
}
