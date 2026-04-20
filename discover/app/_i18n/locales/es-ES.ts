import type { TranslationKeys } from "./pt-BR";

const esES: TranslationKeys = {
  navbar: {
    cta: "Empezar ahora",
    bookDemo: "Reservar demo",
    home: "Inicio",
    login: "Entrar",
    menu: "Menú",
    closeMenu: "Cerrar menú",
    privacy: "Privacidad",
    terms: "Términos",
    theme: "Tema",
  },
  footer: {
    privacyNotice: "Aviso de privacidad",
    termsOfService: "Términos del servicio",
    dataProcessingAddendum: "Anexo de tratamiento de datos",
  },
  home: {
    badge: "Espacio de Trabajo Inteligente",
    heroTitle: "Donde tus ideas <br /> cobran vida.",
    heroDescription: "Weave Notes combina notas rápidas, gestión de proyectos e IA potente en una interfaz limpia y rápida. El espacio de trabajo que siempre quisiste, sin la complejidad que odias.",
    ctaGetStarted: "Comenzar Gratis",
    ctaViewTerms: "Ver Términos",
    heroVisual: {
      kicker: "CÓMO FUNCIONA",
      headline: "Un espacio de trabajo inteligente para quien piensa con inteligencia.",
      headlineSub:
        "Gestión de proyectos con IA, automatizaciones, integraciones corporativas y métricas de productividad.",
      cardTitle: "Comprensión asistida por agentes",
      cardDescription:
        "Los espacios complejos se convierten en contexto claro y listo para la IA, con vínculos semánticos entre notas y tareas.",
    },
    principles: {
      sectionAria: "Cuatro principios del producto",
      items: [
        {
          title: "IA y automatizaciones",
          description:
            "Asistentes en el contexto de tus notas y proyectos, con resúmenes, sugerencias y rutinas que reducen el trabajo manual.",
        },
        {
          title: "Integraciones corporativas",
          description:
            "Conecta identidad, calendario y flujos con lo que la empresa ya usa, con gobernanza y SSO cuando lo necesites.",
        },
        {
          title: "Métricas de productividad",
          description:
            "Sigue entregas, plazos y ritmo del equipo con señales claras en el producto, sin depender de hojas paralelas.",
        },
        {
          title: "Productividad",
          description:
            "Una experiencia ligera: menos fricción entre notas, tareas y agenda para que el equipo mantenga el foco.",
        },
      ],
    },
    features: {
      weaveAi: {
        title: "Weave AI",
        description: "Chat, resúmenes y edición inteligente integrados en tus notas.",
      },
      notesProjects: {
        title: "Notas y Proyectos",
        description: "Jerarquía flexible, editor de texto enriquecido y relación inteligente entre notas y tareas.",
      },
      workspaceTimes: {
        title: "Equipos de Trabajo",
        description: "Organizaciones con permisos granulares, marca y colaboración en tiempo real.",
      },
      googleEcosystem: {
        title: "Ecosistema Google",
        description: "Integración total con Google OAuth y Google Calendar para flujos de trabajo fluidos.",
      },
    },
    contact: {
      headline: "Un workspace inteligente para quien piensa con inteligencia.",
      contactSales: "Contacto",
      ctaCreateWorkspace: "Crear workspace",
      exploreLabel: "Explora el producto",
      newsletterKicker: "NEWSLETTER",
      newsletterTitle: "Novedades en tu correo",
      newsletterDescription:
        "Solo escribimos cuando hay algo relevante: producto, privacidad y buenas prácticas.",
      emailPlaceholder: "Ej.: nombre@empresa.com",
      subscribe: "Suscribirse",
      navSolutions: "SOLUCIONES",
      navProduct: "PRODUCTO",
      navResources: "RECURSOS",
      navCompany: "EMPRESA",
      linkPlansFeatures: "Planes y features",
      linkOpenApp: "Abrir la app",
      linkSupport: "Centro de ayuda",
      linkBlog: "Blog",
      trustPrivacy: "Privacidad",
      trustTerms: "Términos",
      trustSource: "Código abierto",
      siteMapAria: "Mapa del sitio",
      taglineCarouselAria: "Destacados del producto",
      taglineCarouselDotsAria: "Navegación de palabras destacadas",
      taglineVerbs: ["Piensa", "Organiza", "Automatiza", "Colabora"],
      taglineSuffix: "Hazlo mejor para tu empresa!",
    },
    mission: {
      title: "Nuestra Misión: <br /> Flujo Total.",
      description: "Creemos que la herramienta debe desaparecer para que el pensamiento fluya. Eliminamos la fricción entre la idea y la captura, uniendo IA con minimalismo.",
      secondaryFeatures: {
        weaveAiNative: "Weave AI Nativo",
        fileUpload: "Carga de Archivos",
        googleCalendarSync: "Sincronización con Google Calendar",
        realtimeCollaboration: "Colaboración en Tiempo Real",
      },
      cards: {
        fast: "Rápido",
        simple: "Simple",
        ready: "Listo",
        modern: "Moderno",
      }
    },
    featureCards: {
      kicker: "FUNCIONALIDADES",
      title: "Qué hace la plataforma",
      subtitle: "Desliza cada módulo — integraciones y flujo en un vistazo.",
      ctaLabel: "Empezar gratis",
      carouselPrev: "Diapositiva anterior",
      carouselNext: "Siguiente diapositiva",
      carouselDots: "Ir a la diapositiva",
      items: [
        {
          slug: "projects",
          title: "Gestión de proyectos",
          summary: "Kanban, Scrum, lista, calendario y cronograma.",
        },
        {
          slug: "tasks",
          title: "Tareas",
          summary: "Bloques, arrastrar y comentarios en contexto.",
        },
        {
          slug: "orgs",
          title: "Organizaciones",
          summary: "Áreas anidadas, roles y dominio verificado por DNS.",
        },
        {
          slug: "weaveAi",
          title: "Weave AI",
          summary: "Chat en la app y resúmenes por correo.",
        },
        {
          slug: "calendar",
          title: "Agenda",
          summary: "Sincronización con Google Calendar.",
        },
        {
          slug: "notifications",
          title: "Notificaciones",
          summary: "En la app y por correo, donde importa.",
        },
        {
          slug: "auth",
          title: "Acceso seguro",
          summary: "Correo, Google, GitHub y Microsoft (pronto).",
        },
        {
          slug: "plans",
          title: "Planes",
          summary: "Límites claros — de individual a empresa.",
        },
        {
          slug: "backup",
          title: "Copia y exportación",
          summary: "Respaldo y exportación en evolución.",
        },
      ],
    },
  },
  loading: {
    title: "Weave Notes",
    message: "Cargando contenido...",
  }
};

export default esES;
