import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import { saveAs } from 'file-saver';
import template01b64 from '../template_01b64.js';
import template02b64 from '../template_02b64.js';
import template20b64 from '../template_20b64.js';
import template23b64 from '../template_23b64.js';
import template24b64 from '../template_24b64.js';
import templatelafb64 from '../template_lafb64.js';
import templatechild_visitb64 from '../template_child_visitb64.js';
import templatechild_interviewb64 from '../template_child_interviewb64.js';

const b64Map = {
  'template_01': template01b64,
  'template_02': template02b64,
  'template_20': template20b64,
  'template_23': template23b64,
  'template_24': template24b64,
  'template_laf': templatelafb64,
  'template_child_visit': templatechild_visitb64,
  'template_child_interview': templatechild_interviewb64,
};

const base64ToArrayBuffer = (b64) => {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes.buffer;
};

// ISO 字串 → ROC 年月日時分各欄位
const rocDates = (iso) => {
  if (!iso) return { Y: '', M: '', D: '', H: '', Min: '' };
  const d = new Date(iso);
  if (isNaN(d.getTime())) return { Y: '', M: '', D: '', H: '', Min: '' };
  return {
    Y:   String(d.getFullYear() - 1911),
    M:   String(d.getMonth() + 1).padStart(2, '0'),
    D:   String(d.getDate()).padStart(2, '0'),
    H:   String(d.getHours()).padStart(2, '0'),
    Min: String(d.getMinutes()).padStart(2, '0'),
  };
};

// ROC 出生日期（民國年/月/日格式）→ 各欄位
const rocBirthDate = (birthDate) => {
  if (!birthDate || !birthDate.includes('/')) return { birthY: '', birthM: '', birthD: '' };
  const [y, m, d] = birthDate.split('/');
  return { birthY: y || '', birthM: (m || '').padStart(2, '0'), birthD: (d || '').padStart(2, '0') };
};

// 是否為 12 歲以上 18 歲未滿之少年（法律扶助表用）
const isTeenMinor = (birthDate) => {
  if (!birthDate || !birthDate.includes('/')) return false;
  const [rocY, m, d] = birthDate.split('/').map(s => parseInt(s, 10));
  if (!rocY || !m || !d) return false;
  const gYear = rocY + 1911;
  const birth = new Date(gYear, m - 1, d);
  if (isNaN(birth.getTime())) return false;
  const today = new Date();
  const age12Date = new Date(gYear + 12, m - 1, d);
  const age18Date = new Date(gYear + 18, m - 1, d);
  return today >= age12Date && today < age18Date;
};

// 渲染範本並回傳 Blob（供直接下載或批次匯出）
const renderBlob = (templateKey, data) => {
  const b64 = b64Map[templateKey];
  if (!b64) throw new Error(`找不到範本：${templateKey}`);
  const zip = new PizZip(base64ToArrayBuffer(b64));
  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
    delimiters: { start: '{{', end: '}}' },
    parser: (tag) => {
      const key = tag.trim();
      return { get: (scope) => scope[key] };
    },
  });
  doc.render(data);
  return doc.getZip().generate({
    type: 'blob',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });
};

const generateDoc = async (templateKey, data, filename) => {
  try {
    saveAs(renderBlob(templateKey, data), filename);
  } catch (err) {
    console.error('產生文件失敗', err);
    alert(`產出失敗：${err.message}`);
  }
};

// 從 caseSession + activeSuspect 組建通用資料包
const buildData = (caseSession, suspect) => {
  const arr = rocDates(suspect.arrestDateTime);
  const { birthY, birthM, birthD } = rocBirthDate(suspect.birthDate);
  const agencyFull = `${caseSession.policeAgency || ''}${caseSession.policeSubAgency || ''}`;
  const today = rocDates(new Date().toISOString());

  // 去除使用者可能已自行輸入的「族」「第」「類」，避免與書表固定文字重複
  const stripTribeSuffix = (s) => (s || '').trim().replace(/族$/, '');
  const stripDisabilityWrap = (s) => (s || '').trim().replace(/^第/, '').replace(/類$/, '');

  // 身分別標籤（法律扶助表用）
  let statusLabel = suspect.suspectStatus || '一般';
  if (suspect.suspectStatus === '原住民' && suspect.suspectStatusNote)
    statusLabel = `原住民（${stripTribeSuffix(suspect.suspectStatusNote)}族）`;
  else if (suspect.suspectStatus === '身心障礙' && suspect.suspectStatusNote)
    statusLabel = `身心障礙（第${stripDisabilityWrap(suspect.suspectStatusNote)}類）`;

  // 法律扶助表：身分別自動勾選判斷
  const isIndigenous = suspect.suspectStatus === '原住民';
  const isDisabled = suspect.suspectStatus === '身心障礙';
  const isMinorTeen = isTeenMinor(suspect.birthDate);

  return {
    suspectName:  suspect.suspectName  || '',
    gender:       suspect.gender       || '',
    isMale:       suspect.gender === '男',
    isFemale:     suspect.gender === '女',
    idNumber:     suspect.idNumber     || '',
    homeAddress:  suspect.homeAddress  || '',
    phone:        suspect.phone        || '',
    birthY, birthM, birthD,
    arrestY: arr.Y, arrestM: arr.M, arrestD: arr.D, arrestH: arr.H, arrestMin: arr.Min,
    execY: arr.Y, execM: arr.M, execD: arr.D, // 執行時間預設同逮捕時間
    execLocation: suspect.arrestLocation || '',
    caseCause:    caseSession.caseCause  || '',
    officer:      caseSession.officer    || '',
    agencyFull,
    policeAgency:    caseSession.policeAgency || '',
    policeSubAgency: caseSession.policeSubAgency || '',
    policeUnit:   caseSession.policeUnit || '',
    unitAddress:  caseSession.unitAddress || '',
    caseYear:     today.Y,
    statusLabel,
    isIndigenous,
    indigenousTribe: isIndigenous ? stripTribeSuffix(suspect.suspectStatusNote) : ' '.repeat(14),
    isDisabled,
    disabilityCode: isDisabled ? stripDisabilityWrap(suspect.suspectStatusNote) : ' '.repeat(9),
    isMinorTeen,
  };
};

const name = (s) => s.suspectName || '未命名';

// ── 匯出函式 ──────────────────────────────────────────────────────────────

export const generateConsentInspection = (caseSession, suspect) =>
  generateDoc('template_01', buildData(caseSession, suspect),
    `附件一_勘察採證同意書_${name(suspect)}.docx`);

export const generateConsentSearch = (caseSession, suspect) =>
  generateDoc('template_02', buildData(caseSession, suspect),
    `附件二_自願受搜索同意書_${name(suspect)}.docx`);

export const generateConsentUrine = (caseSession, suspect) =>
  generateDoc('template_20', buildData(caseSession, suspect),
    `附件二十_自願受採尿同意書_${name(suspect)}.docx`);

export const generateSearchSeizureRecord = (caseSession, suspect) =>
  generateDoc('template_23', buildData(caseSession, suspect),
    `附件二十三_搜索扣押筆錄_${name(suspect)}.docx`);

export const generateSeizureReceipt = (caseSession, suspect) =>
  generateDoc('template_24', buildData(caseSession, suspect),
    `附件二十四_扣押物品收據_${name(suspect)}.docx`);

export const generateLegalAidNotice = (caseSession, suspect) =>
  generateDoc('template_laf', buildData(caseSession, suspect),
    `法律扶助指派律師通知表_${name(suspect)}.docx`);

export const generateChildWelfareVisit = (caseSession, suspect) =>
  generateDoc('template_child_visit', buildData(caseSession, suspect),
    `兒童照顧查訪紀錄表_${name(suspect)}.docx`);

export const generateChildWelfareInterview = (caseSession, suspect) =>
  generateDoc('template_child_interview', buildData(caseSession, suspect),
    `兒童照顧面訪紀錄表_${name(suspect)}.docx`);

// ── 批次匯出：回傳單一嫌犯全部 8 份書表的 {name, blob} ──────────────────────
const CONSENT_FORM_DEFS = [
  ['template_01', '附件一_勘察採證同意書'],
  ['template_02', '附件二_自願受搜索同意書'],
  ['template_20', '附件二十_自願受採尿同意書'],
  ['template_23', '附件二十三_搜索扣押筆錄'],
  ['template_24', '附件二十四_扣押物品收據'],
  ['template_laf', '法律扶助指派律師通知表'],
  ['template_child_visit', '兒童照顧查訪紀錄表'],
  ['template_child_interview', '兒童照顧面訪紀錄表'],
];

export const buildConsentFormBlobs = (caseSession, suspect, baseFilename = '') => {
  const data = buildData(caseSession, suspect);
  const nm = name(suspect);
  const prefix = baseFilename ? `${baseFilename}_` : '';
  return CONSENT_FORM_DEFS.map(([key, label]) => ({
    name: `${prefix}${label}_${nm}.docx`,
    fn: () => renderBlob(key, data),
  }));
};
