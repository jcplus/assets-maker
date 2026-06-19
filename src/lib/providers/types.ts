/**
 * 图像生成 provider 抽象。首发 DrawThingsProvider（本地 HTTP API）。
 * 将来上云换实现，业务层只依赖此接口。
 */
export interface GenerateRequest {
  prompt: string;
  negativePrompt: string;
  /** 锁定的生成参数 */
  params: GenParams;
  /** 生成张数 */
  count: number;
}

export interface GenParams {
  width: number;
  height: number;
  steps: number;
  guidanceScale: number;
  seed?: number; // -1 = 随机
  sampler?: string;
  [k: string]: unknown;
}

export interface GeneratedImage {
  /** PNG 二进制 */
  data: Buffer;
  /** 该图实际使用的复现信息 */
  meta: Record<string, unknown>;
}

export interface ImageProvider {
  id: string;
  generate(req: GenerateRequest): Promise<GeneratedImage[]>;
  /** 健康检查 */
  ping(): Promise<boolean>;
}
