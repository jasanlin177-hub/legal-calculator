import PizZip from 'pizzip';
import { saveAs } from 'file-saver';

// ─────────────────────────────────────────
// Open XML 最小結構 helpers
// ─────────────────────────────────────────
const esc = (s) => String(s ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

const run = (text, opts = {}) => {
  const bold = opts.bold ? '<w:b/>' : '';
  const size = opts.size ? `<w:sz w:val="${opts.size}"/><w:szCs w:val="${opts.size}"/>` : '';
  const font = `<w:rFonts w:eastAsia="標楷體" w:ascii="標楷體" w:hAnsi="標楷體"/>`;
  return `<w:r><w:rPr>${font}${bold}${size}</w:rPr><w:t xml:space="preserve">${esc(text)}</w:t></w:r>`;
};

const para = (content, opts = {}) => {
  const align = opts.align ? `<w:jc w:val="${opts.align}"/>` : '';
  const spacing = opts.spacing ? `<w:spacing w:after="${opts.spacing}"/>` : '<w:spacing w:after="0"/>';
  return `<w:p><w:pPr>${align}${spacing}</w:pPr>${content}</w:p>`;
};

const cell = (content, opts = {}) => {
  const w = opts.w ? `<w:tcW w:w="${opts.w}" w:type="dxa"/>` : '';
  const borders = `<w:tcBorders>
    <w:top w:val="single" w:sz="4" w:space="0" w:color="000000"/>
    <w:left w:val="single" w:sz="4" w:space="0" w:color="000000"/>
    <w:bottom w:val="single" w:sz="4" w:space="0" w:color="000000"/>
    <w:right w:val="single" w:sz="4" w:space="0" w:color="000000"/>
  </w:tcBorders>`;
  const vAlign = `<w:vAlign w:val="center"/>`;
  const shading = opts.header ? `<w:shd w:val="clear" w:color="auto" w:fill="D9E1F2"/>` : '';
  const span = opts.gridSpan ? `<w:gridSpan w:val="${opts.gridSpan}"/>` : '';
  return `<w:tc><w:tcPr>${span}${w}${borders}${shading}${vAlign}</w:tcPr>${content}</w:tc>`;
};

const row = (cells) => `<w:tr>${cells}</w:tr>`;

const table = (rows, opts = {}) => {
  const tblW = `<w:tblW w:w="9000" w:type="dxa"/>`;
  const tblBorders = `<w:tblBorders>
    <w:top w:val="single" w:sz="6" w:space="0" w:color="000000"/>
    <w:left w:val="single" w:sz="6" w:space="0" w:color="000000"/>
    <w:bottom w:val="single" w:sz="6" w:space="0" w:color="000000"/>
    <w:right w:val="single" w:sz="6" w:space="0" w:color="000000"/>
    <w:insideH w:val="single" w:sz="4" w:space="0" w:color="000000"/>
    <w:insideV w:val="single" w:sz="4" w:space="0" w:color="000000"/>
  </w:tblBorders>`;
  return `<w:tbl><w:tblPr>${tblW}${tblBorders}</w:tblPr>${rows}</w:tbl>`;
};

const pageBreak = () => `<w:p><w:r><w:br w:type="page"/></w:r></w:p>`;

// ─────────────────────────────────────────
// 格式化時間
// ─────────────────────────────────────────
const fmtDateTime = (isoStr) => {
  if (!isoStr) return { y: '', m: '', d: '', h: '', min: '' };
  const dt = new Date(isoStr);
  return {
    y: String(dt.getFullYear() - 1911),
    m: String(dt.getMonth() + 1).padStart(2, '0'),
    d: String(dt.getDate()).padStart(2, '0'),
    h: String(dt.getHours()).padStart(2, '0'),
    min: String(dt.getMinutes()).padStart(2, '0')
  };
};

// ─────────────────────────────────────────
// 單份通知單表格（入室或出室）
// ─────────────────────────────────────────
const buildNotificationTable = (data, isEntry) => {
  const title = isEntry ? '候詢人入室通知單' : '候詢人出室通知單';
  const timeLabel = isEntry ? '入室時間' : '出室時間';
  const { suspectName, birthDate, gender, idNumber, caseNumber, officerName } = data;
  const timeFields = fmtDateTime(isEntry ? data.entryDateTime : data.exitDateTime);

  const titleRow = row(
    cell(
      para(run(title, { bold: true, size: 28 }), { align: 'center', spacing: '60' }),
      { gridSpan: 6, header: true }
    )
  );

  const caseRow = row([
    cell(para(run('案件編號', { bold: true }), { align: 'center', spacing: '0' }), { w: '1400' }),
    cell(para(run(caseNumber || ''), { spacing: '0' }), { gridSpan: 5 })
  ].join(''));

  const nameRow = row([
    cell(para(run('姓　　名', { bold: true }), { align: 'center', spacing: '0' }), { w: '1400' }),
    cell(para(run(suspectName || ''), { spacing: '0' }), { w: '1700' }),
    cell(para(run('出生年月日', { bold: true }), { align: 'center', spacing: '0' }), { w: '1500' }),
    cell(para(run(birthDate || ''), { spacing: '0' }), { w: '1400' }),
    cell(para(run('性別', { bold: true }), { align: 'center', spacing: '0' }), { w: '700' }),
    cell(para(run(gender || ''), { align: 'center', spacing: '0' }), { w: '700' })
  ].join(''));

  const idRow = row([
    cell(para(run('身分證號', { bold: true }), { align: 'center', spacing: '0' }), { w: '1400' }),
    cell(para(run(idNumber || ''), { spacing: '0' }), { gridSpan: 5 })
  ].join(''));

  const timeRow = row([
    cell(para(run(timeLabel, { bold: true }), { align: 'center', spacing: '0' }), { w: '1400' }),
    cell(para(
      run(`民國 ${timeFields.y} 年 ${timeFields.m} 月 ${timeFields.d} 日  ${timeFields.h} 時 ${timeFields.min} 分`),
      { spacing: '0' }
    ), { gridSpan: 5 })
  ].join(''));

  const officerRow = row([
    cell(para(run('執行人員', { bold: true }), { align: 'center', spacing: '0' }), { w: '1400' }),
    cell(para(run(officerName || ''), { spacing: '0' }), { w: '1700' }),
    cell(para(run('簽章', { bold: true }), { align: 'center', spacing: '0' }), { w: '1500' }),
    cell(para(run(''), { spacing: '0' }), { gridSpan: 3 })
  ].join(''));

  const noteRow = row(
    cell(
      para(run('本通知單請交由被通知人收執'), { align: 'center', spacing: '60' }),
      { gridSpan: 6 }
    )
  );

  return table([titleRow, caseRow, nameRow, idRow, timeRow, officerRow, noteRow].join(''));
};

// ─────────────────────────────────────────
// 產生 DOCX（4份通知單在同一文件）
// ─────────────────────────────────────────
const buildDocxBlob = (data, isEntry) => {
  const tables = [];
  for (let i = 0; i < 4; i++) {
    tables.push(buildNotificationTable(data, isEntry));
    if (i < 3) {
      tables.push(para(run('')));
      tables.push(para(run('─'.repeat(50)), { align: 'center', spacing: '60' }));
      tables.push(para(run('')));
    }
  }

  const body = tables.join('');

  const docXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:wpc="http://schemas.microsoft.com/office/word/2010/wordprocessingCanvas"
  xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006"
  xmlns:o="urn:schemas-microsoft-com:office:office"
  xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
  xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math"
  xmlns:v="urn:schemas-microsoft-com:vml"
  xmlns:wp14="http://schemas.microsoft.com/office/word/2010/wordprocessingDrawing"
  xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"
  xmlns:w10="urn:schemas-microsoft-com:office:word"
  xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
  xmlns:w14="http://schemas.microsoft.com/office/word/2010/wordml"
  xmlns:wpg="http://schemas.microsoft.com/office/word/2010/wordprocessingGroup"
  xmlns:wpi="http://schemas.microsoft.com/office/word/2010/wordprocessingInk"
  xmlns:wne="http://schemas.microsoft.com/office/word/2006/wordml"
  xmlns:wps="http://schemas.microsoft.com/office/word/2010/wordprocessingShape"
  mc:Ignorable="w14 wp14">
  <w:body>
    ${body}
    <w:sectPr>
      <w:pgSz w:w="11906" w:h="16838"/>
      <w:pgMar w:top="720" w:right="900" w:bottom="720" w:left="900" w:header="708" w:footer="708" w:gutter="0"/>
    </w:sectPr>
  </w:body>
</w:document>`;

  const zip = new PizZip();

  zip.file('[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`);

  zip.file('_rels/.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`);

  zip.file('word/document.xml', docXml);

  zip.file('word/_rels/document.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
</Relationships>`);

  return zip.generate({ type: 'blob', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
};

// ─────────────────────────────────────────
// 公開 API
// ─────────────────────────────────────────
export const generateEntryNotification = (data) => {
  const blob = buildDocxBlob(data, true);
  const name = data.suspectName || '未命名';
  saveAs(blob, `入室通知單_${name}.docx`);
};

export const generateExitNotification = (data) => {
  const blob = buildDocxBlob(data, false);
  const name = data.suspectName || '未命名';
  saveAs(blob, `出室通知單_${name}.docx`);
};

export const generateEntryNotificationBlob = (data) => buildDocxBlob(data, true);
export const generateExitNotificationBlob = (data) => buildDocxBlob(data, false);
