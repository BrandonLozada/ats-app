import * as dotenv from "dotenv";
import { Client } from "pg";
dotenv.config();

async function inspectDb() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) throw new Error("DATABASE_URL is not set");

  const client = new Client({ connectionString: dbUrl });
  await client.connect();

  try {
    console.log("=== 1. TENANTS ===");
    const tenants = await client.query(`SELECT id, slug, name FROM tenants ORDER BY created_at ASC;`);
    console.log(JSON.stringify(tenants.rows, null, 2));

    console.log("\n=== 2. HIRING PIPELINES ===");
    const pipelines = await client.query(`SELECT id, tenant_id, name, is_default, created_at, updated_at FROM hiring_pipelines ORDER BY created_at ASC;`);
    console.log(JSON.stringify(pipelines.rows, null, 2));

    console.log("\n=== 3. PIPELINE VERSIONS ===");
    const versions = await client.query(`SELECT id, tenant_id, pipeline_id, version, status, published_at, created_at FROM pipeline_versions ORDER BY pipeline_id, version ASC;`);
    console.log(JSON.stringify(versions.rows, null, 2));

    console.log("\n=== 4. PIPELINE STAGES ===");
    const stages = await client.query(`
      SELECT 
        s.id,
        s.pipeline_version_id,
        v.pipeline_id,
        s.order,
        s.name,
        s.category,
        s.is_initial,
        s.created_at
      FROM pipeline_stages s
      JOIN pipeline_versions v ON s.pipeline_version_id = v.id
      ORDER BY s.pipeline_version_id, s.order ASC;
    `);
    console.table(stages.rows);

    console.log("\n=== 5. JOB POSTINGS PIPELINE REFERENCES ===");
    const jobPostings = await client.query(`
      SELECT id, title, pipeline_id, status, created_at 
      FROM job_postings 
      ORDER BY created_at ASC;
    `);
    console.table(jobPostings.rows);

    console.log("\n=== 6. APPLICATION REFERENCES PER STAGE ===");
    const appRefs = await client.query(`
      SELECT 
        s.id AS stage_id,
        s.name AS stage_name,
        s.category,
        COUNT(a.id) AS application_count
      FROM pipeline_stages s
      LEFT JOIN applications a ON a.stage_id = s.id
      GROUP BY s.id, s.name, s.category
      ORDER BY s.id;
    `);
    console.table(appRefs.rows);

    console.log("\n=== 7. APPLICATION STAGE HISTORY REFERENCES PER STAGE ===");
    const historyRefs = await client.query(`
      SELECT 
        s.id AS stage_id,
        s.name AS stage_name,
        s.category,
        (SELECT COUNT(*) FROM application_stage_history WHERE from_stage_id = s.id) AS from_history_count,
        (SELECT COUNT(*) FROM application_stage_history WHERE to_stage_id = s.id) AS to_history_count
      FROM pipeline_stages s
      ORDER BY s.id;
    `);
    console.table(historyRefs.rows);

    console.log("\n=== 8. INTERVIEW REFERENCES PER STAGE ===");
    const interviewRefs = await client.query(`
      SELECT 
        s.id AS stage_id,
        s.name AS stage_name,
        s.category,
        COUNT(i.id) AS interview_count
      FROM pipeline_stages s
      LEFT JOIN interviews i ON i.stage_id = s.id
      GROUP BY s.id, s.name, s.category
      ORDER BY s.id;
    `);
    console.table(interviewRefs.rows);

    console.log("\n=== 9. TOTAL ROWS IN DB ===");
    const totalApps = await client.query(`SELECT COUNT(*) AS total FROM applications;`);
    const totalHist = await client.query(`SELECT COUNT(*) AS total FROM application_stage_history;`);
    const totalInterviews = await client.query(`SELECT COUNT(*) AS total FROM interviews;`);
    console.log("Total applications:", totalApps.rows[0].total);
    console.log("Total application stage histories:", totalHist.rows[0].total);
    console.log("Total interviews:", totalInterviews.rows[0].total);

  } finally {
    await client.end();
  }
}

inspectDb().catch((err) => {
  console.error("Inspection error:", err);
  process.exit(1);
});
