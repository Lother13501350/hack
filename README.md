# Hackathon Project

6 小時協作黑客松專案。Next.js 16 (App Router) + TypeScript + Tailwind v4 + shadcn/ui，部署在 Vercel。

## 隊友第一次設定（5 分鐘）

需要：Node 22+（建議 24）、pnpm、git。

```bash
git clone <repo-url> && cd hack
pnpm install
cp .env.example .env.local   # 或連好 Vercel 後：vercel env pull .env.local
pnpm dev                     # http://localhost:3000
```

## 常用指令

| 指令                                | 用途                                  |
| ----------------------------------- | ------------------------------------- |
| `pnpm dev`                          | 本機開發伺服器                        |
| `pnpm check`                        | lint + 型別檢查 + 格式檢查（PR 前跑） |
| `pnpm format`                       | 自動排版                              |
| `pnpm build`                        | 正式建置                              |
| `pnpm dlx shadcn@latest add <元件>` | 新增 UI 元件                          |

## 協作規則（6 小時版）

- **main 永遠可以部署。** 每個人開自己的分支：`名字/功能`，例如 `amy/login`。
- **小 PR、快合併。** 每 30–60 分鐘合一次，避免最後一小時大衝突。
- **先分好檔案範圍。** 每人負責不同資料夾 / 頁面，減少衝突。
- **共用的東西先定義。** 型別放 `src/types/`，API 介面先講好再各自實作。
- **秘密不進 git。** API key 放 `.env.local` 或 Vercel 環境變數，`.env.example` 只寫欄位名稱。
- 每個 PR 會自動跑 CI（lint、型別、build）；Vercel 會給每個 PR 一個預覽網址。

## 時間表建議

| 時間      | 做什麼                               |
| --------- | ------------------------------------ |
| 0:00–0:30 | 定題目、分工、定資料結構與 API 介面  |
| 0:30–4:30 | 各自開發，每小時整合一次             |
| 4:30–5:30 | 凍結新功能，修 bug、打磨 demo 主流程 |
| 5:30–6:00 | 部署正式版、準備簡報與 demo 腳本     |

## 專案結構

```
src/
  app/              頁面與 API routes（app/api/*/route.ts）
  components/ui/    shadcn 元件（自動產生，不要手改）
  components/       自己的元件
  lib/              工具函式
```
