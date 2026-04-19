#!/usr/bin/env node
/**
 * Model Optimization Script
 * 
 * Compresses GLB files using gltf-transform:
 *   - Draco geometry compression
 *   - Texture resize to max 1024px
 *   - Quantize mesh attributes
 *   - Prune unused data
 * 
 * Usage:
 *   npx node scripts/optimize-models.mjs
 *   npx node scripts/optimize-models.mjs --dry-run
 */

import { readdir, stat, rename, copyFile } from "node:fs/promises";
import { join, extname, basename } from "node:path";
import { execSync } from "node:child_process";

const MODELS_DIR = "public/models";
const MAX_TEXTURE_SIZE = 1024;
const DRY_RUN = process.argv.includes("--dry-run");

async function getFileSizeMB(filePath) {
  const s = await stat(filePath);
  return (s.size / (1024 * 1024)).toFixed(2);
}

async function optimizeModel(filePath) {
  const name = basename(filePath);
  const tmpOut = filePath.replace(".glb", "_optimized.glb");

  console.log(`\n🔧 Optimizing: ${name}`);
  const beforeMB = await getFileSizeMB(filePath);
  console.log(`   📦 Before: ${beforeMB} MB`);

  if (DRY_RUN) {
    console.log("   ⏭ Dry run — skipping.");
    return;
  }

  try {
    // Full pipeline: resize textures → quantize → draco compress → prune
    const cmd = [
      "npx -y @gltf-transform/cli@latest optimize",
      `"${filePath}"`,
      `"${tmpOut}"`,
      `--texture-size ${MAX_TEXTURE_SIZE}`,
      "--compress draco",
    ].join(" ");

    console.log(`   ⚙ Running: ${cmd}`);
    execSync(cmd, { stdio: "inherit" });

    const afterMB = await getFileSizeMB(tmpOut);
    const savings = (((beforeMB - afterMB) / beforeMB) * 100).toFixed(1);

    // Replace original with optimized
    const backupPath = filePath.replace(".glb", "_original.glb");
    await rename(filePath, backupPath);
    await rename(tmpOut, filePath);

    console.log(`   ✅ After: ${afterMB} MB (${savings}% smaller)`);
    console.log(`   💾 Original backed up: ${basename(backupPath)}`);
  } catch (err) {
    console.error(`   ❌ Failed to optimize ${name}:`, err.message);
    // Clean up temp file if it exists
    try { await stat(tmpOut); await rename(tmpOut, tmpOut + ".failed"); } catch {}
  }
}

async function main() {
  console.log("═══════════════════════════════════════════");
  console.log("  🚀 3D Model Optimizer");
  console.log(`  📁 Directory: ${MODELS_DIR}`);
  console.log(`  📐 Max texture: ${MAX_TEXTURE_SIZE}px`);
  console.log(`  🔄 Mode: ${DRY_RUN ? "DRY RUN" : "LIVE"}`);
  console.log("═══════════════════════════════════════════");

  const files = await readdir(MODELS_DIR);
  const glbFiles = files.filter(
    (f) => extname(f).toLowerCase() === ".glb" && !f.includes("_original") && !f.includes("_optimized")
  );

  if (glbFiles.length === 0) {
    console.log("\n⚠ No .glb files found in", MODELS_DIR);
    return;
  }

  console.log(`\n📋 Found ${glbFiles.length} model(s):`);
  for (const f of glbFiles) {
    const mb = await getFileSizeMB(join(MODELS_DIR, f));
    console.log(`   • ${f} — ${mb} MB`);
  }

  for (const file of glbFiles) {
    await optimizeModel(join(MODELS_DIR, file));
  }

  console.log("\n═══════════════════════════════════════════");
  console.log("  ✅ Done! Re-run with --dry-run to preview.");
  console.log("═══════════════════════════════════════════\n");
}

main().catch(console.error);
