/**
 * Utilitário para gerenciar cores de tags de forma consistente
 * Mapeia cores baseado na primeira letra da tag em ordem alfabética
 */

export interface TagColorScheme {
  bg: string;
  text: string;
  border: string;
}

// Paleta de cores para tags (26 cores para 26 letras do alfabeto)
const TAG_COLORS: TagColorScheme[] = [
  // A - Pink
  {
    bg: "bg-pink-100 dark:bg-pink-900/30",
    text: "text-pink-700 dark:text-pink-300",
    border: "border-pink-200 dark:border-pink-800",
  },
  // B - Purple
  {
    bg: "bg-purple-100 dark:bg-purple-900/30",
    text: "text-purple-700 dark:text-purple-300",
    border: "border-purple-200 dark:border-purple-800",
  },
  // C - Blue
  {
    bg: "bg-blue-100 dark:bg-blue-900/30",
    text: "text-blue-700 dark:text-blue-300",
    border: "border-blue-200 dark:border-blue-800",
  },
  // D - Cyan
  {
    bg: "bg-cyan-100 dark:bg-cyan-900/30",
    text: "text-cyan-700 dark:text-cyan-300",
    border: "border-cyan-200 dark:border-cyan-800",
  },
  // E - Teal
  {
    bg: "bg-teal-100 dark:bg-teal-900/30",
    text: "text-teal-700 dark:text-teal-300",
    border: "border-teal-200 dark:border-teal-800",
  },
  // F - Green
  {
    bg: "bg-green-100 dark:bg-green-900/30",
    text: "text-green-700 dark:text-green-300",
    border: "border-green-200 dark:border-green-800",
  },
  // G - Lime
  {
    bg: "bg-lime-100 dark:bg-lime-900/30",
    text: "text-lime-700 dark:text-lime-300",
    border: "border-lime-200 dark:border-lime-800",
  },
  // H - Yellow
  {
    bg: "bg-yellow-100 dark:bg-yellow-900/30",
    text: "text-yellow-700 dark:text-yellow-300",
    border: "border-yellow-200 dark:border-yellow-800",
  },
  // I - Orange
  {
    bg: "bg-orange-100 dark:bg-orange-900/30",
    text: "text-orange-700 dark:text-orange-300",
    border: "border-orange-200 dark:border-orange-800",
  },
  // J - Red
  {
    bg: "bg-red-100 dark:bg-red-900/30",
    text: "text-red-700 dark:text-red-300",
    border: "border-red-200 dark:border-red-800",
  },
  // K - Rose
  {
    bg: "bg-rose-100 dark:bg-rose-900/30",
    text: "text-rose-700 dark:text-rose-300",
    border: "border-rose-200 dark:border-rose-800",
  },
  // L - Indigo
  {
    bg: "bg-indigo-100 dark:bg-indigo-900/30",
    text: "text-indigo-700 dark:text-indigo-300",
    border: "border-indigo-200 dark:border-indigo-800",
  },
  // M - Violet
  {
    bg: "bg-violet-100 dark:bg-violet-900/30",
    text: "text-violet-700 dark:text-violet-300",
    border: "border-violet-200 dark:border-violet-800",
  },
  // N - Fuchsia
  {
    bg: "bg-fuchsia-100 dark:bg-fuchsia-900/30",
    text: "text-fuchsia-700 dark:text-fuchsia-300",
    border: "border-fuchsia-200 dark:border-fuchsia-800",
  },
  // O - Pink (repetindo ciclo)
  {
    bg: "bg-pink-100 dark:bg-pink-900/30",
    text: "text-pink-700 dark:text-pink-300",
    border: "border-pink-200 dark:border-pink-800",
  },
  // P - Emerald
  {
    bg: "bg-emerald-100 dark:bg-emerald-900/30",
    text: "text-emerald-700 dark:text-emerald-300",
    border: "border-emerald-200 dark:border-emerald-800",
  },
  // Q - Sky
  {
    bg: "bg-sky-100 dark:bg-sky-900/30",
    text: "text-sky-700 dark:text-sky-300",
    border: "border-sky-200 dark:border-sky-800",
  },
  // R - Amber
  {
    bg: "bg-amber-100 dark:bg-amber-900/30",
    text: "text-amber-700 dark:text-amber-300",
    border: "border-amber-200 dark:border-amber-800",
  },
  // S - Slate (neutral)
  {
    bg: "bg-slate-100 dark:bg-[#1d1d1b]/30",
    text: "text-slate-700 dark:text-slate-300",
    border: "border-slate-200 dark:border-surface-dark-border",
  },
  // T - Stone
  {
    bg: "bg-stone-100 dark:bg-[#1d1d1b]/30",
    text: "text-stone-700 dark:text-stone-300",
    border: "border-stone-200 dark:border-surface-dark-border",
  },
  // U - Zinc
  {
    bg: "bg-zinc-100 dark:bg-[#1d1d1b]/30",
    text: "text-zinc-700 dark:text-zinc-300",
    border: "border-zinc-200 dark:border-surface-dark-border",
  },
  // V - Violet (repetindo)
  {
    bg: "bg-violet-100 dark:bg-violet-900/30",
    text: "text-violet-700 dark:text-violet-300",
    border: "border-violet-200 dark:border-violet-800",
  },
  // W - Teal (repetindo)
  {
    bg: "bg-teal-100 dark:bg-teal-900/30",
    text: "text-teal-700 dark:text-teal-300",
    border: "border-teal-200 dark:border-teal-800",
  },
  // X - Purple (repetindo)
  {
    bg: "bg-purple-100 dark:bg-purple-900/30",
    text: "text-purple-700 dark:text-purple-300",
    border: "border-purple-200 dark:border-purple-800",
  },
  // Y - Yellow (repetindo)
  {
    bg: "bg-yellow-100 dark:bg-yellow-900/30",
    text: "text-yellow-700 dark:text-yellow-300",
    border: "border-yellow-200 dark:border-yellow-800",
  },
  // Z - Rose (repetindo)
  {
    bg: "bg-rose-100 dark:bg-rose-900/30",
    text: "text-rose-700 dark:text-rose-300",
    border: "border-rose-200 dark:border-rose-800",
  },
];

/**
 * Retorna um esquema de cores baseado na primeira letra da tag
 * @param tag - A tag para determinar a cor
 * @returns Um objeto com as classes de cor para bg, text e border
 */
export function getTagColor(tag: string): TagColorScheme {
  if (!tag || tag.length === 0) {
    // Cor padrão para tags vazias
    return {
      bg: "bg-neutral-100 dark:bg-[#1d1d1b]/30",
      text: "text-neutral-700 dark:text-neutral-300",
      border: "border-neutral-200 dark:border-surface-dark-border",
    };
  }

  // Normaliza a primeira letra para maiúscula
  const firstLetter = tag.charAt(0).toUpperCase();
  const charCode = firstLetter.charCodeAt(0);

  // Verifica se é uma letra do alfabeto (A-Z)
  if (charCode >= 65 && charCode <= 90) {
    const index = charCode - 65; // 65 é o código ASCII de 'A'
    return TAG_COLORS[index];
  }

  // Para números (0-9), usa uma fórmula de módulo
  if (charCode >= 48 && charCode <= 57) {
    const numIndex = (charCode - 48) % TAG_COLORS.length;
    return TAG_COLORS[numIndex];
  }

  // Para caracteres especiais, usa a cor padrão
  return {
    bg: "bg-neutral-100 dark:bg-[#1d1d1b]/30",
    text: "text-neutral-700 dark:text-neutral-300",
    border: "border-neutral-200 dark:border-surface-dark-border",
  };
}

/**
 * Retorna um esquema de cores baseado em um índice específico
 * Útil para casos onde você precisa de cores consistentes mas não baseadas na tag
 * @param index - O índice da cor desejada
 * @returns Um objeto com as classes de cor para bg, text e border
 */
export function getTagColorByIndex(index: number): TagColorScheme {
  const safeIndex = Math.abs(index) % TAG_COLORS.length;
  return TAG_COLORS[safeIndex];
}
