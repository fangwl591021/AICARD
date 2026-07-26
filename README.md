# AI CARD

AI CARD 是一個以 Cloudflare Workers、D1 與 Workers AI 建立的卡片式情報系統。

第一版聚焦三個動作：

1. 新增收藏
2. 快速整理成卡片
3. 需要時再執行深度分析

## 卡片類型

- `person`：人物卡
- `opportunity`：商機卡
- `intelligence`：情報卡
- `idea`：靈感卡

## 本機啟動

```bash
npm install
npx wrangler d1 create aicard-db
```

將建立後取得的 D1 `database_id` 填入 `wrangler.toml`，接著執行：

```bash
npm run db:migrate:local
npm run dev
```

## 部署

```bash
npm run db:migrate:remote
npm run deploy
```

## 第一版 API

- `GET /api/cards`
- `POST /api/cards`
- `POST /api/cards/:id/analyze`

## 專案結構

```text
src/index.ts              Worker、API 與 Web 介面
migrations/0001_init.sql  D1 初始資料表
wrangler.toml             Cloudflare 設定
```

## 下一階段

- LIFF 名片收藏
- 圖片上傳與 OCR
- 使用者登入
- 卡片標籤與搜尋
- 人物、商機、情報各自的分析模板
- 收藏轉成跟進任務
