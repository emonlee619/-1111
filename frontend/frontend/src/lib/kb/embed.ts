/**
 * Stage 3 查询向量化（384 维 TF-IDF + SVD）
 *
 * 策略：
 * - 复用 Stage 2 保存的本地 sklearn pkl 模型（model_cache/tfidf_vectorizer.pkl、svd_decomposer.pkl）。
 * - 通过 Node 子进程调用 Python 脚本 scripts/kb/stage3-embed-query.py。
 * - 不依赖 DeepSeek / HuggingFace 在线下载。
 * - 任意环节失败都降级为 fallback_keyword，绝不让页面崩溃。
 */

import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import type { KbEmbedResponse } from "@/types/kb";

/** 候选 Python 解释器（按优先级）。可通过 KB_PYTHON 覆盖。 */
function resolvePython(): string {
  if (process.env.KB_PYTHON && existsSync(process.env.KB_PYTHON)) return process.env.KB_PYTHON;
  // 优先使用已验证安装 sklearn 的系统 Python 3.11（Stage 2 生成 embedding 时所用环境）。
  const pathCandidates = [
    "C:\\Users\\ASUS\\AppData\\Local\\Programs\\Python\\Python311\\python.exe",
    "C:\\Python311\\python.exe",
    "/usr/bin/python3",
  ];
  for (const p of pathCandidates) {
    if (existsSync(p)) return p;
  }
  // 退回 PATH 查找（可能无 sklearn，将自动降级关键词检索）。
  return "python";
}

/** 候选 embed 脚本路径。可通过 KB_STAGE3_EMBED_SCRIPT 覆盖。 */
function resolveScript(): string | null {
  if (process.env.KB_STAGE3_EMBED_SCRIPT && existsSync(process.env.KB_STAGE3_EMBED_SCRIPT)) {
    return process.env.KB_STAGE3_EMBED_SCRIPT;
  }
  // next dev/build 的 cwd 为 frontend 根；项目根在其上若干级。多列候选以适配不同目录布局。
  const candidates = [
    path.resolve(process.cwd(), "../../../scripts/kb/stage3-embed-query.py"),
    path.resolve(process.cwd(), "../../../../scripts/kb/stage3-embed-query.py"),
    path.resolve(process.cwd(), "../../scripts/kb/stage3-embed-query.py"),
    path.resolve(process.cwd(), "scripts/kb/stage3-embed-query.py"),
  ];
  return candidates.find((p) => existsSync(p)) ?? null;
}

/**
 * 把用户问题转为 384 维 embedding。
 * 成功返回 { mode: "semantic", dims, embedding }；失败返回 fallback_keyword。
 */
export async function embedQuery(question: string): Promise<KbEmbedResponse> {
  const warnings: string[] = [];
  const script = resolveScript();
  if (!script) {
    warnings.push("未找到 scripts/kb/stage3-embed-query.py，语义检索降级为关键词检索。");
    return { mode: "fallback_keyword", dims: null, embedding: null, warnings };
  }
  const python = resolvePython();
  const result = await runPython(python, script, question);
  if (!result.ok) {
    warnings.push(
      `Python embedding 执行失败：${result.error}。语义检索降级为关键词检索。`,
    );
    return { mode: "fallback_keyword", dims: null, embedding: null, warnings };
  }
  const dims = result.embedding?.length ?? null;
  if (!dims || dims < 8) {
    warnings.push("embedding 维度异常，语义检索降级为关键词检索。");
    return { mode: "fallback_keyword", dims: null, embedding: null, warnings };
  }
  return { mode: "semantic", dims, embedding: result.embedding, warnings };
}

/** 调用 Python 脚本，解析 stdout 上的 JSON { dims, embedding }。 */
function runPython(
  python: string,
  script: string,
  question: string,
): Promise<{ ok: true; embedding: number[] } | { ok: false; error: string }> {
  return new Promise((resolve) => {
    const child = spawn(python, [script, "--question", question], {
      cwd: path.dirname(script),
      windowsHide: true,
    });
    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => {
      child.kill();
      resolve({ ok: false, error: "timeout(8s)" });
    }, 8000);

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", (err) => {
      clearTimeout(timer);
      resolve({ ok: false, error: `${err.message}; stderr=${stderr.slice(0, 200)}` });
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (code !== 0) {
        resolve({ ok: false, error: `exit=${code}; stderr=${stderr.slice(0, 300)}` });
        return;
      }
      try {
        const parsed = JSON.parse(stdout.trim()) as { dims?: number; embedding?: number[] };
        if (Array.isArray(parsed.embedding)) {
          resolve({ ok: true, embedding: parsed.embedding });
        } else {
          resolve({ ok: false, error: "embedding 字段缺失" });
        }
      } catch (err) {
        resolve({
          ok: false,
          error: `JSON 解析失败: ${err instanceof Error ? err.message : String(err)}; stdout=${stdout.slice(0, 200)}`,
        });
      }
    });
  });
}
