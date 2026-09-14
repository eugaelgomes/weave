---
name: Worksapceanization UI alignment
overview: "Alinhar todas as rotas em `app/(protected)/workspace` ao padrão visual do resto do weave-app: paleta neutral + superfície `#1d1d1b`, bordas/sombras `surface-dark-*`, headers partilhados e tipografia coerente, substituindo o bloco zinc-centric e inconsistências de layout."
todos:
  - id: org-settings-components
    content: Normalizar zinc → neutral + surface + focos em settings/_components (ui-elements, header, settings-form, domains-section) e settings/page.tsx
    status: pending
  - id: org-create
    content: Refatorar workspace/create/page.tsx para o mesmo padrão de cartão/CTA/tipografia
    status: pending
  - id: org-areas
    content: Auditar workspace/areas/page.tsx por secções; unificar classes de cartão/borda/sombra e reduzir duplicação se útil
    status: pending
  - id: org-about-members
    content: Melhorar about/[id]/page.tsx; rever members list/invites por resíduos fora do padrão
    status: pending
  - id: org-qa
    content: QA dark/light nas rotas /workspace/**
    status: pending
isProject: false
---

# Plano: corrigir telas de Worksapceanization (front)

## Referência de padrão (alvo)

Usar como “north star” o que já está consistente no próprio monólito de org e noutras áreas protegidas:

- **Shell da página:** `bg-neutral-50 dark:bg-[#1d1d1b]` (ou herdar do card do [protected-layout](weave-app/app/_components/protected-layout.tsx) sem duplicar fundo desnecessário).
- **Cartões / painéis:** `border border-neutral-200 bg-white shadow-sm dark:border-surface-dark-border dark:bg-[#1d1d1b] dark:shadow-surface-dark-sm` (ou `md` em blocos grandes), como em [workspace/projects/page.tsx](weave-app/app/(protected)/workspace/projects/page.tsx) e [workspace/dashboard/page.tsx](weave-app/app/(protected)/workspace/dashboard/page.tsx).
- **Texto:** `text-neutral-900 dark:text-neutral-100` (títulos), `text-neutral-600 dark:text-neutral-400` (secundário) — evitar `text-zinc-*`.
- **Inputs / foco:** alinhar a [settings](weave-app/app/(protected)/settings) e notas: `focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500` (ou o padrão já usado em `client-tokens` / `plans`), em vez de `focus:ring-zinc-100` / `focus:border-zinc-400`.
- **Header de contexto:** manter [WorkspaceHeader](weave-app/app/(protected)/_components/ui/headers/workspace-header.tsx) (já envolve [BaseHeader](weave-app/app/(protected)/_components/ui/headers/base-header.tsx)) em todas as páginas de primeiro nível; páginas “vazias” ganham a mesma estrutura de secção que as outras.

## Onde está o desvio (prioridade)

| Área | Ficheiros | Problema |
|------|-----------|----------|
| Alta | [create/page.tsx](weave-app/app/(protected)/workspace/create/page.tsx) | Dominância de `border-zinc-*`, `text-zinc-*`, `bg-zinc-*`, steps laterais com outro idioma visual |
| Alta | [settings/_components/header.tsx](weave-app/app/(protected)/workspace/settings/_components/header.tsx), [settings-form.tsx](weave-app/app/(protected)/workspace/settings/_components/settings-form.tsx), [domains-section.tsx](weave-app/app/(protected)/workspace/settings/_components/domains-section.tsx), [ui-elements.tsx](weave-app/app/(protected)/workspace/settings/_components/ui-elements.tsx) | Paleta zinc + gradientes `from-zinc-*`; modais e formulários fora do padrão neutral/surface |
| Média | [settings/page.tsx](weave-app/app/(protected)/workspace/settings/page.tsx) | Estados loading / deleted com `zinc-*` e CTAs `bg-zinc-900` |
| Média | [areas/page.tsx](weave-app/app/(protected)/workspace/areas/page.tsx) | Ficheiro grande (~1.3k linhas): mistura `clsx` + muitos `rounded-md border border-neutral-*`; auditar e substituir o que ainda for cinza “solto” sem `surface-dark-*` / sombra dark onde há cartão |
| Baixa | [about/[id]/page.tsx](weave-app/app/(protected)/workspace/about/[id]/page.tsx) | Stub quase sem layout: falta card, tipografia neutral e conteúdo mínimo alinhado |
| Verificação | [members/list/page.tsx](weave-app/app/(protected)/workspace/members/list/page.tsx), [members/invites/page.tsx](weave-app/app/(protected)/workspace/members/invites/page.tsx) | Já usam tokens em modais; rever toolbars/tabelas por `grep` `zinc-\|`neutral-800` sem `surface` |

## Abordagem de implementação

1. **Mapeamento mecânico (com revisão humana por ficheiro)**  
   - Substituir `zinc-{50–950}` em classes de **layout** (border/bg/text) por equivalentes **neutral** + tokens `surface-dark-border*` / `dark:shadow-surface-dark-*` já definidos em [globals.css](weave-app/app/globals.css).  
   - Manter **zinc** apenas onde for semântica intencional (ex.: raro) ou trocar tudo por neutral para uma só família.

2. **Componentes partilhados de org settings primeiro**  
   Normalizar [ui-elements.tsx](weave-app/app/(protected)/workspace/settings/_components/ui-elements.tsx) (inputs, switch, labels) para que [settings-form.tsx](weave-app/app/(protected)/workspace/settings/_components/settings-form.tsx) e [domains-section.tsx](weave-app/app/(protected)/workspace/settings/_components/domains-section.tsx) herdem o mesmo aspeto que `/settings/*` sem duplicar estilos.

3. **create/page.tsx**  
   - Unificar aside + section + formulários ao padrão de cartão acima.  
   - Rever CTAs primários: usar `bg-brand-primary-500` + hover alinhado ao resto da app em vez de blocos `bg-zinc-900` (light) / `dark:bg-zinc-100` salvo que seja explicitamente “secondary”.

4. **areas/page.tsx**  
   - Por tamanho: extrair **constantes de classe** repetidas (ex.: `cardClass`, `toolbarClass`) no topo do ficheiro ou num `_components/areas-styles.ts` **só se** reduzir duplicação; caso contrário, substituição incremental por secção (lista, aside, modais).

5. **about**  
   - Envolver título em contentor com `max-w-*`, `p-6`, card opcional e `text-neutral-*`; considerar link “Voltar” ou redirect se a página for placeholder.

6. **QA**  
   - Percorrer em dark: `/workspace/settings`, `/workspace/create`, `/workspace/areas`, `/workspace/projects`, `/workspace/dashboard`, `/workspace/members/*`, `/workspace/about/*`.  
   - Light: verificar que `border-neutral-200` e fundos `bg-white` / `bg-neutral-50` não regrediram.

## Fora de escopo (a não misturar neste PR)

- Tradução/i18n dos labels em inglês no wizard de create (a menos que queiras incluir noutro PR).  
- Alterações de API ou de dados — apenas UI.

## Critérios de pronto

- Zero (ou residual justificado) de `zinc-` em `app/(protected)/workspace/**/*.tsx` para **layout**.  
- Todas as páginas de org com hierarquia visual alinhada a projects/dashboard (cartão + borda + sombra dark).  
- Inputs e focos coerentes com `/settings` ou notas.
