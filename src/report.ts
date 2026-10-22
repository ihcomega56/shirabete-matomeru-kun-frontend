import DOMPurify from "dompurify";
import { marked } from "marked";

marked.setOptions({ gfm: true, breaks: true });

export function renderMarkdown(markdown: string): string {
  const rendered = marked.parse(markdown, { async: false });
  return DOMPurify.sanitize(rendered, {
    USE_PROFILES: { html: true },
    ADD_ATTR: ["target", "rel"],
  });
}

export function reportContent(markdown: string, html: string): string {
  return renderMarkdown(markdown || html || "");
}
