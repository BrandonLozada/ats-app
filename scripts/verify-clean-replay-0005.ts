import "dotenv/config";
import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";
import { Client } from "pg";

async function main() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    throw new Error("DATABASE_URL not set");
  }

  const client = new Client({ connectionString: dbUrl });
  await client.connect();

  console.log("=== Testing Migration Chain Replay on Clean Schema (0001 -> 0002 -> 0003 -> 0004 -> 0005) ===");
  const testSchema = "ats_test_clean_0005";
  await client.query(`DROP SCHEMA IF EXISTS "${testSchema}" CASCADE;`);
  await client.query(`CREATE SCHEMA "${testSchema}";`);

  // Set search_path to testSchema
  await client.query(`SET search_path TO "${testSchema}";`);

  console.log("Applying 0001_baseline...");
  const baselineSql = fs.readFileSync(
    path.resolve(process.cwd(), "prisma/migrations/0001_baseline/migration.sql"),
    "utf-8"
  );
  await client.query(baselineSql);
  console.log("PASS: 0001_baseline applied.");

  console.log("Applying 0002_authorization_foundation...");
  const authSql = fs.readFileSync(
    path.resolve(process.cwd(), "prisma/migrations/0002_authorization_foundation/migration.sql"),
    "utf-8"
  );
  await client.query(authSql);
  console.log("PASS: 0002_authorization_foundation applied.");

  console.log("Applying 0003_pipeline_version_foundation...");
  const pipeSql = fs.readFileSync(
    path.resolve(process.cwd(), "prisma/migrations/0003_pipeline_version_foundation/migration.sql"),
    "utf-8"
  );
  await client.query(pipeSql);
  console.log("PASS: 0003_pipeline_version_foundation applied.");

  console.log("Applying 0004_vacancy_foundation...");
  const vacancySql = fs.readFileSync(
    path.resolve(process.cwd(), "prisma/migrations/0004_vacancy_foundation/migration.sql"),
    "utf-8"
  );
  await client.query(vacancySql);
  console.log("PASS: 0004_vacancy_foundation applied.");

  console.log("Applying 0005_vacancy_location_headcount...");
  const headcountSql = fs.readFileSync(
    path.resolve(process.cwd(), "prisma/migrations/0005_vacancy_location_headcount/migration.sql"),
    "utf-8"
  );
  await client.query(headcountSql);
  console.log("PASS: 0005_vacancy_location_headcount applied.");

  await client.end();

  console.log("Verifying zero diff against current schema.prisma...");
  const testUrl = dbUrl.replace(/schema=[^&]*/, `schema=${testSchema}`);
  const diffOutput = execSync(
    `npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --script`,
    {
      env: { ...process.env, DATABASE_URL: testUrl },
      encoding: "utf-8",
    }
  );

  console.log("Diff output:\n", diffOutput.trim());
  if (!diffOutput.includes("-- This is an empty migration.")) {
    throw new Error("Expected zero diff, but got:\n" + diffOutput);
  }

  console.log("=== SUCCESS: Full migration chain 0001 -> 0002 -> 0003 -> 0004 -> 0005 replays with ZERO DIFF! ===");

  // Cleanup test schema
  const cleanupClient = new Client({ connectionString: dbUrl });
  await cleanupClient.connect();
  await cleanupClient.query(`DROP SCHEMA IF EXISTS "${testSchema}" CASCADE;`);
  await cleanupClient.end();
  console.log("Cleaned up test schema.");
}

main().catch((err) => {
  console.error("Clean replay verification failed:", err);
  process.exit(1);
});
