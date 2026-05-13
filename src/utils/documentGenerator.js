import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import { saveAs } from 'file-saver';
import template12b64 from '../template_12b64.js';
import template16b64 from '../template_16b64.js';
import template17b64 from '../template_17b64.js';

// 範本對應表
const templateMap = {
  './template_12.docx': template12b64,
  './template_16.docx': template16b64,
  './template_17.docx': template17b64,
};

// 輔助函式：Base64 轉 ArrayBuffer
const base64ToArrayBuffer = (base64) => {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
};

// 輔助函式：將 ISO 時間轉為民國年月日時分
const getTemplateDates = (isoString) => {
  if (!isoString) return { arrY: '　　', arrM: '　', arrD: '　', arrH: '　', arrMin: '　' };
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return { arrY: '　　', arrM: '　', arrD: '　', arrH: '　', arrMin: '　' };
  return {
    arrY: String(d.getFullYear() - 1911),
    arrM: String(d.getMonth() + 1).padStart(2, '0'),
    arrD: String(d.getDate()).padStart(2, '0'),
    arrH: String(d.getHours()).padStart(2, '0'),
    arrMin: String(d.getMinutes()).padStart(2, '0')
  };
};

/**
 * 核心函式：讀取指定的 docx 範本，填入資料並下載
 */
const generateDocxFromTemplate = async (templatePath, data, outputName) => {
  try {
    const b64 = templateMap[templatePath];
    if (!b64) {
      throw new Error(`找不到對應的範本：${templatePath}`);
    }
    const content = base64ToArrayBuffer(b64);

    const zip = new PizZip(content);
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
      delimiters: { start: "{{", end: "}}" }
    });

    const dates = getTemplateDates(data.arrestDateTime);
    const caseInfo = data.caseInfo || {};

    const currentUnit = caseInfo.policeUnit || '　　　　　';

    const templateData = {
      suspectName: caseInfo.suspectName || '　　　　　',
      caseCause: caseInfo.caseCause || '　　　　　',
      officer: caseInfo.officer || '　　　　　',
      agencyFull: `${caseInfo.policeAgency || ''}${caseInfo.policeSubAgency || ''}`,
      policeUnit: currentUnit,
      unit: currentUnit,
      arrestLocation: data.arrestLocation || '　　　　　　　　　　　',
      ...dates
    };

    doc.render(templateData);

    const out = doc.getZip().generate({
      type: 'blob',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });

    saveAs(out, outputName);

  } catch (error) {
    console.error("產生 Word 文件時發生錯誤:", error);
    alert("產出失敗！請確認範本標籤格式是否正確，並檢查 Console 錯誤訊息。");
  }
};

// ================= 單份下載（按鈕直接觸發）=================

export const generateRightsNotification = (data) => {
  generateDocxFromTemplate('./template_12.docx', data, `附件12_權利告知書_${data.caseInfo?.suspectName || '未命名'}.docx`);
};

export const generateArrestNoticeSelf = (data) => {
  generateDocxFromTemplate('./template_16.docx', data, `附件16_告知本人通知書_${data.caseInfo?.suspectName || '未命名'}.docx`);
};

export const generateArrestNoticeRelative = (data) => {
  generateDocxFromTemplate('./template_17.docx', data, `附件17_告知親友通知書_${data.caseInfo?.suspectName || '未命名'}.docx`);
};

// ================= 回傳 Blob（供批次匯出使用）=================

const generateDocxBlobFromTemplate = async (templatePath, data) => {
  const b64 = templateMap[templatePath];
  if (!b64) throw new Error(`找不到對應的範本：${templatePath}`);
  const content = base64ToArrayBuffer(b64);
  const zip = new PizZip(content);
  const doc = new Docxtemplater(zip, {
    paragraphLoop: true, linebreaks: true,
    delimiters: { start: '{{', end: '}}' }
  });
  const dates = getTemplateDates(data.arrestDateTime);
  const caseInfo = data.caseInfo || {};
  const currentUnit = caseInfo.policeUnit || '　　　　　';
  doc.render({
    suspectName: caseInfo.suspectName || '　　　　　',
    caseCause: caseInfo.caseCause || '　　　　　',
    officer: caseInfo.officer || '　　　　　',
    agencyFull: `${caseInfo.policeAgency || ''}${caseInfo.policeSubAgency || ''}`,
    policeUnit: currentUnit, unit: currentUnit,
    arrestLocation: data.arrestLocation || '　　　　　　　　　　　',
    ...dates
  });
  return doc.getZip().generate({
    type: 'blob',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  });
};

export const generateDocxBlobRightsNotification = (data) =>
  generateDocxBlobFromTemplate('./template_12.docx', data);

export const generateDocxBlobArrestNoticeSelf = (data) =>
  generateDocxBlobFromTemplate('./template_16.docx', data);

export const generateDocxBlobArrestNoticeRelative = (data) =>
  generateDocxBlobFromTemplate('./template_17.docx', data);