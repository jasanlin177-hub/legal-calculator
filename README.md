# 解送人犯法定障礙事由計算機

依據《刑事訴訟法》第 93 條之 1，協助偵查人員快速計算「解送地檢署」的法定時限，自動扣除法定障礙事由所經過之時間，並一鍵產出偵辦常用書表。

🔗 **線上使用**：<https://jasanlin177-hub.github.io/legal-calculator/>

> 純前端單檔應用，所有計算與個資均於使用者裝置本機完成，不上傳任何伺服器。

---

## 主要功能

- **法定時限計算**：一般案件 16 小時、通緝犯 24 小時為基準，自動加計 9 款法定障礙事由時間，算出最終解送期限。
- **同案多名嫌犯**：單一案件最多 20 名嫌犯，各自獨立計算、分頁切換管理。
- **本地自動存檔**：資料存於瀏覽器 IndexedDB，支援跨日作業（逮捕當日先產書表，次日補輸障礙事由再匯出）。
- **日出日落校正**：自動連線中央氣象署（CWA）取得官方日出日落時間；離線時改用 NOAA 演算法推算（精度約 ±2 分鐘），供夜間停止訊問（第 3 款）計算。
- **11 種書表一鍵產出**（`.docx`）：
  - 告知書類：權利告知書（附件 12）、告知本人通知書（附件 16）、告知親友通知書（附件 17）
  - 同意書類：勘察採證同意書（附件一）、自願受搜索同意書（附件二）、自願受採尿同意書（附件二十）
  - 搜索扣押及其他：搜索扣押筆錄（附件二十三）、扣押物品收據／無應扣押之物證明書（附件二十四）、法律扶助指派律師通知表、兒童照顧查訪紀錄表、兒童照顧面訪紀錄表
- **智慧帶入**：書表自動填入嫌犯基本資料；法律扶助通知表依身分別（原住民／身心障礙／少年）自動勾選，少年身分由出生日期自動判斷。
- **批次匯出**：一次產出全案所有嫌犯的 11 種書表（N × 11 份）。
- **法定障礙事由記錄表**：一鍵匯出 `.txt`（UTF-8 with BOM），格式可直接貼入解送人犯報告書。
- **候詢人入／出室通知單**：一鍵產出 `.docx`，含存根及送候詢室共 2 聯，每份最多容納 5 名嫌犯。

---

## 技術架構

| 項目 | 說明 |
|------|------|
| 前端框架 | React 18 |
| 建置工具 | Vite 5 |
| 樣式 | Tailwind CSS 3 |
| 圖示 | lucide-react |
| 文件產生 | docxtemplater + pizzip（`{{placeholder}}` 套版）、file-saver |
| 本地儲存 | IndexedDB |
| 部署 | GitHub Pages（單一 HTML 檔） |

書表模板以偵辦機關原始 `.docx` 範本為底，嵌入 `{{placeholder}}`，並以 Base64 內嵌於 `src/template_*b64.js`，確保離線可用且完整保留原始字體、字型與表格格式。

---

## 專案結構

```
src/
├── App.jsx                       # 主畫面與書表匯出面板
├── main.jsx                      # 進入點
├── components/LegalCalculator/   # 案件資料、障礙事由清單、結果、嫌犯分頁等元件
├── hooks/
│   ├── useCase.js                # 案件/嫌犯狀態、自動存檔、日出日落查詢
│   └── useObstacleCalculator.js  # 障礙時間與期限計算
├── utils/
│   ├── documentGenerator.js      # 告知書類（附件 12/16/17）
│   ├── consentFormsGenerator.js  # 同意書、搜索扣押、法扶、兒童照顧等 8 種書表
│   ├── roomNotificationGenerator.js # 候詢人入/出室通知單
│   ├── exportUtils.js            # 障礙事由記錄表、批次匯出
│   ├── dateUtils.js              # 民國曆換算、日出日落
│   └── db.js                     # IndexedDB 存取
├── data/constants.js             # 警察機關資料庫、9 款法定障礙事由
└── template_*b64.js              # 書表 Base64 模板
```

---

## 開發與建置

需求：Node.js 18+

```bash
# 安裝相依套件
npm install

# 本機開發（http://localhost:5173）
npm run dev
```

### 建置單檔版本

正式部署為「單一 index.html」離線檔。採兩步驟建置：

```bash
# 1. 以測試設定 build（資產不分割，輸出至 dist_test/）
node node_modules/vite/bin/vite.js build --config vite.config.test.js

# 2. 將所有 JS/CSS 內嵌成單一 HTML
node scripts/inline-html.cjs dist_test dist/index.html
```

產出的 `dist/index.html` 為完整離線單檔，複製到 `legal-calculator/index.html` 即為 GitHub Pages 部署內容。

---

## 部署

GitHub Pages 提供 `legal-calculator/index.html`。更新流程：

1. 依上述步驟建置出單檔 `dist/index.html`
2. 覆蓋 `legal-calculator/index.html`
3. commit 後 push，GitHub Pages 自動更新

---

## 版本

目前版本 **v3.2**（詳細異動請見使用說明書）。

- v3.2：新增 8 種偵辦書表、戶籍地/電話/身分別欄位、法扶表身分別自動勾選、書表沿用原始範本格式
- v3.1：同案多名嫌犯、本地存檔/跨日作業、候詢人入/出室通知單、萬年歷驗證
- v2.x：附件 12/16/17 一鍵匯出、NOAA 離線備援
- v2.0：初始版本

---

## 免責聲明

- 本工具計算結果僅供偵查實務參考，如有疑義應以法規條文為準。
- 日出日落時間供參考，實務上仍應依現場實際情況判斷。
- 資料存於本機瀏覽器，清除瀏覽器資料或更換裝置將無法讀取，重要案件請另行匯出備份。

---

設計：文一偵查林正賢　　協作 AI：Claude
