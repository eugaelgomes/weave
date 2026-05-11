import { Node, mergeAttributes } from "@tiptap/core";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    video: {
      /** Insert a block-level HTML5 video (uploaded file URL or absolute). */
      setVideo: (options: { src: string }) => ReturnType;
    };
  }
}

export const NoteTiptapVideo = Node.create({
  name: "video",

  addOptions() {
    return {
      HTMLAttributes: {
        class: "tiptap-video",
      },
    };
  },

  group: "block",

  draggable: true,

  atom: true,

  addAttributes() {
    return {
      src: {
        default: null,
      },
    };
  },

  parseHTML() {
    return [{ tag: "video[src]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "video",
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        controls: "",
        playsinline: "",
        preload: "metadata",
      }),
    ];
  },

  addCommands() {
    return {
      setVideo:
        (options: { src: string }) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: options,
          });
        },
    };
  },
});
