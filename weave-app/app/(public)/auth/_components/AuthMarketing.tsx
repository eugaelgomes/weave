"use client";

import { useEffect, useState } from "react";

export function AuthMarketing() {
  const audiences = ["você", "sua empresa"];
  const [activeAudience, setActiveAudience] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveAudience((prev: number) => (prev + 1) % audiences.length);
    }, 2200);

    return () => clearInterval(interval);
  }, [audiences.length]);

  return (
    <div className="relative flex h-full w-full items-center justify-center overflow-hidden bg-brand-secondary-200 px-10">
      
      <div className="relative z-10 max-w-md px-6 py-8">
        <p className="text-center text-4xl font-semibold leading-tight tracking-tight text-brand-secundary-500">
          Faça o melhor por{' '} {'_'}
        </p>

        <div className="relative mt-3 h-14">
          {audiences.map((audience, index) => (
            <span
              key={audience}
              className={`absolute inset-0 text-center text-4xl font-bold leading-tight tracking-tight text-brand-primary-500 transition-all duration-500 ${
                index === activeAudience
                  ? "translate-y-0 opacity-100"
                  : "translate-y-2 opacity-0"
              }`}
            >
              {audience}!
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}