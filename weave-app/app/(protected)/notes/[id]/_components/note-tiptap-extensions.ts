import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Highlight from "@tiptap/extension-highlight";
import Underline from "@tiptap/extension-underline";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import { common, createLowlight } from "lowlight";
import { SlashCommands } from "./note-tiptap-slash-commands";

const lowlight = createLowlight(common);

export function createTiptapExtensions(placeholder = "Digite / para comandos ou comece a escrever...") {
  return [
    StarterKit.configure({
      heading: {
        levels: [1, 2, 3, 4],
      },
      codeBlock: false,
      dropcursor: {
        color: "#d4d4d4",
        width: 2,
      },
    }),
    Placeholder.configure({
      placeholder: ({ node }) => {
        if (node.type.name === "heading") {
          return "Título...";
        }
        return placeholder;
      },
      emptyEditorClass: "is-editor-empty",
      emptyNodeClass: "is-empty",
    }),
    TaskList.configure({
      HTMLAttributes: {
        class: "tiptap-task-list",
      },
    }),
    TaskItem.configure({
      nested: true,
      HTMLAttributes: {
        class: "tiptap-task-item",
      },
    }),
    Image.configure({
      allowBase64: true,
      HTMLAttributes: {
        class: "tiptap-image",
      },
    }),
    Link.configure({
      openOnClick: false,
      autolink: true,
      defaultProtocol: "https",
      HTMLAttributes: {
        class: "tiptap-link",
      },
    }),
    Highlight.configure({
      multicolor: false,
    }),
    Underline,
    CodeBlockLowlight.configure({
      lowlight,
      defaultLanguage: "plaintext",
      HTMLAttributes: {
        class: "tiptap-code-block",
      },
    }),
    SlashCommands,
  ];
}
