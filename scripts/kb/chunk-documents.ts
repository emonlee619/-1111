import {
  APPENDIX_MD,
  DYNAMIC_XLSX,
  chunkText,
  fileDoc,
  markdownSections,
  readUtf8,
  readXlsxAsText,
  supabaseRest,
  upsertSourceDocument,
  writeReportJson
} from "./stage2-common.ts";

const sourceInputs = [
  {
    doc: fileDoc(APPENDIX_MD, "瓦斯突出预警系统完整附录卡_v2_63维", "appendix_card", "63 通道附录卡。"),
    sections: markdownSections(readUtf8(APPENDIX_MD))
  },
  {
    doc: fileDoc(DYNAMIC_XLSX, "动态-6-10.xlsx", "dynamic_workbook", "动态通道来源工作簿。"),
    sections: [{ title: "workbook", content: readXlsxAsText(DYNAMIC_XLSX) }]
  }
];

const report: Array<{ title: string; source_document_id: string; chunks: number }> = [];

for (const source of sourceInputs) {
  const sourceId = await upsertSourceDocument(source.doc);
  await supabaseRest(`document_chunks?source_document_id=eq.${sourceId}`, {
    method: "DELETE",
    headers: { prefer: "return=minimal" }
  });
  const chunks = source.sections.flatMap((section) =>
    chunkText(section.content).map((content, index) => ({
      source_document_id: sourceId,
      chunk_index: index,
      section_path: section.title,
      content,
      keywords: ["煤与瓦斯突出", "63通道", "知识库"],
      metadata: { source_title: source.doc.title, section: section.title, stage: "stage2" }
    }))
  );
  if (chunks.length > 0) {
    await supabaseRest("document_chunks", {
      method: "POST",
      headers: { prefer: "return=minimal" },
      body: JSON.stringify(chunks)
    });
  }
  report.push({ title: source.doc.title, source_document_id: sourceId, chunks: chunks.length });
}

writeReportJson("stage2-document-chunks.json", report);
console.log(JSON.stringify({ chunked_sources: report.length, report }, null, 2));
