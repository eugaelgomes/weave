"use client";

import React from "react";
import type { Editor } from "@tiptap/react";
import { BubbleMenu, FloatingMenu } from "@tiptap/react/menus";
import { RichEditorFormatToolbar } from "@/app/(protected)/_components/rich-editor/rich-editor-format-toolbar";

interface RichEditorBubbleMenuProps {
  editor: Editor;
  mediaEnabled?: boolean;
}

export function RichEditorBubbleMenu({ editor, mediaEnabled }: RichEditorBubbleMenuProps) {
  return (
    <BubbleMenu editor={editor} options={{ placement: "top", offset: 8 }} className="z-50">
      <RichEditorFormatToolbar editor={editor} variant="bubble" mediaEnabled={mediaEnabled} />
    </BubbleMenu>
  );
}

interface RichEditorFloatingMenuProps {
  editor: Editor;
  mediaEnabled?: boolean;
}

export function RichEditorFloatingMenu({ editor, mediaEnabled }: RichEditorFloatingMenuProps) {
  return (
    <FloatingMenu editor={editor} options={{ placement: "left-start", offset: 8 }} className="z-50">
      <RichEditorFormatToolbar
        editor={editor}
        variant="floating"
        density="compact"
        mediaEnabled={mediaEnabled}
      />
    </FloatingMenu>
  );
}
