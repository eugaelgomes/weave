const ptBR = {
  navbar: {
    cta: "Cadastre-se",
    bookDemo: "Agendar demo",
    home: "Início",
    login: "Entrar",
    menu: "Menu",
    closeMenu: "Fechar menu",
    privacy: "Privacidade",
    terms: "Termos",
    theme: "Tema",
  },
  footer: {
    privacyNotice: "Aviso de privacidade",
    termsOfService: "Termos de serviço",
    dataProcessingAddendum: "Adendo de tratamento de dados",
  },
  home: {
    badge: "Workspace Inteligente",
    heroTitle: "Onde suas ideias <br /> ganham vida.",
    heroDescription: "Weave Notes combina anotações rápidas, gestão de projetos e IA poderosa em uma interface limpa e rápida. O workspace que você sempre quis, sem a complexidade que você odeia.",
    ctaGetStarted: "Começar Grátis",
    ctaViewTerms: "Ver Termos",
    heroVisual: {
      kicker: "COMO FUNCIONA",
      headline: "Workspace inteligente para quem pensa inteligente!",
      headlineSub:
        "Gestão de Projetos com IA, Automações, Integrações Corporativas e Métricas de Produtividade.",
      cardTitle: "Entendimento orientado a agentes",
      cardDescription:
        "Workspaces densos viram contexto claro e pronto para a IA, com vínculos semânticos entre notas, tarefas e calendário.",
    },
    principles: {
      sectionAria: "Quatro princípios do produto",
      items: [
        {
          title: "IA e automações",
          description:
            "Assistentes no contexto das suas notas e projetos, com resumos, sugestões e rotinas que reduzem trabalho manual.",
        },
        {
          title: "Integrações corporativas",
          description:
            "Conecte identidade, calendário e fluxos aos sistemas que a empresa já usa — com governança e SSO quando precisar.",
        },
        {
          title: "Métricas de produtividade",
          description:
            "Acompanhe entregas, prazos e ritmo do time com sinais claros no produto, sem depender de planilhas paralelas.",
        },
        {
          title: "Produtividade",
          description:
            "Uma experiência enxuta: menos atrito entre anotação, tarefa e agenda para o time manter foco no que importa.",
        },
      ],
    },
    features: {
      weaveAi: {
        title: "Weave AI",
        description: "Chat, resumos e edição inteligente integrada às suas notas.",
      },
      notesProjects: {
        title: "Notas e Projetos",
        description: "Hierarquia flexível, editor rich-text e relacionamento inteligente entre notas e tarefas.",
      },
      workspaceTimes: {
        title: "Workspace Times",
        description: "Organizações com permissões granulares, branding e colaboração em tempo real.",
      },
      googleEcosystem: {
        title: "Ecossistema Google",
        description: "Integração total com OAuth Google e Google Calendar para fluxos de trabalho fluidos.",
      },
    },
    contact: {
      headline: "Workspace inteligente para quem pensa inteligente!",
      contactSales: "Entre em contato",
      ctaCreateWorkspace: "Criar Workspace",
      exploreLabel: "Explore o produto",
      newsletterKicker: "NEWSLETTER",
      newsletterTitle: "Novidades no seu e-mail",
      newsletterDescription:
        "Só enviamos quando houver algo relevante: produto, privacidade e boas práticas.",
      emailPlaceholder: "Ex.: nome@empresa.com",
      subscribe: "Inscrever",
      navSolutions: "SOLUÇÕES",
      navProduct: "PRODUTO",
      navResources: "RECURSOS",
      navCompany: "EMPRESA",
      linkPlansFeatures: "Planos e features",
      linkOpenApp: "Abrir aplicativo",
      linkSupport: "Central de suporte",
      linkBlog: "Blog",
      trustPrivacy: "Privacidade",
      trustTerms: "Termos",
      trustSource: "Open source",
      siteMapAria: "Mapa do site",
      taglineCarouselAria: "Mensagens em destaque",
      taglineCarouselDotsAria: "Navegação das palavras em destaque",
      taglineVerbs: ["Pense", "Organize", "Automatize", "Colabore"],
      taglineSuffix: "Faça o melhor pela sua empresa!",
    },
    mission: {
      title: "Nossa Missão: <br /> Fluxo Total.",
      description: "Acreditamos que a ferramenta deve desaparecer para que o pensamento flua. Removemos o atrito entre a ideia e a captura, unindo IA com minimalismo.",
      secondaryFeatures: {
        weaveAiNative: "Weave AI Nativo",
        fileUpload: "Upload de Arquivos",
        googleCalendarSync: "Google Calendar Sync",
        realtimeCollaboration: "Colaboração Real-time",
      },
      cards: {
        fast: "Rápido",
        simple: "Simples",
        ready: "Pronto",
        modern: "Moderno",
      }
    },
    featureCards: {
      kicker: "FUNCIONALIDADES",
      title: "O que a plataforma faz",
      subtitle: "Deslize para ver cada módulo — integrações e fluxo em destaque.",
      ctaLabel: "Começar grátis",
      carouselPrev: "Slide anterior",
      carouselNext: "Próximo slide",
      carouselDots: "Ir para o slide",
      items: [
        {
          slug: "projects",
          title: "Gestão de projetos",
          summary: "Kanban, Scrum, lista, calendário e timeline.",
        },
        {
          slug: "tasks",
          title: "Tarefas",
          summary: "Blocos, arraste e comentários no contexto.",
        },
        {
          slug: "orgs",
          title: "Organizações",
          summary: "Áreas em árvore, papéis e domínio por DNS.",
        },
        {
          slug: "weaveAi",
          title: "Weave AI",
          summary: "Chat no app e resumos por e-mail.",
        },
        {
          slug: "calendar",
          title: "Agenda",
          summary: "Sincronização com Google Calendar.",
        },
        {
          slug: "notifications",
          title: "Notificações",
          summary: "No app e por e-mail, no que importa.",
        },
        {
          slug: "auth",
          title: "Login seguro",
          summary: "E-mail, Google, GitHub e Microsoft (em breve).",
        },
        {
          slug: "plans",
          title: "Planos",
          summary: "Limites claros — do individual ao corporativo.",
        },
        {
          slug: "backup",
          title: "Backup e exportação",
          summary: "Cópia e exportação em evolução.",
        },
      ],
    },
  },
  loading: {
    title: "Weave Notes",
    message: "Carregando conteúdo...",
  }
};

export default ptBR;
export type TranslationKeys = typeof ptBR;
