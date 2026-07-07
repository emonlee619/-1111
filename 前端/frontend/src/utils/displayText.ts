export function cleanDisplayCopy(value: string) {
  return value
    .replaceAll("占位页", "业务页")
    .replaceAll("占位", "展示")
    .replaceAll("骨架", "工作台")
    .replaceAll("结构验证", "结构示例")
    .replaceAll("当前阶段", "当前版本")
    .replaceAll("开发中", "业务准备中")
    .replace(/\bStage\s*\d+\b/g, "业务阶段");
}

