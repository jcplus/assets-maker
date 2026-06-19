/**
 * 算力成本估算（启发式，非真实计费）。
 * 本地 Draw Things 无 token 概念，这里用 步数 × 数量 × 分辨率系数 估一个「算力单位」，
 * 为将来上云按算力计费预留。UI 显示时须注明「预估，不代表最终消耗」。
 */
export function estimateUnits(args: {
  steps: number;
  count: number;
  width: number;
  height: number;
}): number {
  const { steps, count, width, height } = args;
  const resFactor = (width * height) / (512 * 512);
  return Math.round(steps * count * resFactor);
}
