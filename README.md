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
- 健康檢查 API

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

將 Cloudflare 回傳的 `database_id` 填入 `wrangler.toml`：

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

## 正式部署

```bash
npm run typecheck
npm run db:migrate:remote
npm run deploy
```

部署完成後測試：

```bash
curl https://你的-worker.workers.dev/api/health
```

預期結果：

```json
{"ok":true,"service":"AICARD","version":"0.2.0"}
```

## 專案結構

```text
src/index.ts               Worker API 與 Web 介面
migrations/0001_init.sql   D1 資料表
wrangler.toml              Cloudflare 綁定設定
package.json               開發與部署指令
```

## 第一版刻意不包含

- 多使用者登入與資料隔離
- 團隊權限
- 圖片上傳與 OCR
- LIFF 名片交換
- iOS／Android 畫面收集端
- 自動私訊或自動成交

這些功能應在核心收藏與深度分析流程驗證後，再逐步加入。