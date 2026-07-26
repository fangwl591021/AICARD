# AICARD

AICARD 是一個部署在 Cloudflare Workers 的卡片式情報、人物與商機管理 MVP。

使用者只需要貼上文字或網址，系統會先建立卡片；需要時再啟動 Workers AI 深度分析。

## 已完成功能

- 單一收藏入口
- 自動產生標題與摘要
- 自動辨識人物、商機、情報、靈感
- 自動辨識 Facebook、Threads、LINE、YouTube、Instagram
- 卡片分類統計
- 關鍵字搜尋
- 分類與狀態篩選
- 收件匣、跟進中、已完成、已封存
- 深度分析與重新分析
- 刪除卡片
- D1 資料持久化
- Workers AI 分類別分析提示
- 手機響應式 Web 介面
- iPhone 分享表單收集端
- iPhone 背面輕點、截圖與裝置端 OCR 收集流程
- 健康檢查 API
- GitHub Actions 自動部署至 Cloudflare Workers

## 技術架構

- Cloudflare Workers
- Cloudflare D1
- Cloudflare Workers AI
- TypeScript
- 原生 HTML、CSS、JavaScript

## API

| 方法 | 路徑 | 用途 |
|---|---|---|
| GET | `/api/health` | 健康檢查 |
| GET | `/api/cards` | 卡片列表、搜尋與篩選 |
| POST | `/api/cards` | 建立卡片 |
| POST | `/api/capture` | iPhone 分享表單／OCR 快速收集 |
| GET | `/api/cards/:id` | 取得單一卡片 |
| PATCH | `/api/cards/:id` | 更新狀態、標題或重要原因 |
| DELETE | `/api/cards/:id` | 刪除卡片 |
| POST | `/api/cards/:id/analyze` | 執行深度分析 |

`GET /api/cards` 支援：

- `q`：搜尋標題、摘要、原始內容
- `type`：`person`、`opportunity`、`intelligence`、`idea`
- `status`：`inbox`、`following`、`done`、`archived`

## 建立 Cloudflare D1

```bash
npm install
npx wrangler login
npx wrangler d1 create aicard-db
```

Cloudflare 會回傳 D1 的 `database_id`。本機手動部署時，請將它填入 `wrangler.toml`：

```toml
[[d1_databases]]
binding = "DB"
database_name = "aicard-db"
database_id = "你的資料庫 ID"
migrations_dir = "migrations"
```

## 本機啟動

```bash
npm run db:migrate:local
npm run dev
```

## 手動正式部署

```bash
npm run typecheck
npm run db:migrate:remote
npm run deploy
```

## GitHub 自動部署

專案已包含 `.github/workflows/deploy.yml`。推送到 `main` 分支，或在 GitHub Actions 手動執行 `Deploy AICARD`，即會：

1. 安裝依賴
2. 執行 TypeScript 型別檢查
3. 套用遠端 D1 migrations
4. 部署 Cloudflare Worker

請在 GitHub Repository：

`Settings → Secrets and variables → Actions → New repository secret`

加入以下兩個 secrets：

| Secret | 說明 |
|---|---|
| `CLOUDFLARE_API_TOKEN` | 具備 Workers 部署及 D1 編輯權限的 Cloudflare API Token |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare Account ID |

未設定上述 secrets 時，自動部署會明確失敗並顯示缺少哪一項，不會產生不完整部署。

部署完成後測試：

```bash
curl https://你的-worker.workers.dev/api/health
```

預期結果：

```json
{"ok":true,"service":"AICARD","version":"0.3.1"}
```

## 專案結構

```text
src/index.ts                  Worker API 與卡片 Web 介面
src/iphone-page.ts            iPhone 收集端與捷徑設定頁
migrations/0001_init.sql      D1 資料表
wrangler.toml                 Cloudflare 綁定設定
package.json                  開發與部署指令
.github/workflows/deploy.yml  GitHub 自動部署
```

## 第一版刻意不包含

- 多使用者登入與資料隔離
- 團隊權限
- 雲端圖片上傳（OCR 在 iPhone 裝置端完成）
- LIFF 名片交換
- Android 畫面收集端
- 自動私訊或自動成交

這些功能應在核心收藏與深度分析流程驗證後，再逐步加入。
