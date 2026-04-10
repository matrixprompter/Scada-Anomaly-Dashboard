/**
 * Supabase Migration Runner
 *
 * Kullanim:
 *   npx tsx supabase/run-migrations.ts
 *
 * .env.local dosyasindaki NEXT_PUBLIC_SUPABASE_URL ve SUPABASE_SERVICE_ROLE_KEY
 * degiskenlerini kullanir.
 *
 * Alternatif: supabase/migrations/000_all_migrations.sql dosyasini
 * Supabase Dashboard > SQL Editor'da dogrudan calistirabilirsiniz.
 */

import * as fs from "fs";
import * as path from "path";

// .env.local dosyasini oku
const envPath = path.resolve(__dirname, "../.env.local");
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf-8");
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#")) {
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx > 0) {
        const key = trimmed.slice(0, eqIdx);
        const value = trimmed.slice(eqIdx + 1);
        process.env[key] = value;
      }
    }
  }
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("HATA: .env.local dosyasinda NEXT_PUBLIC_SUPABASE_URL ve SUPABASE_SERVICE_ROLE_KEY tanimli olmali.");
  process.exit(1);
}

const migrationsDir = path.resolve(__dirname, "migrations");

const migrationFiles = fs
  .readdirSync(migrationsDir)
  .filter((f) => f.endsWith(".sql") && f !== "000_all_migrations.sql")
  .sort();

async function executeSql(sql: string, fileName: string): Promise<boolean> {
  // Supabase REST API ile SQL calistirmak icin pg_net veya
  // dogrudan /rest/v1/rpc kullanilabilir.
  // Ancak en guvenilir yontem Supabase Management API.
  // Burada basit bir yaklasim kullaniyoruz.

  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/`, {
    method: "POST",
    headers: {
      apikey: SERVICE_ROLE_KEY!,
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify({}),
  });

  // RPC endpoint'i olmadan dogrudan SQL calistirmak icin
  // Supabase Dashboard SQL Editor kullanmak en pratik yol.
  // Bu script migration dosyalarini sirali okuyup gosterir.

  console.log(`\n--- ${fileName} ---`);
  console.log(sql.trim());
  return true;
}

async function main() {
  console.log("=== SCADA Anomali Dashboard - Supabase Migrations ===\n");
  console.log(`Supabase URL: ${SUPABASE_URL}`);
  console.log(`Migration dosyalari: ${migrationFiles.length} adet\n`);
  console.log("ONEMLI: Asagidaki SQL'leri Supabase Dashboard > SQL Editor'da calistirin.");
  console.log("Veya 000_all_migrations.sql dosyasini tek seferde kopyalayip yapistirin.\n");
  console.log("=".repeat(60));

  for (const file of migrationFiles) {
    const filePath = path.join(migrationsDir, file);
    const sql = fs.readFileSync(filePath, "utf-8");
    await executeSql(sql, file);
  }

  console.log("\n" + "=".repeat(60));
  console.log("\nTum migration SQL'leri yukarida listelendi.");
  console.log("Supabase Dashboard > SQL Editor'da calistirin.");
}

main().catch(console.error);
