import { describe, expect, it } from "vitest";
import { reportContent, renderMarkdown } from "./report";

describe("report rendering", () => {
  it("renders common Markdown formatting", () => {
    const html = renderMarkdown("# 調査結果\n\n- 根拠\n- **結論**");
    expect(html).toContain("<h1>調査結果</h1>");
    expect(html).toContain("<strong>結論</strong>");
  });

  it("removes executable HTML and unsafe links", () => {
    const html = renderMarkdown('<img src=x onerror="alert(1)"><a href="javascript:alert(1)">危険なリンク</a>');
    expect(html).not.toContain("onerror");
    expect(html).not.toContain("javascript:");
    expect(html).toContain("危険なリンク");
  });

  it("uses HTML only when Markdown is absent, and sanitizes it", () => {
    expect(reportContent("", "<h2>レポート</h2><script>alert(1)</script>")).toContain("<h2>レポート</h2>");
    expect(reportContent("", "<h2>レポート</h2><script>alert(1)</script>")).not.toContain("<script>");
  });
});
