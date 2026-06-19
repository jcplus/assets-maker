/**
 * 把 promptTemplate 里的 {占位符} 用 variables 填充。
 * 未提供的占位符替换为空并清理多余逗号/空格，保证 prompt 干净。
 */
export function renderPrompt(
  template: string,
  variables: Record<string, string | undefined>
): string {
  const filled = template.replace(/\{(\w+)\}/g, (_, key: string) => {
    const v = variables[key];
    return v && v.trim() ? v.trim() : "";
  });
  return filled
    .replace(/,\s*,/g, ",") // 空占位符留下的连续逗号
    .replace(/\s{2,}/g, " ")
    .replace(/,\s*$/g, "")
    .replace(/^\s*,/, "")
    .trim();
}

/** 从模板里提取所有占位符名 */
export function extractPlaceholders(template: string): string[] {
  const set = new Set<string>();
  for (const m of template.matchAll(/\{(\w+)\}/g)) set.add(m[1]);
  return [...set];
}
