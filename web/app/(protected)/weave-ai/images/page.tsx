"use client";

import React from "react";
import { ImageIcon } from "lucide-react";

export default function ImagesPage() {
  return (
    <div className="flex h-full min-h-[400px] flex-1 flex-col items-center justify-center p-8 text-center">
      <div className="flex size-14 items-center justify-center rounded-2xl bg-neutral-100 text-neutral-600 dark:bg-white/10 dark:text-neutral-300">
        <ImageIcon className="size-7" />
      </div>
      <h1 className="mt-4 text-xl font-semibold text-neutral-900 dark:text-white">
        Image Generation & Vision
      </h1>
      <p className="mt-1.5 max-w-sm text-sm text-neutral-500 dark:text-neutral-400">
        Geração e edição visual por inteligência artificial com os modelos Weave.
      </p>
    </div>
  );
}
