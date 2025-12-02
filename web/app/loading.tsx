"use client";

import React from "react";

export default function Loading() {
  return (
    <div className="flex h-full min-h-[60vh] items-center justify-center rounded-md bg-gradient-to-br from-neutral-50 to-neutral-100">
      <div className="text-center">
        {/* Spinner principal */}
        <div className="mb-6">
          <div className="mx-auto h-16 w-16">
            <div className="h-full w-full animate-spin rounded-full border-4 border-neutral-200 border-t-yellow-500"></div>
          </div>
        </div>

        {/* Logo */}
        <div className="mb-4">
          <div className="inline-block rounded-md bg-yellow-500 px-4 py-2 text-lg font-bold text-white">
            Weave Notes
          </div>
        </div>

        {/* Texto de carregamento */}
        <div className="space-y-2">
          <p className="font-medium text-neutral-950">Carregando...</p>
          <p className="text-sm text-neutral-800">Preparando tudo para você</p>
        </div>

        {/* Indicador de pontos animados */}
        <div className="mt-4 flex justify-center space-x-1">
          <div className="h-2 w-2 animate-bounce rounded-full bg-yellow-500"></div>
          <div className="h-2 w-2 animate-bounce rounded-full bg-yellow-500 [animation-delay:0.1s]"></div>
          <div className="h-2 w-2 animate-bounce rounded-full bg-yellow-500 [animation-delay:0.2s]"></div>
        </div>
      </div>
    </div>
  );
}
