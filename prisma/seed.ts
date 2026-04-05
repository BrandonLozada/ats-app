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
  // Admin Role con permisos
  const adminRole = await prisma.role.create({
    data: {
      name: "ADMIN",
      permissions: {
        create: [
          {
            permission: {
              connectOrCreate: {
                where: { name: "application.create" },
                create: { name: "application.create" },
              },
            },
          },
          {
            permission: {
              connectOrCreate: {
                where: { name: "application.move_stage" },
                create: { name: "application.move_stage" },
              },
            },
          },
          {
            permission: {
              connectOrCreate: {
                where: { name: "application.read" },
                create: { name: "application.read" },
              },
            },
          },
        ],
      },
    },
    include: {
      permissions: { include: { permission: true } },
    },
  });
  console.log("✅ Rol ADMIN creado:", adminRole);

  // Recruiter Role con permisos
  const recruiterRole = await prisma.role.create({
    data: {
      name: "RECRUITER",
      permissions: {
        create: [
          {
            permission: {
              connectOrCreate: {
                where: { name: "application.create" },
                create: { name: "application.create" },
              },
            },
          },
          {
            permission: {
              connectOrCreate: {
                where: { name: "application.move_stage" },
                create: { name: "application.move_stage" },
              },
            },
          },
          {
            permission: {
              connectOrCreate: {
                where: { name: "application.read" },
                create: { name: "application.read" },
              },
            },
          },
        ],
      },
    },
    include: {
      permissions: { include: { permission: true } },
    },
  });
  console.log("✅ Rol RECRUITER creado:", recruiterRole);

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

  // Pipeline con stages
  const pipeline = await prisma.hiringPipeline.create({
    data: {
      name: "Default Hiring",
      isDefault: true,
      stages: {
        create: [
          { name: "stage_1", type: "APPLIED", order: 1, isFinal: false },
          { name: "stage_2", type: "SCREENING", order: 2, isFinal: false },
          { name: "stage_3", type: "INTERVIEW", order: 3, isFinal: false },
          { name: "stage_4", type: "OFFER", order: 4, isFinal: false },
          { name: "stage_5", type: "HIRED", order: 5, isFinal: true },
          { name: "stage_6", type: "REJECTED", order: 6, isFinal: true },
        ],
      },
    },
    include: { stages: true },
  });
  console.log("✅ Pipeline creado:", pipeline);

  // Departments
  const departments = await prisma.department.createMany({
    data: [
      { name: "Urgencias", slug: "urgencias" },
      { name: "Consulta Externa", slug: "consulta-externa" },
      { name: "Administración", slug: "administracion" },
      { name: "Laboratorio", slug: "laboratorio" },
      { name: "Imagenología", slug: "imagenologia" },
      { name: "Farmacia", slug: "farmacia" },
      { name: "Enfermería", slug: "enfermeria" },
      { name: "Médicos", slug: "medicos" },
      { name: "TI", slug: "ti" },
      { name: "Recursos Humanos", slug: "rrhh" },
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

  // Branches
  const branches = await prisma.branch.createMany({
    data: [
      {
        name: "Palacio de Justicia",
        city: "San Nicolás de los Garza",
        state: "Nuevo León",
        country: "México",
      },
      {
        name: "Topo Chico",
        city: "San Nicolás de los Garza",
        state: "Nuevo León",
        country: "México",
      },
    ],
    skipDuplicates: true,
  });
  console.log("✅ Branches creados:", branches);

  // Caso de uso: upsert
  const enfermeria = await prisma.department.upsert({
    where: { slug: "enfermeria" },
    update: {},
    create: { name: "Enfermería", slug: "enfermeria" },
  });
  console.log("✅ Department upsert:", enfermeria);

  const salud = await prisma.jobCategory.upsert({
    where: { slug: "salud" },
    update: {},
    create: { name: "Salud", slug: "salud" },
  });
  console.log("✅ JobCategory upsert:", salud);

  const org = await prisma.organization.create({
    data: { name: COMPANY_NAME, website: COMPANY_DOMAIN },
  });
  console.log("✅ Organization creada:", org);

  const job = await prisma.jobPosting.create({
    data: {
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
  console.log("✅ JobPosting creado:", job);
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

main()
  .then(async () => {
    await prisma.$disconnect();
    // await pool.end();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    // await pool.end();
    process.exit(1);
  });
