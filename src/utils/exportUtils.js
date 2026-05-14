import { saveAs } from 'file-saver';
import {
  generateDocxBlobRightsNotification,
  generateDocxBlobArrestNoticeSelf,
  generateDocxBlobArrestNoticeRelative
} from './documentGenerator';
import { calculateTotalObstacleTime, calculateDeadline } from './dateUtils';
import { OBSTACLE_TYPES } from '../data/constants';

// ─────────────────────────────────────────
// 檔名基底
// ─────────────────────────────────────────
export const buildBaseFilename = (caseSession) => {
  const first = caseSession.suspects?.[0];
  if (!first?.arrestDateTime) return '未命名案件';
  const d = new Date(first.arrestDateTime);
  const rocYear = d.getFullYear() - 1911;
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const dateStr = `${rocYear}${mm}${dd}`;
  const firstName = first.suspectName || '未命名';
  const n = caseSession.suspects.length;
  const suffix = n > 1 ? `等${n}人` : '';
  const cause = caseSession.caseCause || '案件';
  return `${dateStr}_${firstName}${suffix}_${cause}`;
};

// ─────────────────────────────────────────
// 法定障礙事由記錄表（.txt）— 格式完全比照解送人犯報告書
// ─────────────────────────────────────────
const SEP = '='.repeat(60);

const fmtRocDateTime = (isoStr) => {
  if (!isoStr) return '';
  const d = new Date(isoStr);
  if (isNaN(d)) return '';
  const y = d.getFullYear() - 1911;
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const h = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${y}年${m}月${day}日 ${h}:${min}`;
};

export const generateObstacleRecordText = (caseSession) => {
  const records = caseSession.suspects.map((s) => {
    const lines = [];
    const isWantedBool = String(s.isWanted) === 'true';
    const policeHours = isWantedBool ? 24 : 16;
    const combinedHours = policeHours + 8; // 警察時限 + 檢察官 8 小時

    lines.push('法定障礙事由記錄表');
    lines.push('');
    lines.push(`案由：${caseSession.caseCause || ''}`);
    lines.push(`是否為通緝犯：${isWantedBool ? '是' : '否'}`);
    lines.push(`犯罪嫌疑人：${s.suspectName || ''}`);
    lines.push(`承辦人：${caseSession.officer || ''}`);
    lines.push(`警察機關：${caseSession.policeAgency || ''}`);
    lines.push(`所屬機關：${caseSession.policeSubAgency || ''}`);
    lines.push(`單位：${caseSession.policeUnit || ''}`);
    lines.push(`機關地址：${caseSession.unitAddress || ''}`);
    lines.push(`拘提/逮捕時間：${fmtRocDateTime(s.arrestDateTime)}`);
    lines.push(`拘提/逮捕地點：${s.arrestLocation || ''}`);
    lines.push('');
    lines.push('法定障礙事由明細');
    lines.push(SEP);

    // 將已輸入的障礙事由依類型分組（同一類型可多筆）
    const byType = {};
    (s.obstacles || []).forEach(o => {
      const id = String(o.type);
      if (!byType[id]) byType[id] = [];
      byType[id].push(o);
    });

    // 9 種法定事由逐一列出；有資料者填入起迄時間，無則留空
    OBSTACLE_TYPES.forEach(t => {
      const matches = byType[String(t.id)] || [];
      lines.push(`${matches.length > 0 ? '■' : '□'} ${t.name}`);
      if (matches.length === 0) {
        lines.push(`  (${'　'.repeat(15)})`);
      } else {
        const content = matches
          .map(o => `${fmtRocDateTime(o.startDateTime)} 至 ${fmtRocDateTime(o.endDateTime)}`)
          .join('；');
        lines.push(`  (${content})`);
      }
    });

    lines.push(SEP);

    const tot = calculateTotalObstacleTime(s.obstacles || []);
    const dl = calculateDeadline(s.arrestDateTime, tot.totalMinutes, s.isWanted);
    const deadlineStr = dl ? fmtRocDateTime(dl.deadline.toISOString()) : '（無法計算）';

    lines.push(`因上述法定障礙事由，其經過之時間合計（ ${tot.hours} ）小時 ( ${tot.minutes} ) 分`);
    lines.push(`（註：上列每一法定障礙事由下之括弧內均須記明起迄之日、時、分）`);
    lines.push('');
    lines.push('【法定時限計算】');
    lines.push(`${policeHours}小時起算點：${fmtRocDateTime(s.arrestDateTime)}`);
    lines.push(`加計障礙時間：${tot.hours} 小時 ${tot.minutes} 分`);
    lines.push(`解送地檢署期限 檢警共同${combinedHours}小時(警方${policeHours}小時 + 法定障礙事由時間)：${deadlineStr}`);

    return lines.join('\n');
  });

  // 多名嫌疑人以三個空行分隔
  return records.join('\n\n\n');
};

export const exportObstacleRecordAsText = (caseSession) => {
  const text = generateObstacleRecordText(caseSession);
  const base = buildBaseFilename(caseSession);
  const blob = new Blob(['﻿' + text], { type: 'text/plain;charset=utf-8' });
  saveAs(blob, `${base}_法定障礙事由記錄表.txt`);
};

// ─────────────────────────────────────────
// 批次匯出所有嫌犯 × 3份書表
// ─────────────────────────────────────────
export const batchExportAllDocuments = async (caseSession, onProgress) => {
  const suspects = caseSession.suspects;
  const base = buildBaseFilename(caseSession);
  const total = suspects.length * 3;
  let done = 0;

  const blobs = [];
  for (const s of suspects) {
    const docData = {
      caseInfo: {
        suspectName: s.suspectName,
        caseCause: caseSession.caseCause,
        officer: caseSession.officer,
        policeAgency: caseSession.policeAgency,
        policeSubAgency: caseSession.policeSubAgency,
        policeUnit: caseSession.policeUnit,
        isWanted: s.isWanted
      },
      arrestDateTime: s.arrestDateTime,
      arrestLocation: s.arrestLocation
    };
    const name = s.suspectName || '未命名';
    blobs.push({ name: `${base}_附件12_權利告知書_${name}.docx`, fn: () => generateDocxBlobRightsNotification(docData) });
    blobs.push({ name: `${base}_附件16_告知本人通知書_${name}.docx`, fn: () => generateDocxBlobArrestNoticeSelf(docData) });
    blobs.push({ name: `${base}_附件17_告知親友通知書_${name}.docx`, fn: () => generateDocxBlobArrestNoticeRelative(docData) });
  }

  const errors = [];
  // 直接走瀏覽器下載（FileSaver），存至預設下載資料夾，不跳出資料夾選擇器
  for (const item of blobs) {
    try {
      const blob = await item.fn();
      saveAs(blob, item.name);
    } catch (e) {
      console.error('下載失敗:', item.name, e);
      errors.push(`${item.name}：${e.message}`);
    }
    done++;
    onProgress?.(done, total);
    await new Promise(r => setTimeout(r, 200));
  }
  if (errors.length > 0) {
    alert(`匯出完成，但以下 ${errors.length} 份文件產出失敗：\n\n${errors.join('\n')}`);
  }
};
