"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { GripVertical } from "lucide-react";
import type { Editor } from "@tiptap/react";
import { NodeSelection } from "@tiptap/pm/state";
import { Slice, Fragment, DOMSerializer } from "@tiptap/pm/model";

interface DragHandleProps {
  editor: Editor;
}

/**
 * Notion-style floating drag handle.
 *
 * - Appears to the left of the hovered top-level block.
 * - HTML-native `draggable` — on `dragstart` it sets a NodeSelection,
 *   serialises the node into `dataTransfer`, and sets `view.dragging`
 *   so ProseMirror treats the drop as an internal move.
 */
export function TiptapDragHandle({ editor }: DragHandleProps) {
  const handleRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [top, setTop] = useState(0);
  const currentNodePos = useRef<number | null>(null);
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* ---- resolve the nearest top-level block under the cursor ---- */
  const resolveBlock = useCallback(
    (event: MouseEvent) => {
      if (!editor || editor.isDestroyed) return;

      const view = editor.view;
      const editorDOM = view.dom;
      const wrapperEl = editorDOM.closest(".tiptap-editor-wrapper");
      if (!wrapperEl) return;

      const wrapperRect = wrapperEl.getBoundingClientRect();
      const editorRect = editorDOM.getBoundingClientRect();

      // Only when mouse is within the wrapper area
      if (
        event.clientY < wrapperRect.top ||
        event.clientY > wrapperRect.bottom ||
        event.clientX < wrapperRect.left ||
        event.clientX > wrapperRect.right
      ) {
        setVisible(false);
        return;
      }

      // Resolve position using the left edge of the editor content
      const posInfo = view.posAtCoords({
        left: editorRect.left + 1,
        top: event.clientY,
      });

      if (!posInfo) {
        setVisible(false);
        return;
      }

      // Walk up to the top-level node (depth 1)
      const resolved = view.state.doc.resolve(posInfo.pos);

      let nodePos: number;
      if (resolved.depth === 0) {
        // posInfo.inside gives us the direct child index
        nodePos = posInfo.inside;
        if (nodePos < 0) {
          setVisible(false);
          return;
        }
      } else {
        nodePos = resolved.before(1);
      }

      const node = view.state.doc.nodeAt(nodePos);
      if (!node) {
        setVisible(false);
        return;
      }

      const domNode = view.nodeDOM(nodePos);
      if (!domNode || !(domNode instanceof HTMLElement)) {
        setVisible(false);
        return;
      }

      const blockRect = domNode.getBoundingClientRect();
      currentNodePos.current = nodePos;
      setTop(blockRect.top - wrapperRect.top);
      setVisible(true);
    },
    [editor]
  );

  /* ---- event listeners ---- */
  useEffect(() => {
    if (!editor || editor.isDestroyed) return;

    const wrapperEl = editor.view.dom.closest(".tiptap-editor-wrapper");
    if (!wrapperEl) return;

    const onMove = (e: Event) => {
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
        hideTimeoutRef.current = null;
      }
      resolveBlock(e as MouseEvent);
    };

    const onLeave = () => {
      hideTimeoutRef.current = setTimeout(() => setVisible(false), 200);
    };

    wrapperEl.addEventListener("mousemove", onMove);
    wrapperEl.addEventListener("mouseleave", onLeave);

    return () => {
      wrapperEl.removeEventListener("mousemove", onMove);
      wrapperEl.removeEventListener("mouseleave", onLeave);
      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    };
  }, [editor, resolveBlock]);

  /* ---- drag start: set NodeSelection + view.dragging ---- */
  const handleDragStart = useCallback(
    (e: React.DragEvent) => {
      if (currentNodePos.current === null || !editor || editor.isDestroyed) return;

      const pos = currentNodePos.current;
      const node = editor.view.state.doc.nodeAt(pos);
      if (!node) return;

      // 1. Create a NodeSelection on the block
      const tr = editor.view.state.tr.setSelection(
        NodeSelection.create(editor.view.state.doc, pos)
      );
      editor.view.dispatch(tr);

      // 2. Create the slice to be moved
      const slice = new Slice(Fragment.from(node), 0, 0);

      // 3. Serialize the node to HTML for the dataTransfer
      const serializer = DOMSerializer.fromSchema(editor.view.state.schema);
      const div = document.createElement("div");
      div.appendChild(serializer.serializeFragment(Fragment.from(node)));
      e.dataTransfer.clearData();
      e.dataTransfer.setData("text/html", div.innerHTML);
      e.dataTransfer.setData("text/plain", node.textContent);
      e.dataTransfer.effectAllowed = "move";

      // 4. Tell ProseMirror this is an internal move drag
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (editor.view as any).dragging = { slice, move: true };
    },
    [editor]
  );

  const handleDragEnd = useCallback(() => {
    if (editor && !editor.isDestroyed) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (editor.view as any).dragging = null;
    }
  }, [editor]);

  /* ---- keep handle visible when hovering it ---- */
  const onHandleEnter = useCallback(() => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
  }, []);

  const onHandleLeave = useCallback(() => {
    hideTimeoutRef.current = setTimeout(() => setVisible(false), 200);
  }, []);

  return (
    <div
      ref={handleRef}
      className="tiptap-drag-handle"
      draggable
      style={{
        top: `${top}px`,
        opacity: visible ? 1 : 0,
        pointerEvents: visible ? "auto" : "none",
      }}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onMouseEnter={onHandleEnter}
      onMouseLeave={onHandleLeave}
      role="button"
      aria-label="Arrastar bloco"
      title="Arrastar para reordenar"
    >
      <GripVertical size={14} />
    </div>
  );
}
