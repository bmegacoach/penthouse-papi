import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const fetchMock = vi.fn();
const originalFetch = global.fetch;

beforeEach(() => {
  fetchMock.mockReset();
  global.fetch = fetchMock as unknown as typeof fetch;
  process.env.MINIMAX_API_KEY = "test-key";
  process.env.SEEDANCE_API_KEY = "test-key";
  delete process.env.MMX_CLI_PATH;
  delete process.env.MMX_CLI_ENABLED;
  vi.resetModules();
});

afterEach(() => {
  global.fetch = originalFetch;
});

describe("ai-video minimax adapter", () => {
  it("submits a video generation request and returns task id", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ task_id: "mx-123", base_resp: { status_code: 0, status_msg: "ok" } }),
    });
    const { minimaxAdapter } = await import("@/lib/ai-video/minimax");
    const task = await minimaxAdapter.submit({
      provider: "minimax",
      prompt: "A sweeping drone shot over a glass skyscraper at sunset",
      aspectRatio: "9:16",
      adMode: true,
      brand: "OpenChief",
    });
    expect(task.taskId).toBe("mx-123");
    expect(task.provider).toBe("minimax");
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/video_generation"),
      expect.objectContaining({ method: "POST" }),
    );
    const call = fetchMock.mock.calls[0];
    const body = JSON.parse(call[1].body);
    expect(body.prompt).toContain("High-converting");
    expect(body.prompt).toContain("OpenChief");
  });

  it("maps MiniMax status strings to normalized statuses", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ status: "Success", video_url: "https://cdn/abc.mp4" }),
    });
    const { minimaxAdapter } = await import("@/lib/ai-video/minimax");
    const t = await minimaxAdapter.poll("mx-123");
    expect(t.status).toBe("succeeded");
    expect(t.videoUrl).toBe("https://cdn/abc.mp4");
  });

  it("throws when API key missing", async () => {
    delete process.env.MINIMAX_API_KEY;
    const { minimaxAdapter } = await import("@/lib/ai-video/minimax");
    await expect(
      minimaxAdapter.submit({ provider: "minimax", prompt: "test" }),
    ).rejects.toThrow(/MINIMAX_API_KEY/);
  });
});

describe("ai-video seedance adapter (seedanceapi.org v2)", () => {
  it("submits to /v2/generate and snaps duration + aspect to allowed values", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ code: 200, data: { task_id: "sd-xyz" } }),
    });
    const { seedanceAdapter } = await import("@/lib/ai-video/seedance");
    const task = await seedanceAdapter.submit({
      provider: "seedance",
      prompt: "cinematic product reveal",
      durationSec: 6,
      aspectRatio: "9:16",
    });
    expect(task.taskId).toBe("sd-xyz");
    expect(task.provider).toBe("seedance");
    const call = fetchMock.mock.calls[0];
    expect(call[0]).toContain("/v2/generate");
    const body = JSON.parse(call[1].body);
    expect(body.model).toMatch(/seedance/);
    expect(body.aspect_ratio).toBe("9:16");
    expect(body.duration).toBe(5);
  });

  it("snaps 12s → 10s and passes image URL for I2V", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ code: 200, data: { task_id: "sd-i2v" } }),
    });
    const { seedanceAdapter } = await import("@/lib/ai-video/seedance");
    await seedanceAdapter.submit({
      provider: "seedance",
      prompt: "animate this",
      durationSec: 12,
      aspectRatio: "16:9",
      referenceImage: "https://img/foo.jpg",
    });
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.duration).toBe(10);
    expect(body.images).toEqual(["https://img/foo.jpg"]);
  });

  it("parses data.response[0] as video URL on SUCCESS", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        code: 200,
        message: "success",
        data: { task_id: "sd-xyz", status: "SUCCESS", response: ["https://cdn/abc.mp4"] },
      }),
    });
    const { seedanceAdapter } = await import("@/lib/ai-video/seedance");
    const t = await seedanceAdapter.poll("sd-xyz");
    expect(t.status).toBe("succeeded");
    expect(t.videoUrl).toBe("https://cdn/abc.mp4");
  });

  it("surfaces 402 No credit as a thrown error on submit", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 402,
      json: async () => ({ code: 402, message: "No credit" }),
    });
    const { seedanceAdapter } = await import("@/lib/ai-video/seedance");
    await expect(
      seedanceAdapter.submit({ provider: "seedance", prompt: "x" }),
    ).rejects.toThrow(/No credit|402/);
  });
});

describe("ai-video client dispatcher", () => {
  it("routes by provider when CLI is disabled", async () => {
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({ task_id: "mx-1" }) });
    const { generateVideo } = await import("@/lib/ai-video/client");
    const t = await generateVideo({ provider: "minimax", prompt: "x" });
    expect(t.provider).toBe("minimax");
    expect(t.taskId).toBe("mx-1");
  });

  it("throws on unknown provider", async () => {
    const { generateVideo } = await import("@/lib/ai-video/client");
    await expect(
      generateVideo({ provider: "unknown" as never, prompt: "x" }),
    ).rejects.toThrow();
  });
});
