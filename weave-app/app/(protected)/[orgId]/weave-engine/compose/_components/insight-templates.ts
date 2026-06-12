import type { CreateBlockData } from "@/app/_services/notes-service/notes.schema";

/**
 * Default block skeleton for manual insight composition.
 */
export function buildInsightTemplateBlocks(labels: {
  summary: string;
  risks: string;
  actions: string;
}): CreateBlockData[] {
  return [
    {
      type: "heading",
      text: labels.summary,
      properties: { level: 2 },
    },
    { type: "paragraph", text: "" },
    {
      type: "heading",
      text: labels.risks,
      properties: { level: 2 },
    },
    { type: "paragraph", text: "" },
    {
      type: "heading",
      text: labels.actions,
      properties: { level: 2 },
    },
    { type: "list", text: "", properties: { attrs: { ordered: false } } },
  ];
}

export const INSIGHT_TYPE_OPTIONS = [
  "analysis",
  "daily_standup",
  "sprint_review",
  "sprint_kickoff",
  "retrospective",
] as const;

export type InsightTypeOption = (typeof INSIGHT_TYPE_OPTIONS)[number];
