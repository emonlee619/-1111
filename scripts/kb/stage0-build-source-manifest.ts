import { normalizeManifest, readManifest, repoPath, writeJson } from "./stage0-common.ts";

const inputPath = process.argv[2] ? repoPath(process.argv[2]) : repoPath("docs", "kb-source-manifest.example.json");
const outputPath = process.argv[3] ? repoPath(process.argv[3]) : repoPath("local-kb", "reports", "stage0-source-manifest.normalized.json");

const normalized = normalizeManifest(readManifest(inputPath));
writeJson(outputPath, normalized);

console.log(`normalized_manifest=${outputPath}`);
console.log(`source_count=${normalized.length}`);
