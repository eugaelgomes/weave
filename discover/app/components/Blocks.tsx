type BlockAccent = "teal" | "blue" | "amber" | "rose";

const accentStyles: Record<
  BlockAccent,
  { outer: string; mid: string; inner: string; glow: string; header: string }
> = {
  teal: {
    outer: "bg-cyan-500/25",
    mid: "bg-cyan-500/45",
    inner: "bg-cyan-400/80",
    glow: "shadow-[0_0_30px_rgba(34,211,238,0.30)]", // Glow ligeiramente reduzido
    header: "border-cyan-500/50 bg-cyan-500/15 dark:bg-cyan-400/10",
  },
  blue: {
    outer: "bg-blue-500/25",
    mid: "bg-blue-500/45",
    inner: "bg-blue-400/80",
    glow: "shadow-[0_0_30px_rgba(59,130,246,0.30)]", // Glow ligeiramente reduzido
    header: "border-blue-500/50 bg-blue-500/15 dark:bg-blue-400/10",
  },
  amber: {
    outer: "bg-amber-500/25",
    mid: "bg-amber-500/45",
    inner: "bg-amber-400/80",
    glow: "shadow-[0_0_30px_rgba(251,191,36,0.30)]", // Glow ligeiramente reduzido
    header: "border-amber-500/50 bg-amber-500/15 dark:bg-amber-400/10",
  },
  rose: {
    outer: "bg-fuchsia-500/25",
    mid: "bg-fuchsia-500/45",
    inner: "bg-fuchsia-400/80",
    glow: "shadow-[0_0_30px_rgba(232,121,249,0.30)]", // Glow ligeiramente reduzido
    header: "border-fuchsia-500/50 bg-fuchsia-500/15 dark:bg-fuchsia-400/10",
  },
};

function BlockGraphic({ accent }: { accent: BlockAccent }) {
  const s = accentStyles[accent];
  return (
    <div
      aria-hidden
      // max-w reduzido de 140px para 100px para o gráfico menor
      className={`relative flex aspect-[3/5] w-full max-w-[100px] items-center justify-center rounded-md ${s.outer}`}
    >
      {/* inset reduzido de 3 para 2 */}
      <div
        className={`absolute inset-2 flex items-center justify-center rounded-md ${s.mid} ${s.glow}`}
      >
        <div className={`h-[50%] w-[50%] rounded-md ${s.inner}`} />
      </div>
    </div>
  );
}

export interface PrincipleItem {
  title: string;
  description: string;
}

export interface BlocksProps {
  ariaLabel: string;
  items: PrincipleItem[];
}

function FeatureBlock({
  accent,
  title,
  description,
  className,
}: {
  accent: BlockAccent;
  title: string;
  description: string;
  className?: string;
}) {
  const headerTint = accentStyles[accent].header;
  return (
    <article
      // Paddings e gaps reduzidos: p-6/sm:p-8 virou p-4/sm:p-5, e gap-6/sm:gap-8 virou gap-4/sm:gap-5
      className={`flex flex-col gap-4 bg-white/70 p-4 backdrop-blur-sm sm:gap-5 sm:p-5 dark:bg-neutral-950/35 ${className ?? ""}`}
    >
      <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
        <span
          aria-hidden
          // Tamanho do ícone menor (h-10 para h-7)
          className={`inline-flex h-7 w-7 shrink-0 rounded-md border ${headerTint}`}
        />
        <h2 className="text-lg font-semibold tracking-tight text-neutral-900 dark:text-white sm:text-xl">
          {title}
        </h2>
      </header>

      {/* Gaps da descrição para o gráfico reduzidos de gap-8/sm:gap-10 para gap-5/sm:gap-6 */}
      <div className="flex flex-1 flex-col gap-5 sm:flex-row sm:items-stretch sm:gap-6">
        <div className="flex min-w-0 flex-1 flex-col gap-4 sm:max-w-[70%]">
          {/* Fonte reduzida de text-base para text-sm */}
          <p className="text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
            {description}
          </p>
        </div>

        <div className="flex shrink-0 items-center justify-end sm:w-[30%] sm:justify-center">
          <BlockGraphic accent={accent} />
        </div>
      </div>
    </article>
  );
}

const layout: { accent: BlockAccent; borders: string }[] = [
  {
    accent: "teal",
    borders:
      "border-b border-neutral-200 dark:border-neutral-800 md:border-r md:border-b",
  },
  {
    accent: "blue",
    borders: "border-b border-neutral-200 dark:border-neutral-800 md:border-b",
  },
  {
    accent: "amber",
    borders:
      "border-b border-neutral-200 dark:border-neutral-800 md:border-r md:border-b-0",
  },
  { accent: "rose", borders: "" },
];

export default function Blocks({ ariaLabel, items }: BlocksProps) {
  return (
    <section
      // Padding principal intocado conforme solicitado
      className="w-full py-8 sm:py-10"
      aria-label={ariaLabel}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="overflow-hidden rounded-lg border border-neutral-200 shadow-sm dark:border-neutral-800 dark:shadow-none">
          <div className="grid grid-cols-1 md:grid-cols-2">
            {layout.map((cell, index) => {
              const item = items[index];
              if (!item) return null;
              return (
                <FeatureBlock
                  key={item.title}
                  accent={cell.accent}
                  className={cell.borders}
                  title={item.title}
                  description={item.description}
                />
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}