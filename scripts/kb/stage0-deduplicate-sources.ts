import { deduplicate, hasDuplicates, normalizeManifest, readManifest, repoPath, writeJson } from "./stage0-common.ts";

const inputPath = process.argv[2] ? repoPath(process.argv[2]) : repoPath("docs", "kb-source-manifest.example.json");
const outputPath = process.argv[3] ? repoPath(process.argv[3]) : repoPath("local-kb", "reports", "stage0-source-deduplication.json");

const records = normalizeManifest(readManifest(inputPath));
const result = deduplicate(records);
writeJson(outputPath, result);

if (hasDuplicates(result)) {
  console.error(`duplicate_check=failed output=${outputPath}`);
  process.exit(1);
}

console.log(`duplicate_check=passed output=${outputPath}`);
