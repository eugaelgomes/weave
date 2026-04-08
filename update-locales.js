const fs = require('fs');

function updateLocale(file, newContent) {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/};\s*$/, newContent + '\n};\n');
  fs.writeFileSync(file, content);
}

const ptBR = `,
  automation: {
    title: "Gestão & Automação",
    subtitle: "Conecte seus processos de forma eficiente",
    workflows: "Workflows Inteligentes",
    workflowsDesc: "Automatize tarefas repetitivas",
    smartRules: "Regras de Ouro",
    smartRulesDesc: "Condições e triggers avançados",
    boardSync: "Sincronização de Boards",
    boardSyncDesc: "Status atualizado em tempo real",
    connectors: "Conectores Integrados",
    connectorsDesc: "Sua stack de ferramentas unificada",
    googleDesc: "Eventos e drives sincronizados",
    msDesc: "Documentos e equipes conectados",
    slackDesc: "Notificações e comandos via chat",
    gitDesc: "Commits e PRs viram atualizações",
    aiAssist: "Weave AI",
    aiAssistDesc: "Assistente para refinamento de fluxos",
  }`;

const enUS = `,
  automation: {
    title: "Management & Automation",
    subtitle: "Connect your processes efficiently",
    workflows: "Smart Workflows",
    workflowsDesc: "Automate repetitive tasks",
    smartRules: "Golden Rules",
    smartRulesDesc: "Advanced conditions and triggers",
    boardSync: "Board Synchronization",
    boardSyncDesc: "Real-time status updates",
    connectors: "Integrated Connectors",
    connectorsDesc: "Your tool stack unified",
    googleDesc: "Events and drives synced",
    msDesc: "Documents and teams connected",
    slackDesc: "Notifications and commands via chat",
    gitDesc: "Commits and PRs become updates",
    aiAssist: "Weave AI",
    aiAssistDesc: "Assistant for flow refinement",
  }`;

const esES = `,
  automation: {
    title: "Gestión y Automatización",
    subtitle: "Conecta tus procesos de forma eficiente",
    workflows: "Flujos de Trabajo Inteligentes",
    workflowsDesc: "Automatiza tareas repetitivas",
    smartRules: "Reglas de Oro",
    smartRulesDesc: "Condiciones y desencadenantes avanzados",
    boardSync: "Sincronización de Tableros",
    boardSyncDesc: "Estado actualizado en tiempo real",
    connectors: "Conectores Integrados",
    connectorsDesc: "Tu stack de herramientas unificado",
    googleDesc: "Eventos y unidades sincronizados",
    msDesc: "Documentos y equipos conectados",
    slackDesc: "Notificaciones y comandos vía chat",
    gitDesc: "Commits y PRs se convierten en actualizaciones",
    aiAssist: "Weave AI",
    aiAssistDesc: "Asistente para el refinamiento de flujos",
  }`;

updateLocale('web/app/auth/_i18n/locales/pt-br.ts', ptBR);
updateLocale('web/app/auth/_i18n/locales/en-us.ts', enUS);
updateLocale('web/app/auth/_i18n/locales/es-es.ts', esES);
