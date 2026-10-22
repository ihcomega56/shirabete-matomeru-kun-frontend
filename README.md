# しらべて、まとめるくん — フロントエンド

質問を送ると、API が返す回答と出典を表示し、レポートをライブラリで検索・閲覧できる日本語のリサーチ UI です。レポートは Markdown / HTML でダウンロードできます。バックエンドやサンプルの調査結果は含めていません。

## ローカル開発

必要環境: Node.js 20 以上、npm

```bash
npm install
cp .env.example .env.local
# 必要に応じて .env.local の VITE_API_BASE_URL を変更
npm run dev
```

既定の接続先は `http://localhost:8080` です。開発サーバーは通常 `http://localhost:5173` で起動します。ブラウザーから API に接続できるよう、API 側で CORS を許可してください。

## API 契約

`VITE_API_BASE_URL` を API のオリジンに設定します（末尾の `/` はあってもなくても構いません）。

| メソッド | パス | 期待するレスポンス |
| --- | --- | --- |
| `GET` | `/api/health` | JSON。接続確認に使います（例: `{"status":"ok"}`）。 |
| `POST` | `/api/questions` | リクエスト JSON `{"question":"..."}`。レスポンスは `{"answer":"回答","sources":[{"title":"出典名","url":"https://..."}],"report":{"id":"...","title":"...","markdown":"...","html":"...","createdAt":"ISO 8601日時"}}`。 |
| `GET` | `/api/reports?q=検索語` | レポート概要の JSON 配列。各要素は `{"id":"...","title":"...","summary":"...","createdAt":"ISO 8601日時"}`。検索語は URL エンコードします。 |
| `GET` | `/api/reports/{id}` | `id`、`title`、`markdown`、`html`、`createdAt` を含むレポート JSON。 |

`markdown` と `html` は空文字列を許容し、閲覧画面では Markdown を優先します。HTML のみがある場合も、表示と HTML ダウンロードの前にサニタイズします。`createdAt` はブラウザーで解釈できる日時文字列を想定します。エラー応答は HTTP ステータスで判定し、ネットワーク接続失敗・404・その他の HTTP エラーを画面に案内します。

このリポジトリはフロントエンドのみです。調査、生成、保存、および特定のエージェント基盤との連携は API 側の責務です。この UI 自体が Foundry と連携しているわけではありません。

## ビルド・型チェック・テスト

```bash
npm run typecheck
npm test
npm run build
```

テストは Vitest で API リクエスト契約と Markdown の安全な表示を確認します。ビルド成果物は `dist/` に出力されます。
