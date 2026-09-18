#!/usr/bin/env node
/**
 * 建置前契約檢查
 *
 * 目的：防止已修正過的錯誤在改版、合併、或從舊副本建置時悄悄回歸。
 * 每條規則都對應一個「真實發生過」的 bug，修好後就在此設防。
 *
 * 用法：node scripts/check-contracts.cjs
 * 任一規則失敗即以非 0 結束，中斷建置。
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

/**
 * 規則格式：
 *   file        要檢查的檔案
 *   mustHave    必須出現的字串（陣列）
 *   mustNotHave 禁止出現的字串（陣列）
 *   why         為何有這條規則（出錯時顯示，讓後人知道來龍去脈）
 */
const RULES = [
  {
    file: 'src/utils/dateUtils.js',
    mustHave: ['CountyName='],
    mustNotHave: ['locationName='],
    why:
      '氣象署日出日沒資料集 A-B0062-001 的縣市篩選參數是 CountyName，不是 locationName。\n' +
      '  locationName 是「其他」資料集（如 F-D0047 鄉鎮天氣預報）的參數，看起來很合理但此處無效，\n' +
      '  API 會忽略它並回傳全部 22 縣市，導致不論選哪個警察機關，日出日落時間都相同。\n' +
      '  官方規格：https://opendata.cwa.gov.tw/dist/opendata-swagger.html',
  },
  {
    file: 'src/utils/dateUtils.js',
    mustHave: ['records.locations.location'],
    mustNotHave: ['records.location['],
    why:
      'A-B0062-001 回傳結構為 records.locations.location（locations 為複數層），\n' +
      '  少了中間的 locations 會拋出 "Cannot read properties of undefined"，\n' +
      '  並被 catch 吞掉、誤顯示為「目前處於無網路環境」。',
  },
  {
    file: 'src/utils/dateUtils.js',
    mustHave: ['l.CountyName === countyName'],
    why:
      '必須比對回傳資料的縣市是否等於請求的縣市。\n' +
      '  抓錯縣市時回傳的仍是「合法的時間」，肉眼完全看不出錯，只能靠程式比對。',
  },
  {
    file: 'src/utils/consentFormsGenerator.js',
    mustHave: ['CONSENT_FORM_DEFS'],
    why: '批次匯出需要此書表清單，遺失會導致批次匯出份數不正確。',
  },
];

let failed = 0;

for (const rule of RULES) {
  let content;
  try {
    content = read(rule.file);
  } catch (e) {
    console.error(`\n✗ 找不到檔案：${rule.file}`);
    failed++;
    continue;
  }

  for (const needle of rule.mustHave || []) {
    if (!content.includes(needle)) {
      console.error(`\n✗ ${rule.file} 缺少必要內容：「${needle}」`);
      console.error(`  原因：${rule.why}`);
      failed++;
    }
  }

  for (const needle of rule.mustNotHave || []) {
    if (content.includes(needle)) {
      console.error(`\n✗ ${rule.file} 出現禁止內容：「${needle}」`);
      console.error(`  原因：${rule.why}`);
      failed++;
    }
  }
}

if (failed > 0) {
  console.error(`\n建置中止：${failed} 項契約檢查未通過。`);
  console.error('這些規則都對應曾經發生過的錯誤，請勿直接移除規則來讓建置通過。\n');
  process.exit(1);
}

console.log('✓ 契約檢查全部通過');
