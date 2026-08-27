const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const PLANS = [
  {
    name: 'Self-Hosted Unlimited',
    description: 'Plano base para instalações auto-hospedadas (Open Source).',
    plan_value: 0,
    details: {
      metadata: {
        type: 'self_hosted',
        is_signup_default: true,
        cloud_addons_allowed: true,
      },
      limits: {
        users: -1,
        ai_messages: -1,
        storage_mb: -1,
        projects: -1,
        notes: -1,
      },
      features: {
        sso: false,
        audit_logs: false,
        advanced_roles: false,
        white_label: false,
        cloud_sync: false,
      },
    },
  },
  {
    name: 'Business Star',
    description: 'Plano de entrada para a Weave Cloud, focado em pequenos times.',
    plan_value: 0,
    details: {
      metadata: { type: 'cloud', tier: 'star' },
      limits: {
        users: 10,
        ai_messages: 2000,
        storage_mb: 10240,
        projects: 20,
        notes: -1,
      },
      features: {
        sso: false,
        audit_logs: false,
        advanced_roles: false,
        white_label: false,
        support: 'standard',
      },
    },
  },
  {
    name: 'Business Galaxy',
    description: 'Plano intermediário Cloud para empresas em crescimento.',
    plan_value: 0,
    details: {
      metadata: { type: 'cloud', tier: 'galaxy' },
      limits: {
        users: 50,
        ai_messages: 10000,
        storage_mb: 51200,
        projects: -1,
        notes: -1,
      },
      features: {
        sso: true,
        audit_logs: true,
        advanced_roles: true,
        white_label: false,
        support: 'priority',
      },
    },
  },
  {
    name: 'Business Supernova',
    description: 'Plano avançado Cloud para grandes organizações.',
    plan_value: 0,
    details: {
      metadata: { type: 'cloud', tier: 'supernova' },
      limits: {
        users: 200,
        ai_messages: 50000,
        storage_mb: 204800,
        projects: -1,
        notes: -1,
      },
      features: {
        sso: true,
        audit_logs: true,
        advanced_roles: true,
        white_label: true,
        custom_domains: true,
        support: '24_7_dedicated',
      },
    },
  },
  {
    name: 'Business DarkMatter',
    description: 'Enterprise Cloud ilimitado, infraestrutura dedicada.',
    plan_value: 0,
    details: {
      metadata: { type: 'cloud', tier: 'darkmatter' },
      limits: {
        users: -1,
        ai_messages: -1,
        storage_mb: -1,
        projects: -1,
        notes: -1,
      },
      features: {
        sso: true,
        audit_logs: true,
        advanced_roles: true,
        white_label: true,
        custom_domains: true,
        dedicated_infrastructure: true,
        support: 'dedicated_account_manager',
      },
    },
  },
];

async function main() {
  console.log('🌱 Iniciando DB Seeding...');

  for (const plan of PLANS) {
    const upsertedPlan = await prisma.plans.upsert({
      where: { name: plan.name },
      update: {
        description: plan.description,
        plan_value: plan.plan_value,
        details: plan.details,
      },
      create: plan,
    });
    console.log(`✅ Plano "${upsertedPlan.name}" inserido/atualizado com sucesso.`);
  }

  console.log('✅ DB Seeding finalizado.');
}

main()
  .catch((e) => {
    console.error('❌ Erro durante o seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
