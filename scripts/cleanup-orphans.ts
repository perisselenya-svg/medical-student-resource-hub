/**
 * Reconcile stored files with the database.
 *
 *   npm run storage:cleanup            # dry run: report only
 *   npm run storage:cleanup -- --delete
 *
 * Orphans (files with no Material row) can appear if a process crashes between
 * deleting a row and deleting its file. They are never served (files are only
 * reachable through a DB lookup), but they waste disk. Run with --delete during
 * a quiet period so an in-flight upload is not mistaken for an orphan.
 * Also reports rows whose file is missing (restore those from backup).
 */
import "dotenv/config";
import { db } from "@/lib/db";
import { storage } from "@/lib/files/storage";

async function main() {
  const shouldDelete = process.argv.includes("--delete");
  const rows = await db().material.findMany({ select: { id: true, title: true, storedFileName: true } });
  const known = new Set(rows.map((r) => r.storedFileName));

  const orphans: string[] = [];
  for await (const key of storage().listKeys()) if (!known.has(key)) orphans.push(key);

  const missing: typeof rows = [];
  for (const row of rows) if (!(await storage().stat(row.storedFileName))) missing.push(row);

  console.log(`Materials: ${rows.length} · orphaned files: ${orphans.length} · missing files: ${missing.length}`);
  for (const key of orphans) {
    if (shouldDelete) {
      await storage().delete(key);
      console.log(`  deleted orphan ${key}`);
    } else console.log(`  orphan ${key}`);
  }
  for (const row of missing) console.log(`  MISSING file for "${row.title}" (${row.id}): ${row.storedFileName}`);
  if (!shouldDelete && orphans.length > 0) console.log("Re-run with --delete to remove orphaned files.");
}

main()
  .then(() => db().$disconnect())
  .catch(async (error) => {
    console.error(error);
    await db().$disconnect();
    process.exit(1);
  });
