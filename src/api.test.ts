import { afterEach, describe, expect, it, vi } from "vitest";
import { api } from "./api";

afterEach(() => vi.unstubAllGlobals());

describe("API client", () => {
  it("sends a question using the agreed JSON contract", async () => {
    const payload = {
      answer: "回答です",
      sources: [{ title: "公式情報", url: "https://example.jp" }],
      report: { id: "r1", title: "調査", markdown: "# 調査", html: "", createdAt: "2026-10-22" },
    };
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(payload), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(api.ask("調べてください")).resolves.toEqual(payload);
    expect(fetchMock).toHaveBeenCalledWith("http://localhost:8080/api/questions", expect.objectContaining({
      method: "POST",
      body: JSON.stringify({ question: "調べてください" }),
    }));
  });

  it("encodes report search text and gives a clear connection error", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("[]", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    await api.listReports("電気 料金");
    expect(fetchMock).toHaveBeenCalledWith("http://localhost:8080/api/reports?q=%E9%9B%BB%E6%B0%97%20%E6%96%99%E9%87%91", expect.any(Object));

    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("offline")));
    await expect(api.health()).rejects.toThrow("サーバーに接続できませんでした");
  });

  it("rejects responses that do not match the report contract", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ answer: "回答", sources: [], report: {} }))));
    await expect(api.ask("質問")).rejects.toThrow("正しい形式のデータ");
  });
});
