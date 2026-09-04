import * as dotenv from "dotenv";
import { Client } from "pg";
dotenv.config();

/**
 * I6-S3-T02 One-Off Canonicalization Script
 *
 * Scoped strictly to the migrated prototype data:
 * - Tenant: slug = 'ama'
 * - HiringPipeline: name = 'Default Hiring'
 * - PipelineVersion: version = 1
 *
 * Invariants enforced:
 * 1. Obsolete prototype terminal stages (stage_5, stage_6 with category OTHER) deleted ONLY if unreferenced.
 * 2. Exactly one initial APPLIED stage with is_initial = true; all other stages is_initial = false.
 * 3. Positive, unique, contiguous stage ordering.
 * 4. Target PipelineVersion marked PUBLISHED with non-null published_at.
 * 5. Fails closed if target is missing, duplicated, or ambiguous.
 */
async function canonicalizePipelineV1() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) throw new Error("DATABASE_URL is not set");

  const client = new Client({ connectionString: dbUrl });
  await client.connect();

  try {
    console.log("=== I6-S3-T02: SCOPED CANONICALIZATION FOR MIGRATED PIPELINE V1 ===");

    await client.query("BEGIN;");

    // 1. Strict scoped target selection (Fail-closed on missing, duplicate, or ambiguous target)
    const targetSelection = await client.query(`
      SELECT 
        t.id AS tenant_id,
        t.slug AS tenant_slug,
        p.id AS pipeline_id,
        p.name AS pipeline_name,
        v.id AS version_id,
        v.version,
        v.status,
        v.published_at
      FROM tenants t
      JOIN hiring_pipelines p ON p.tenant_id = t.id
      JOIN pipeline_versions v ON v.pipeline_id = p.id
      WHERE t.slug = 'ama'
        AND p.name = 'Default Hiring'
        AND v.version = 1;
    `);

    if (targetSelection.rows.length === 0) {
      throw new Error(
        "FAIL-CLOSED: Target pipeline version not found for tenant 'ama', pipeline 'Default Hiring', version 1."
      );
    }

    if (targetSelection.rows.length > 1) {
      throw new Error(
        `FAIL-CLOSED: Ambiguous target. Expected exactly 1 match, found ${targetSelection.rows.length}.`
      );
    }

    const target = targetSelection.rows[0];
    console.log(
      `Target scoped: Tenant "${target.tenant_slug}" (${target.tenant_id}), Pipeline "${target.pipeline_name}" (${target.pipeline_id}), Version ${target.version} (${target.version_id}).`
    );

    // 2. Fetch all stages belonging strictly to the target version
    const stagesRes = await client.query(
      `
      SELECT id, name, category, "order", is_initial
      FROM pipeline_stages
      WHERE pipeline_version_id = $1
      ORDER BY "order" ASC;
    `,
      [target.version_id]
    );

    console.log(`Current stages in scoped version ${target.version}:`);
    console.table(stagesRes.rows);

    // 3. Constrained obsolete prototype terminal stage detection:
    // Only identifies stages from this specific migrated v1 with category 'OTHER'
    // and known prototype artifact names/provenance (stage_5, stage_6, 'hired', 'rejected').
    const obsoleteStages = stagesRes.rows.filter(
      (s: { name: string; category: string }) =>
        s.category === "OTHER" &&
        (s.name === "stage_5" ||
          s.name === "stage_6" ||
          s.name.toLowerCase() === "hired" ||
          s.name.toLowerCase() === "rejected")
    );

    if (obsoleteStages.length > 0) {
      console.log(
        `Identified ${obsoleteStages.length} obsolete prototype terminal stage(s):`,
        obsoleteStages.map((s: { id: string; name: string }) => `${s.name} (${s.id})`)
      );

      // 4. Safety Gates: Reference check before deletion
      for (const obs of obsoleteStages) {
        const appCountRes = await client.query(
          `SELECT COUNT(*) AS count FROM applications WHERE stage_id = $1;`,
          [obs.id]
        );
        const fromHistCountRes = await client.query(
          `SELECT COUNT(*) AS count FROM application_stage_history WHERE from_stage_id = $1;`,
          [obs.id]
        );
        const toHistCountRes = await client.query(
          `SELECT COUNT(*) AS count FROM application_stage_history WHERE to_stage_id = $1;`,
          [obs.id]
        );

        const appCount = parseInt(appCountRes.rows[0].count, 10);
        const fromHistCount = parseInt(fromHistCountRes.rows[0].count, 10);
        const toHistCount = parseInt(toHistCountRes.rows[0].count, 10);

        if (appCount > 0 || fromHistCount > 0 || toHistCount > 0) {
          throw new Error(
            `BLOCKED: Obsolete stage "${obs.name}" (${obs.id}) is referenced by ${appCount} applications, ${fromHistCount} fromStage histories, ${toHistCount} toStage histories. Cannot delete!`
          );
        }

        console.log(`  Safe to delete stage "${obs.name}" (${obs.id}): 0 applications, 0 stage histories.`);
        await client.query(`DELETE FROM pipeline_stages WHERE id = $1;`, [obs.id]);
        console.log(`  Deleted obsolete stage "${obs.name}" (${obs.id}).`);
      }
    } else {
      console.log("No obsolete terminal stages found in scoped version.");
    }

    // 5. Fetch remaining stages after deletion
    const remainingStagesRes = await client.query(
      `
      SELECT id, name, category, "order", is_initial
      FROM pipeline_stages
      WHERE pipeline_version_id = $1
      ORDER BY "order" ASC;
    `,
      [target.version_id]
    );

    if (remainingStagesRes.rows.length === 0) {
      throw new Error(`BLOCKED: Scoped version ${target.version_id} has 0 remaining stages!`);
    }

    // 6. Enforce exactly one initial stage (category APPLIED)
    const appliedStages = remainingStagesRes.rows.filter(
      (s: { category: string }) => s.category === "APPLIED"
    );

    if (appliedStages.length !== 1) {
      throw new Error(
        `BLOCKED: Expected exactly 1 APPLIED stage in version ${target.version_id}, found ${appliedStages.length}`
      );
    }

    const canonicalInitialStageId = appliedStages[0].id;
    console.log(
      `Canonical initial stage: "${appliedStages[0].name}" (${canonicalInitialStageId}) with category APPLIED.`
    );

    // Set is_initial = true for canonical APPLIED stage, false for all other stages in this version
    await client.query(
      `
      UPDATE pipeline_stages 
      SET is_initial = (id = $1)
      WHERE pipeline_version_id = $2;
    `,
      [canonicalInitialStageId, target.version_id]
    );

    // 7. Verify stage order uniqueness and contiguous sequence
    const refreshedStagesRes = await client.query(
      `
      SELECT id, name, category, "order", is_initial
      FROM pipeline_stages
      WHERE pipeline_version_id = $1
      ORDER BY "order" ASC;
    `,
      [target.version_id]
    );

    console.log(`Verifying stage sequence for ${refreshedStagesRes.rows.length} stages...`);
    for (let i = 0; i < refreshedStagesRes.rows.length; i++) {
      const expectedOrder = i + 1;
      const currentStage = refreshedStagesRes.rows[i];
      if (currentStage.order !== expectedOrder) {
        console.log(
          `  Renumbering stage "${currentStage.name}" from order ${currentStage.order} to ${expectedOrder}`
        );
        await client.query(`UPDATE pipeline_stages SET "order" = $1 WHERE id = $2;`, [
          expectedOrder,
          currentStage.id,
        ]);
      }
    }

    // 8. Publish version (if not already published)
    if (target.status !== "PUBLISHED" || !target.published_at) {
      console.log(`Publishing PipelineVersion v${target.version} (${target.version_id})...`);
      await client.query(
        `
        UPDATE pipeline_versions
        SET status = 'PUBLISHED',
            published_at = COALESCE(published_at, NOW()),
            updated_at = NOW()
        WHERE id = $1;
      `,
        [target.version_id]
      );
      console.log(`PipelineVersion v${target.version} is now PUBLISHED.`);
    } else {
      console.log(`PipelineVersion v${target.version} is already PUBLISHED with published_at: ${target.published_at}`);
    }

    // 9. Verify JobPosting references
    const jobPostingsRes = await client.query(
      `
      SELECT jp.id, jp.title, jp.pipeline_id, p.name AS pipeline_name,
             (SELECT COUNT(*) FROM pipeline_versions pv WHERE pv.pipeline_id = jp.pipeline_id AND pv.status = 'PUBLISHED') AS published_version_count
      FROM job_postings jp
      JOIN hiring_pipelines p ON jp.pipeline_id = p.id
      WHERE jp.pipeline_id = $1;
    `,
      [target.pipeline_id]
    );

    console.log("\n=== JOB POSTING RESOLUTION CHECK ===");
    console.table(jobPostingsRes.rows);
    for (const jp of jobPostingsRes.rows) {
      const pubCount = parseInt(jp.published_version_count, 10);
      if (pubCount !== 1) {
        throw new Error(
          `BLOCKED: JobPosting "${jp.title}" (${jp.id}) references pipeline "${jp.pipeline_name}" with ${pubCount} published versions (expected exactly 1)!`
        );
      }
    }

    await client.query("COMMIT;");
    console.log("\n✅ CANONICALIZATION VERIFIED AND COMMITTED SUCCESSFULLY!");
  } catch (err) {
    await client.query("ROLLBACK;");
    console.error("❌ CANONICALIZATION FAILED, ROLLED BACK:", err);
    throw err;
  } finally {
    await client.end();
  }
}

canonicalizePipelineV1().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
