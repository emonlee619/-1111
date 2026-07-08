import { normalizeManifest, readManifest, repoPath, validateManifest } from "./stage0-common.ts";

const inputPath = process.argv[2] ? repoPath(process.argv[2]) : repoPath("docs", "kb-source-manifest.example.json");
const records = normalizeManifest(readManifest(inputPath));
const errors = validateManifest(records);

if (errors.length > 0) {
  console.error("stage0 source manifest validation failed:");
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log("stage0 source manifest validation passed");
console.log(`source_count=${records.length}`);
