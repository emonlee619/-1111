import { APPENDIX_MD, DYNAMIC_XLSX, fileDoc, readXlsxAsText, upsertSourceDocument, writeReportJson } from "./stage2-common.ts";

const sources = [
  {
    path: APPENDIX_MD,
    doc: fileDoc(
      APPENDIX_MD,
      "瓦斯突出预警系统完整附录卡_v2_63维",
      "appendix_card",
      "63 通道附录卡：R01-R22 真实传感器、B01-B41 物理约束生成/估计指标、S/C/D/F/AI guardrail 种子知识。"
    )
  },
  {
    path: DYNAMIC_XLSX,
    doc: fileDoc(
      DYNAMIC_XLSX,
      "动态-6-10.xlsx",
      "dynamic_workbook",
      "动态通道与现场指标来源工作簿，阶段二优先作为 source_documents 与切片来源。"
    )
  }
];

const imported: Array<{ title: string; id: string; file_name: string | null | undefined; extracted_preview_chars: number }> = [];

for (const source of sources) {
  const id = await upsertSourceDocument(source.doc);
  const extractedPreview = source.path.endsWith(".xlsx") ? readXlsxAsText(source.path).slice(0, 1000).length : 0;
  imported.push({ title: source.doc.title, id, file_name: source.doc.file_name, extracted_preview_chars: extractedPreview });
}

writeReportJson("stage2-source-documents.json", imported);
console.log(JSON.stringify({ imported_sources: imported.length, sources: imported }, null, 2));
