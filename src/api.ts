export interface Source {
  title: string;
  url: string;
}

export interface Report {
  id: string;
  title: string;
  markdown: string;
  html: string;
  createdAt: string;
}

export interface ReportSummary {
  id: string;
  title: string;
  summary: string;
  createdAt: string;
}

export interface QuestionResponse {
  answer: string;
  sources: Source[];
  report: Report;
}

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "http://localhost:8080").replace(/\/+$/, "");
const invalidResponse = () => new Error("サーバーから正しい形式のデータを受け取れませんでした。");

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseReport(value: unknown): Report | null {
  if (!isRecord(value)) return null;
  const { id, title, markdown, html, createdAt } = value;
  return [id, title, markdown, html, createdAt].every((field) => typeof field === "string")
    ? { id, title, markdown, html, createdAt } as Report
    : null;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers: { Accept: "application/json", ...init?.headers },
    });
  } catch {
    throw new Error("サーバーに接続できませんでした。APIが起動しているか、接続先を確認してください。");
  }
  if (!response.ok) {
    const detail = response.status === 404
      ? "レポートが見つかりませんでした。"
      : `サーバーでエラーが発生しました（${response.status}）。時間をおいて再度お試しください。`;
    throw new Error(detail);
  }
  try {
    return (await response.json()) as T;
  } catch {
    throw invalidResponse();
  }
}

export const api = {
  health: () => request<{ status: string }>("/api/health"),
  ask: async (question: string) => {
    const value: unknown = await request<unknown>("/api/questions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question }),
    });
    if (!isRecord(value) || typeof value.answer !== "string" || !Array.isArray(value.sources)) {
      throw invalidResponse();
    }
    const report = parseReport(value.report);
    const sources = value.sources.every((source) =>
      isRecord(source) && typeof source.title === "string" && typeof source.url === "string");
    if (!report || !sources) throw invalidResponse();
    return { answer: value.answer, sources: value.sources as Source[], report } satisfies QuestionResponse;
  },
  listReports: async (query: string) => {
    const value: unknown = await request<unknown>(`/api/reports${query ? `?q=${encodeURIComponent(query)}` : ""}`);
    if (!Array.isArray(value) || !value.every((item) =>
      isRecord(item) && typeof item.id === "string" && typeof item.title === "string" &&
      typeof item.summary === "string" && typeof item.createdAt === "string")) {
      throw invalidResponse();
    }
    return value as ReportSummary[];
  },
  getReport: async (id: string) => {
    const report = parseReport(await request<unknown>(`/api/reports/${encodeURIComponent(id)}`));
    if (!report) throw invalidResponse();
    return report;
  },
};
