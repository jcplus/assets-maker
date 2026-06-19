import type {
  GenerateRequest,
  GeneratedImage,
  ImageProvider,
} from "./types";

/**
 * Draw Things 本地 HTTP API provider。
 * 使用 /sdapi/v1/txt2img（A1111 兼容）。需在 Draw Things App 内启用 HTTP 模式。
 */
export class DrawThingsProvider implements ImageProvider {
  id = "draw-things";
  private base: string;
  private txt2img: string;

  constructor(
    base = process.env.DRAW_THINGS_URL ?? "http://127.0.0.1:7860",
    txt2img = process.env.DRAW_THINGS_TXT2IMG ?? "/sdapi/v1/txt2img"
  ) {
    this.base = base.replace(/\/$/, "");
    this.txt2img = txt2img;
  }

  async ping(): Promise<boolean> {
    try {
      const res = await fetch(`${this.base}/sdapi/v1/options`, {
        signal: AbortSignal.timeout(3000),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  async generate(req: GenerateRequest): Promise<GeneratedImage[]> {
    const p = req.params;
    const body = {
      prompt: req.prompt,
      negative_prompt: req.negativePrompt,
      seed: p.seed ?? -1,
      steps: p.steps,
      guidance_scale: p.guidanceScale,
      width: p.width,
      height: p.height,
      batch_count: req.count,
      ...(p.sampler ? { sampler_name: p.sampler } : {}),
    };

    const res = await fetch(`${this.base}${this.txt2img}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      // 生成可能耗时，给足超时
      signal: AbortSignal.timeout(10 * 60 * 1000),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(
        `Draw Things API ${res.status}: ${text.slice(0, 300)}`
      );
    }

    const json = (await res.json()) as { images?: string[] };
    if (!json.images?.length) {
      throw new Error("Draw Things 返回空 images（检查模型是否已加载/HTTP 模式是否开启）");
    }

    return json.images.map((b64) => ({
      data: Buffer.from(b64, "base64"),
      meta: {
        provider: this.id,
        prompt: req.prompt,
        negativePrompt: req.negativePrompt,
        params: req.params,
      },
    }));
  }
}

export const drawThings = new DrawThingsProvider();
