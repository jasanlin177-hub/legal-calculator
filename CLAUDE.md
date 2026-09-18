# 專案工作指引 — 解送人犯法定障礙事由計算機

> 本檔為**專案層級**指引，會隨 repo 同步至任何裝置，優先於個人全域設定。
> 通用工程原則見使用者全域 `~/.claude/CLAUDE.md`；本檔只寫**本專案限定**事項。

---

## 專案概要

- React 18 + Vite 5 純前端單檔應用，部署於 GitHub Pages
- 依《刑事訴訟法》§93-1 計算解送地檢署法定時限，並產出 11 種偵辦書表
- 線上網址：https://jasanlin177-hub.github.io/legal-calculator/
- 詳細功能與結構見 `README.md`

---

## ⚠️ 部署鐵則：根目錄 index.html 有兩種版本

`index.html` 身兼二職，**本機與 GitHub 上內容永遠不同，且兩者都正確**：

| 位置 | 內容 | 大小 | 用途 |
|------|------|------|------|
| 本機（版控中）| Vite 開發進入點，引用 `/src/main.jsx` | ~340 bytes | `npm run dev` 需要 |
| GitHub 上 | 建置後完整單檔 | ~1.3 MB | 網站實際檔案 |

GitHub Pages 設定為 **main 分支 + /(root)**，網站讀的是**根目錄** index.html。

### 🚫 這個 repo 絕對不要做的事

| 動作 | 後果 |
|------|------|
| `git pull` / `git merge origin/main` | 用 GitHub 上 1.3 MB 建置版覆蓋本機開發版，`npm run dev` 立刻壞掉 |
| `git push` | 部署透過網頁上傳，GitHub 端已有本機沒有的 commit，push 會被拒 |
| 把 `dist/index.html` 複製到根目錄 `index.html` 後提交 | 弄壞本機開發環境 |

- **部署只用 GitHub 網頁 Upload files**，不用 git push（公司網路亦封鎖 GitHub 連線）
- 原始碼要上 GitHub 時，同樣用網頁上傳 `src/`、`scripts/` 等資料夾
- 誤執行 `git pull` 弄壞本機後的還原：`git checkout HEAD~1 -- index.html`

---

## 建置

```bash
npm run dev            # 本機開發（http://localhost:5173）
npm run build:single   # 建置單檔（含契約檢查）→ 產出 dist/index.html
```

`build:single` 會先跑契約檢查，通過才建置。部署時把 `dist/index.html`
透過網頁上傳為根目錄的 `index.html`（不要在本機 cp 覆蓋後提交）。

---

## 契約檢查（scripts/check-contracts.cjs）

已修正過的 bug 都在此設防，`npm run check` / `prebuild` 會自動執行。
**每條規則都對應真實發生過的錯誤，請勿為了讓建置通過而移除規則。**
修好新 bug 後，若該類錯誤可能重演，就在此新增對應規則。

目前守護重點（`src/utils/dateUtils.js`）：
- 氣象署日出日沒資料集 A-B0062-001 的縣市參數是 **`CountyName`**，
  不是 `locationName`（後者是該平台其他資料集的參數，此處無效，
  API 會忽略並回傳全部縣市，導致選任何機關結果都相同）
- 回傳結構為 `records.locations.location`（locations 為複數層）
- 必須比對 `CountyName` 是否等於請求縣市（抓錯縣市會回傳合法但錯誤的時間）

---

## 修改本專案時特別注意

- 改氣象署 API 相關程式前，先查官方 Swagger：
  https://opendata.cwa.gov.tw/dist/opendata-swagger.html
  同平台不同資料集參數命名不同，不可類推
- 書表模板為 `src/template_*b64.js`（機關原始 .docx 加 {{placeholder}} 後轉 Base64），
  修改書表格式須以機關原始範本為基準，保留字體/表格/勾選框樣式
- 驗證書表時要驗**語意正確**（值填對、格式對），不只是「有沒有產出檔案」
