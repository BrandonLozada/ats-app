import "dotenv/config";

// import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { COMPANY_DOMAIN, COMPANY_NAME } from "@/config/app";

// const connectionString = `${process.env.DATABASE_URL}`;
// const pool = new Pool({ connectionString });
const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});
// const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  // Global Canonical Permissions
  const permissionsList = [
    "application.create",
    "application.read",
    "application.move_stage",
    "vacancy.create",
    "vacancy.publish",
    "candidate.create",
    "candidate.read",
    "tenant.manage",
    "pipeline.manage",
  ];

  const permissions: Record<string, { id: string; name: string }> = {};
  for (const name of permissionsList) {
    const perm = await prisma.permission.upsert({
      where: { name },
      update: {},
      create: { name },
    });
    permissions[name] = perm;
  }
  console.log("✅ Permisos globales creados/upserted:", Object.keys(permissions));

  // Sources
  const sources = await prisma.applicationSource.createMany({
    data: [
      { name: "Website", type: "INTERNAL" },
      { name: "LinkedIn", type: "EXTERNAL" },
      { name: "Referral", type: "REFERRAL" },
      { name: "Facebook", type: "SOCIAL" },
      { name: "Indeed", type: "EXTERNAL" },
      { name: "OCC", type: "EXTERNAL" },
    ],
    skipDuplicates: true,
  });
  console.log("✅ Sources creados:", sources);

  // Canonical Tenancy Bootstrap
  const tenant = await prisma.tenant.upsert({
    where: { slug: "ama" },
    update: {},
    create: {
      id: "e6759b00-099e-443a-8aa5-2bfc67b191ea",
      name: COMPANY_NAME,
      slug: "ama",
    },
  });
  console.log("✅ Tenant creado/upserted:", tenant);

  // Pipeline con stages (Tenant-scoped con PipelineVersion)
  let pipeline = await prisma.hiringPipeline.findFirst({
    where: { tenantId: tenant.id, name: "Default Hiring" },
    include: { versions: { include: { stages: true } } },
  });
  if (!pipeline) {
    pipeline = await prisma.hiringPipeline.create({
      data: {
        tenantId: tenant.id,
        name: "Default Hiring",
        isDefault: true,
        versions: {
          create: [
            {
              version: 1,
              status: "DRAFT",
              stages: {
                create: [
                  { name: "stage_1", category: "APPLIED", order: 1, isInitial: true },
                  { name: "stage_2", category: "SCREENING", order: 2, isInitial: false },
                  { name: "stage_3", category: "INTERVIEW", order: 3, isInitial: false },
                  { name: "stage_4", category: "OFFER", order: 4, isInitial: false },
                ],
              },
            },
          ],
        },
      },
      include: { versions: { include: { stages: true } } },
    });
  }
  if (!pipeline) {
    throw new Error("Failed to initialize pipeline");
  }
  console.log("✅ Pipeline creado/obtenido:", pipeline.name);


  // Seed Canonical Roles per AMA Tenant
  const rolesToSeed = [
    {
      name: "TenantAdmin",
      systemKey: "TENANT_ADMIN",
      isSystem: true,
      permissions: permissionsList,
    },
    {
      name: "Recruiter",
      systemKey: "RECRUITER",
      isSystem: true,
      permissions: [
        "vacancy.create",
        "vacancy.publish",
        "application.create",
        "application.read",
        "application.move_stage",
        "candidate.create",
        "candidate.read",
      ],
    },
    {
      name: "HRManager",
      systemKey: "HR_MANAGER",
      isSystem: true,
      permissions: [
        "vacancy.create",
        "vacancy.publish",
        "application.read",
        "candidate.read",
      ],
    },
  ];

  for (const r of rolesToSeed) {
    const role = await prisma.role.upsert({
      where: {
        tenantId_systemKey: {
          tenantId: tenant.id,
          systemKey: r.systemKey,
        },
      },
      update: {
        name: r.name,
        isSystem: r.isSystem,
      },
      create: {
        tenantId: tenant.id,
        name: r.name,
        systemKey: r.systemKey,
        isSystem: r.isSystem,
      },
    });

    for (const permName of r.permissions) {
      const perm = permissions[permName];
      if (perm) {
        await prisma.rolePermission.upsert({
          where: {
            roleId_permissionId: {
              roleId: role.id,
              permissionId: perm.id,
            },
          },
          update: {},
          create: {
            roleId: role.id,
            permissionId: perm.id,
          },
        });
      }
    }
    console.log(`✅ Rol ${r.name} (${r.systemKey}) configurado para tenant ${tenant.slug}`);
  }

  // TenantMembership Bootstrap: Seed creates zero default memberships.
  // Membership creation happens when a real user is intentionally associated with a tenant.
  console.log("ℹ️ Zero TenantMembership fixtures seeded. Intentional tenant membership creation is deferred to user/organization lifecycle.");

  const leAnahuac = await prisma.legalEntity.upsert({
    where: { tenantId_name: { tenantId: tenant.id, name: "AMA Anáhuac" } },
    update: {},
    create: {
      id: "11111111-1111-4111-a111-111111111111",
      tenantId: tenant.id,
      name: "AMA Anáhuac",
      code: "ANAHUAC",
    },
  });
  const leApodaca = await prisma.legalEntity.upsert({
    where: { tenantId_name: { tenantId: tenant.id, name: "AMA Apodaca" } },
    update: {},
    create: {
      id: "22222222-2222-4222-a222-222222222222",
      tenantId: tenant.id,
      name: "AMA Apodaca",
      code: "APODACA",
    },
  });
  console.log("✅ LegalEntities creadas:", [leAnahuac.name, leApodaca.name]);

  await prisma.location.upsert({
    where: { tenantId_legalEntityId_name: { tenantId: tenant.id, legalEntityId: leAnahuac.id, name: "Anáhuac" } },
    update: {},
    create: {
      id: "33333333-3333-4333-a333-333333333333",
      tenantId: tenant.id,
      legalEntityId: leAnahuac.id,
      name: "Anáhuac",
      code: "ANAHUAC",
    },
  });
  await prisma.location.upsert({
    where: { tenantId_legalEntityId_name: { tenantId: tenant.id, legalEntityId: leApodaca.id, name: "Apodaca" } },
    update: {},
    create: {
      id: "44444444-4444-4444-a444-444444444444",
      tenantId: tenant.id,
      legalEntityId: leApodaca.id,
      name: "Apodaca",
      code: "APODACA",
    },
  });
  console.log("✅ Locations creadas: Anáhuac, Apodaca");

  // Departments (Tenant-scoped)
  const departments = await prisma.department.createMany({
    data: [
      { tenantId: tenant.id, name: "Urgencias", slug: "urgencias" },
      { tenantId: tenant.id, name: "Consulta Externa", slug: "consulta-externa" },
      { tenantId: tenant.id, name: "Administración", slug: "administracion" },
      { tenantId: tenant.id, name: "Laboratorio", slug: "laboratorio" },
      { tenantId: tenant.id, name: "Imagenología", slug: "imagenologia" },
      { tenantId: tenant.id, name: "Farmacia", slug: "farmacia" },
      { tenantId: tenant.id, name: "Enfermería", slug: "enfermeria" },
      { tenantId: tenant.id, name: "Médicos", slug: "medicos" },
      { tenantId: tenant.id, name: "TI", slug: "ti" },
      { tenantId: tenant.id, name: "Recursos Humanos", slug: "rrhh" },
    ],
    skipDuplicates: true,
  });
  console.log("✅ Departments creados:", departments);

  // Job categories
  const jobCategories = await prisma.jobCategory.createMany({
    data: [
      { name: "Salud", slug: "salud" },
      { name: "Administrativo", slug: "administrativo" },
      { name: "Tecnología", slug: "tecnologia" },
      { name: "Técnico", slug: "tecnico" },
      { name: "Limpieza", slug: "limpieza" },
      { name: "Mantenimiento", slug: "mantenimiento" },
    ],
    skipDuplicates: true,
  });
  console.log("✅ Job categories creados:", jobCategories);

  // Caso de uso: upsert
  const enfermeria = await prisma.department.upsert({
    where: { tenantId_slug: { tenantId: tenant.id, slug: "enfermeria" } },
    update: {},
    create: { tenantId: tenant.id, name: "Enfermería", slug: "enfermeria" },
  });
  console.log("✅ Department upsert:", enfermeria);

  const salud = await prisma.jobCategory.upsert({
    where: { slug: "salud" },
    update: {},
    create: { name: "Salud", slug: "salud" },
  });
  console.log("✅ JobCategory upsert:", salud);

  // Organization is a temporary legacy compatibility fixture. It is NOT Tenant.
  const LEGACY_ORG_ID = "00000000-0000-4000-8000-000000000001";
  const org = await prisma.organization.upsert({
    where: { id: LEGACY_ORG_ID },
    update: {},
    create: {
      id: LEGACY_ORG_ID,
      name: COMPANY_NAME,
      website: COMPANY_DOMAIN,
    },
  });
  console.log("✅ Legacy Organization creada/preservada:", org);

  const job = await prisma.jobPosting.upsert({
    where: { slug: "enfermera-general" },
    update: {},
    create: {
      title: "Enfermera General",
      slug: "enfermera-general",
      description: "Atención a pacientes...",
      employmentType: "FULL_TIME",
      status: "PUBLISHED",
      categoryId: salud.id,
      departmentId: enfermeria.id,
      organizationId: org.id,
      pipelineId: pipeline.id,
      isRemote: false,
    },
  });
  console.log("✅ JobPosting creado/upserted:", job);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
