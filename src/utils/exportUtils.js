import { saveAs } from 'file-saver';
import {
  generateDocxBlobRightsNotification,
  generateDocxBlobArrestNoticeSelf,
  generateDocxBlobArrestNoticeRelative
} from './documentGenerator';
import { calculateTotalObstacleTime, calculateDeadline, formatROCDateTime } from './dateUtils';
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
// 法定障礙事由記錄表（.txt）
// ─────────────────────────────────────────
const chineseNum = (n) => ['一','二','三','四','五','六','七','八','九','十',
  '十一','十二','十三','十四','十五','十六','十七','十八','十九','二十'][n] ?? String(n+1);

const formatDateShort = (isoStr) => {
  if (!isoStr) return '（未輸入）';
  const d = new Date(isoStr);
  if (isNaN(d)) return isoStr;
  const y = d.getFullYear() - 1911;
  const m = String(d.getMonth()+1).padStart(2,'0');
  const day = String(d.getDate()).padStart(2,'0');
  const h = String(d.getHours()).padStart(2,'0');
  const min = String(d.getMinutes()).padStart(2,'0');
  return `${y}/${m}/${day} ${h}:${min}`;
};

const pad = (n, w=2) => String(n).padStart(w, ' ');

export const generateObstacleRecordText = (caseSession) => {
  const now = new Date();
  const rocNow = now.getFullYear() - 1911;
  const lines = [];

  lines.push('解送人犯法定障礙事由記錄表');
  lines.push('═'.repeat(48));
  lines.push(`案由：${caseSession.caseCause || '（未填）'}　承辦人：${caseSession.officer || '（未填）'}`);
  lines.push(`機關：${caseSession.policeAgency || ''}${caseSession.policeSubAgency ? ' ' + caseSession.policeSubAgency : ''}${caseSession.policeUnit ? ' ' + caseSession.policeUnit : ''}`);
  lines.push(`建立日期：民國${rocNow}年${String(now.getMonth()+1).padStart(2,'0')}月${String(now.getDate()).padStart(2,'0')}日`);
  lines.push('═'.repeat(48));

  caseSession.suspects.forEach((s, idx) => {
    lines.push('');
    lines.push(`【嫌疑人${chineseNum(idx)}】${s.suspectName || '（未命名）'}`);
    lines.push('─'.repeat(48));
    lines.push(`  拘提時間：${formatDateShort(s.arrestDateTime)}`);
    lines.push(`  通緝犯：${s.isWanted === 'true' ? '是' : '否'}　基準時限：${s.isWanted === 'true' ? '24' : '16'}小時`);

    const tot = calculateTotalObstacleTime(s.obstacles);
    const dl = calculateDeadline(s.arrestDateTime, tot.totalMinutes, s.isWanted);

    if (s.obstacles.length === 0) {
      lines.push('  法定障礙事由：（無）');
    } else {
      lines.push('');
      lines.push('  法定障礙事由：');
      s.obstacles.forEach((o, oi) => {
        const typeName = OBSTACLE_TYPES.find(t => String(t.id) === String(o.type))?.name || `類型${o.type}`;
        lines.push(`  No.${oi+1}  類型：${typeName}`);
        lines.push(`        開始：${formatDateShort(o.startDateTime)}`);
        lines.push(`        結束：${formatDateShort(o.endDateTime)}`);
        lines.push(`        小計：${o.hours}小時${o.minutes}分`);
      });
    }

    lines.push('');
    lines.push(`  障礙事由總計：${tot.hours}小時${tot.minutes}分`);
    lines.push(`  解送期限：${dl ? formatDateShort(dl.deadline.toISOString()) : '（無法計算）'}`);
    lines.push('─'.repeat(48));
  });

  lines.push('');
  lines.push('═'.repeat(48));
  lines.push(`匯出時間：民國${rocNow}年${String(now.getMonth()+1).padStart(2,'0')}月${String(now.getDate()).padStart(2,'0')}日 ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`);
  lines.push('═'.repeat(48));

  return lines.join('\n');
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

  const hasFSA = typeof window.showDirectoryPicker === 'function';
  if (hasFSA) {
    let dirHandle;
    try {
      dirHandle = await window.showDirectoryPicker({ mode: 'readwrite' });
    } catch {
      return; // 使用者取消
    }
    for (const item of blobs) {
      try {
        const blob = await item.fn();
        if (!blob) continue;
        const fh = await dirHandle.getFileHandle(item.name, { create: true });
        const writable = await fh.createWritable();
        await writable.write(blob);
        await writable.close();
      } catch (e) {
        console.error('寫入失敗:', item.name, e);
      }
      done++;
      onProgress?.(done, total);
    }
  } else {
    for (const item of blobs) {
      try {
        const blob = await item.fn();
        if (blob) saveAs(blob, item.name);
      } catch (e) {
        console.error('下載失敗:', item.name, e);
      }
      done++;
      onProgress?.(done, total);
      await new Promise(r => setTimeout(r, 120));
    }
  }
};
