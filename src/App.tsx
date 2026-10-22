import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { api, QuestionResponse, Report, ReportSummary, Source } from "./api";
import { reportContent } from "./report";

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("ja-JP", { year: "numeric", month: "short", day: "numeric" }).format(date);
}

function safeSourceUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" || parsed.protocol === "http:" ? parsed.href : null;
  } catch {
    return null;
  }
}

function downloadReport(report: Report, format: "md" | "html") {
  const escapeHtml = (value: string) =>
    value.replace(/[&<>"']/g, (character) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    })[character] ?? character);
  const content = format === "md"
    ? report.markdown
    : `<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${escapeHtml(report.title)}</title></head><body>${reportContent(report.markdown, report.html)}</body></html>`;
  const blob = new Blob([content], { type: format === "md" ? "text/markdown;charset=utf-8" : "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${report.title.replace(/[\\/:*?"<>|]/g, "-") || "report"}.${format}`;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function ReportActions({ report }: { report: Report }) {
  return (
    <div className="report-actions" aria-label="レポートをダウンロード">
      <span>ダウンロード</span>
      <button onClick={() => downloadReport(report, "md")} disabled={!report.markdown}>Markdown <span aria-hidden="true">↓</span></button>
      <button onClick={() => downloadReport(report, "html")}>HTML <span aria-hidden="true">↓</span></button>
    </div>
  );
}

function SourceList({ sources }: { sources: Source[] }) {
  if (!sources.length) return null;
  return (
    <section className="sources" aria-label="回答の出典">
      <h3><span className="source-icon" aria-hidden="true">↗</span> 参考にした情報</h3>
      <ol>
        {sources.map((source, index) => {
          const href = safeSourceUrl(source.url);
          return (
            <li key={`${source.url}-${index}`}>
              <span className="source-number">{String(index + 1).padStart(2, "0")}</span>
              {href ? (
                <a href={href} target="_blank" rel="noreferrer">
                  {source.title || href}<span className="external-mark" aria-hidden="true">↗</span>
                </a>
              ) : <span>{source.title}</span>}
            </li>
          );
        })}
      </ol>
    </section>
  );
}

function ReportBody({ report }: { report: Report }) {
  const html = useMemo(() => reportContent(report.markdown, report.html), [report.markdown, report.html]);
  return <div className="markdown-body" dangerouslySetInnerHTML={{ __html: html }} />;
}

export default function App() {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<QuestionResponse | null>(null);
  const [reports, setReports] = useState<ReportSummary[]>([]);
  const [query, setQuery] = useState("");
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isOpening, setIsOpening] = useState(false);
  const [error, setError] = useState("");
  const [libraryError, setLibraryError] = useState("");
  const [apiReady, setApiReady] = useState<boolean | null>(null);
  const [mobileLibraryOpen, setMobileLibraryOpen] = useState(false);

  useEffect(() => {
    api.health().then(() => setApiReady(true)).catch(() => setApiReady(false));
  }, []);

  const loadReports = useCallback(async (search: string) => {
    setIsSearching(true);
    setLibraryError("");
    try {
      const data = await api.listReports(search.trim());
      setReports(Array.isArray(data) ? data : []);
    } catch (cause) {
      setLibraryError(cause instanceof Error ? cause.message : "レポートを読み込めませんでした。");
      setReports([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadReports(query), query ? 250 : 0);
    return () => window.clearTimeout(timer);
  }, [loadReports, query]);

  async function submitQuestion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = question.trim();
    if (!trimmed || isLoading) return;
    setIsLoading(true);
    setError("");
    setSelectedReport(null);
    setAnswer(null);
    try {
      const result = await api.ask(trimmed);
      setAnswer(result);
      setQuestion("");
      setApiReady(true);
      void loadReports(query);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "質問を送信できませんでした。");
    } finally {
      setIsLoading(false);
    }
  }

  async function openReport(id: string) {
    setIsOpening(true);
    setError("");
    setSelectedReport(null);
    try {
      const report = await api.getReport(id);
      setSelectedReport(report);
      setAnswer(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "レポートを開けませんでした。");
    } finally {
      setIsOpening(false);
    }
  }

  const showWorkspaceWelcome = !answer && !selectedReport && !isLoading && !isOpening && !error;

  return (
    <div className="app-shell">
      <aside className={`sidebar${mobileLibraryOpen ? " library-open" : ""}`} aria-label="メインメニュー">
        <a className="brand" href="#" onClick={(event) => { event.preventDefault(); setAnswer(null); setSelectedReport(null); setError(""); }}>
          <span className="brand-mark" aria-hidden="true"><span>し</span></span>
          <span className="brand-name">しらべて、<br />まとめるくん</span>
        </a>

        <button className="new-report" onClick={() => { setAnswer(null); setSelectedReport(null); setError(""); }}>
          <span aria-hidden="true">＋</span> 新しい調べもの
        </button>
        <button className="library-toggle" onClick={() => setMobileLibraryOpen((open) => !open)} aria-expanded={mobileLibraryOpen}>
          レポート <span aria-hidden="true">{mobileLibraryOpen ? "⌃" : "⌄"}</span>
        </button>

        <div className="library-heading">
          <span>レポートライブラリ</span>
          <span className="library-count">{reports.length}</span>
        </div>
        <label className="search-box">
          <span className="search-icon" aria-hidden="true">⌕</span>
          <span className="visually-hidden">レポートを検索</span>
          <input
            type="search"
            placeholder="レポートを検索"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          {isSearching && <span className="mini-spinner" aria-label="検索中" />}
        </label>

        <div className="report-list" aria-live="polite">
          {libraryError ? (
            <p className="library-message">{libraryError}</p>
          ) : reports.length ? reports.map((report) => (
            <button
              className={`report-link${selectedReport?.id === report.id ? " active" : ""}`}
              key={report.id}
              onClick={() => { setMobileLibraryOpen(false); void openReport(report.id); }}
            >
              <span className="report-link-icon" aria-hidden="true">▤</span>
              <span className="report-link-copy">
                <span className="report-link-title">{report.title}</span>
                <span className="report-link-date">{formatDate(report.createdAt)}</span>
              </span>
            </button>
          )) : !isSearching && (
            <p className="library-message">{query ? "一致するレポートはありません。" : "保存されたレポートはまだありません。"}</p>
          )}
        </div>

        <div className="sidebar-footer">
          <span className={`status-dot${apiReady === true ? " connected" : apiReady === false ? " disconnected" : ""}`} aria-hidden="true" />
          <span>{apiReady === true ? "APIに接続中" : apiReady === false ? "APIに接続できません" : "接続を確認中…"}</span>
          {apiReady === false && <span className="status-hint">起動状況をご確認ください</span>}
        </div>
      </aside>

      <main className="main-panel">
        <header className="topbar">
          <div className="breadcrumb"><span>ワークスペース</span><span className="crumb-divider">/</span><strong>{selectedReport?.title || "リサーチアシスタント"}</strong></div>
          <div className="topbar-note"><span className="sparkle" aria-hidden="true">✳</span> 出典にもとづいて、ていねいに。</div>
        </header>

        <div className="workspace">
          {showWorkspaceWelcome && (
            <section className="welcome">
              <div className="eyebrow"><span className="eyebrow-line" /> あなたのリサーチパートナー</div>
              <h1>知りたいことを、<br /><span>わかる形に。</span></h1>
              <p className="welcome-copy">質問を入力すると、公開情報を調べて<br className="desktop-break" />出典つきのレポートにまとめます。</p>

              <div className="prompt-card">
                <div className="prompt-card-top">
                  <span className="prompt-icon" aria-hidden="true">✳</span>
                  <span>何について調べましょうか？</span>
                </div>
                <form onSubmit={submitQuestion}>
                  <label className="visually-hidden" htmlFor="question">調べたいことを入力してください</label>
                  <textarea
                    id="question"
                    rows={3}
                    maxLength={2000}
                    placeholder="例：家庭でできる食品ロス対策を、自治体や公的機関の情報をもとに教えてください"
                    value={question}
                    onChange={(event) => setQuestion(event.target.value)}
                    disabled={isLoading}
                  />
                  <div className="prompt-card-bottom">
                    <span className="input-hint">具体的に書くほど、答えが見つかりやすくなります</span>
                    <button className="submit-button" type="submit" disabled={!question.trim() || isLoading}>
                      {isLoading ? <><span className="button-spinner" /> 調査中</> : <>調べてもらう <span aria-hidden="true">↗</span></>}
                    </button>
                  </div>
                </form>
              </div>
              <div className="welcome-footnote"><span aria-hidden="true">⌁</span> 調査結果には出典を添え、レポートとして保存します。</div>
            </section>
          )}

          {(isLoading || isOpening) && (
            <section className="loading-state" role="status" aria-live="polite">
              <span className="large-spinner" />
              <h2>{isLoading ? "情報を調べています…" : "レポートを開いています…"}</h2>
              <p>{isLoading ? "公開情報を確認し、出典と一緒にまとめています。" : "レポートを読み込んでいます。"}</p>
            </section>
          )}

          {error && !isLoading && !isOpening && (
            <section className="error-card" role="alert">
              <span className="error-symbol" aria-hidden="true">!</span>
              <div><h2>うまく読み込めませんでした</h2><p>{error}</p></div>
              <button onClick={() => setError("")}>閉じる</button>
            </section>
          )}

          {answer && !isLoading && (
            <article className="result-view">
              <div className="result-meta"><span className="result-tag"><span className="tag-dot" /> 調査レポート</span><span>{formatDate(answer.report.createdAt)}</span></div>
              <h1>{answer.report.title}</h1>
              <div className="answer-panel">
                <div className="answer-mark" aria-hidden="true">し</div>
                <div>
                  <div className="answer-label">回答</div>
                  <p className="answer-text">{answer.answer}</p>
                </div>
              </div>
              <SourceList sources={answer.sources || []} />
              <div className="saved-note"><span aria-hidden="true">✓</span> レポートライブラリに保存しました</div>
              <ReportActions report={answer.report} />
            </article>
          )}

          {selectedReport && !isOpening && (
            <article className="result-view report-view">
              <div className="result-meta"><span className="result-tag"><span className="tag-dot" /> 保存済みレポート</span><span>{formatDate(selectedReport.createdAt)}</span></div>
              <h1>{selectedReport.title}</h1>
              <div className="report-paper"><ReportBody report={selectedReport} /></div>
              <p className="report-format-note">レポートの内容を安全に表示しています。</p>
              <ReportActions report={selectedReport} />
            </article>
          )}
        </div>
        <footer className="main-footer"><span>しらべて、まとめるくん</span><span>公開情報をもとにしたリサーチをサポートします。</span></footer>
      </main>
    </div>
  );
}
