// Tipos de visualização de projetos baseados no enum PostgreSQL
export type ProjectViewType = "board" | "list" | "calendar" | "timeline" | "gantt";

export interface ViewTypeOption {
  value: ProjectViewType;
  label: string;
  description: string;
  icon: string;
}

export const VIEW_TYPE_OPTIONS: ViewTypeOption[] = [
  {
    value: "board",
    label: "Quadro",
    description: "Visualização em colunas estilo Kanban",
    icon: "board",
  },
  {
    value: "list",
    label: "Lista",
    description: "Visualização em lista ordenada",
    icon: "list",
  },
  {
    value: "calendar",
    label: "Calendário",
    description: "Visualização por datas em calendário",
    icon: "calendar",
  },
  {
    value: "timeline",
    label: "Timeline",
    description: "Visualização cronológica em linha do tempo",
    icon: "timeline",
  },
  {
    value: "gantt",
    label: "Gantt",
    description: "Gráfico de Gantt para gestão de projetos",
    icon: "gantt",
  },
];

export const getViewTypeOption = (value: ProjectViewType): ViewTypeOption => {
  return VIEW_TYPE_OPTIONS.find((opt) => opt.value === value) || VIEW_TYPE_OPTIONS[0];
};
