import "dotenv/config";
// import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/src/generated/prisma/client";

// const connectionString = `${process.env.DATABASE_URL}`;
// const pool = new Pool({ connectionString });
const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});
// const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  // Sources
  const sources = await prisma.applicationSource.createMany({
    data: [
      { name: "Sitio Web", type: "INTERNAL" },
      { name: "Facebook", type: "SOCIAL" },
      { name: "Indeed", type: "EXTERNAL" },
      { name: "OCC", type: "EXTERNAL" },
      { name: "LinkedIn", type: "EXTERNAL" },
      { name: "Referido", type: "REFERRAL" },
    ],
    skipDuplicates: true,
  });

  // Departments
  const departments = await prisma.department.createMany({
    data: [
      { name: "Enfermería", slug: "enfermeria" },
      { name: "Médicos", slug: "medicos" },
      { name: "Administración", slug: "administracion" },
      { name: "TI", slug: "ti" },
      { name: "Recursos Humanos", slug: "rrhh" },
    ],
    skipDuplicates: true,
  });

  // Job categories
  const jobCategories = await prisma.jobCategory.createMany({
    data: [
      { name: "Salud", slug: "salud" },
      { name: "Administrativo", slug: "administrativo" },
      { name: "Tecnología", slug: "tecnologia" },
    ],
    skipDuplicates: true,
  });

  // Branches
  const branches = await prisma.branch.createMany({
    data: [
      {
        name: "Sucursal Centro",
        city: "CDMX",
        state: "CDMX",
        country: "México",
      },
      {
        name: "Sucursal Norte",
        city: "Monterrey",
        state: "Nuevo León",
        country: "México",
      },
    ],
    skipDuplicates: true,
  });

  // Caso de uso
  const enfermeria = await prisma.department.upsert({
    where: { slug: "enfermeria" },
    update: {},
    create: { name: "Enfermería", slug: "enfermeria" },
  });

  const salud = await prisma.jobCategory.upsert({
    where: { slug: "salud" },
    update: {},
    create: { name: "Salud", slug: "salud" },
  });

  const org = await prisma.organization.create({
    data: { name: "Hospital Central", website: "https://hospital.com" },
  });

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

      isRemote: false,
    },
  });

  console.log({ sources, departments, jobCategories, branches });
  console.log({ enfermeria, job });
}
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
