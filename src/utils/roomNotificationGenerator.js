import PizZip from 'pizzip';
import { saveAs } from 'file-saver';

const esc = (s) =>
  String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const fmtRoc = (isoStr) => {
  if (!isoStr) return { m: '', d: '', h: '', min: '' };
  const dt = new Date(isoStr);
  if (isNaN(dt.getTime())) return { m: '', d: '', h: '', min: '' };
  return {
    m: String(dt.getMonth() + 1),
    d: String(dt.getDate()),
    h: String(dt.getHours()),
    min: String(dt.getMinutes()).padStart(2, '0'),
  };
};

const FONT = `<w:rFonts w:eastAsia="標楷體" w:ascii="標楷體" w:hAnsi="標楷體" w:cs="標楷體"/>`;

const rn = (text, { bold = false, sz = 22 } = {}) =>
  `<w:r><w:rPr>${FONT}${bold ? '<w:b/><w:bCs/>' : ''}<w:sz w:val="${sz}"/><w:szCs w:val="${sz}"/></w:rPr>` +
  `<w:t xml:space="preserve">${esc(text)}</w:t></w:r>`;

const pn = (content, { align = '', before = 0, after = 80 } = {}) => {
  const jc = align ? `<w:jc w:val="${align}"/>` : '';
  return `<w:p><w:pPr>${jc}<w:spacing w:before="${before}" w:after="${after}"/></w:pPr>${content}</w:p>`;
};

const emptyP = () => `<w:p><w:pPr><w:spacing w:before="0" w:after="0"/></w:pPr></w:p>`;

const CELL_BORDERS = `<w:tcBorders>
  <w:top w:val="single" w:sz="4" w:space="0" w:color="000000"/>
  <w:left w:val="single" w:sz="4" w:space="0" w:color="000000"/>
  <w:bottom w:val="single" w:sz="4" w:space="0" w:color="000000"/>
  <w:right w:val="single" w:sz="4" w:space="0" w:color="000000"/>
</w:tcBorders>`;

const TBL_BORDERS = `<w:tblBorders>
  <w:top w:val="single" w:sz="6" w:space="0" w:color="000000"/>
  <w:left w:val="single" w:sz="6" w:space="0" w:color="000000"/>
  <w:bottom w:val="single" w:sz="6" w:space="0" w:color="000000"/>
  <w:right w:val="single" w:sz="6" w:space="0" w:color="000000"/>
  <w:insideH w:val="single" w:sz="4" w:space="0" w:color="000000"/>
  <w:insideV w:val="single" w:sz="4" w:space="0" w:color="000000"/>
</w:tblBorders>`;

const tc = (content, { w, gridSpan, vMerge, shaded } = {}) => {
  const width = w ? `<w:tcW w:w="${w}" w:type="dxa"/>` : '';
  const gs = gridSpan ? `<w:gridSpan w:val="${gridSpan}"/>` : '';
  const vm = vMerge === 'start' ? '<w:vMerge w:val="restart"/>'
    : vMerge === 'cont' ? '<w:vMerge/>' : '';
  const shd = shaded ? `<w:shd w:val="clear" w:color="auto" w:fill="F0F0F0"/>` : '';
  return `<w:tc><w:tcPr>${gs}${width}${vm}${CELL_BORDERS}${shd}<w:vAlign w:val="center"/></w:tcPr>${content}</w:tc>`;
};

const tr = (...cells) => `<w:tr>${cells.join('')}</w:tr>`;

// Column widths (total 13650 dxa, fits A4 landscape with 1cm margins)
const W = [1200, 600, 1200, 700, 1200, 2000, 800, 650, 650, 650, 600, 600, 600, 600, 700, 900];
// 0=姓名 1=性別 2=出生年月日 3=職業 4=身分證統一編號 5=住居所 6=候詢時數
// 7=強制到場月 8=日 9=時  10=入出室月 11=日 12=時 13=分  14=准否接見 15=備考

const hdrTc = (text, opts = {}) =>
  tc(pn(rn(text, { bold: true, sz: 18 }), { align: 'center', before: 0, after: 0 }), { shaded: true, ...opts });

const contTc = (w) =>
  tc(emptyP(), { w, vMerge: 'cont', shaded: true });

const datTc = (text, w, align = 'center') =>
  tc(pn(rn(text, { sz: 20 }), { align, before: 0, after: 0 }), { w });

const buildInfoTable = (data, isEntry) => {
  const timeLabel = isEntry ? '入室時間' : '出室時間';
  const forced = fmtRoc(data.forcedArrivalDateTime);
  const rt = fmtRoc(isEntry ? data.entryDateTime : data.exitDateTime);
  const TOTAL = W.reduce((a, b) => a + b, 0);

  const row1 = tr(
    hdrTc('姓名',         { w: W[0],  vMerge: 'start' }),
    hdrTc('性別',         { w: W[1],  vMerge: 'start' }),
    hdrTc('出生年月日',   { w: W[2],  vMerge: 'start' }),
    hdrTc('職業',         { w: W[3],  vMerge: 'start' }),
    hdrTc('身分證統一編號', { w: W[4], vMerge: 'start' }),
    hdrTc('住居所',       { w: W[5],  vMerge: 'start' }),
    hdrTc('候詢時數',     { w: W[6],  vMerge: 'start' }),
    hdrTc('強制到場時間', { w: W[7]+W[8]+W[9],         gridSpan: 3 }),
    hdrTc(timeLabel,      { w: W[10]+W[11]+W[12]+W[13], gridSpan: 4 }),
    hdrTc('准否接見',     { w: W[14], vMerge: 'start' }),
    hdrTc('備考',         { w: W[15], vMerge: 'start' }),
  );

  const row2 = tr(
    contTc(W[0]), contTc(W[1]), contTc(W[2]), contTc(W[3]),
    contTc(W[4]), contTc(W[5]), contTc(W[6]),
    hdrTc('月', { w: W[7]  }),
    hdrTc('日', { w: W[8]  }),
    hdrTc('時', { w: W[9]  }),
    hdrTc('月', { w: W[10] }),
    hdrTc('日', { w: W[11] }),
    hdrTc('時', { w: W[12] }),
    hdrTc('分', { w: W[13] }),
    contTc(W[14]), contTc(W[15]),
  );

  const row3 = tr(
    datTc(data.suspectName || '', W[0]),
    datTc(data.gender || '',      W[1]),
    datTc(data.birthDate || '',   W[2]),
    datTc(data.occupation || '',  W[3]),
    datTc(data.idNumber || '',    W[4]),
    datTc(data.address || '',     W[5], 'left'),
    datTc('',                     W[6]),
    datTc(forced.m,  W[7]),
    datTc(forced.d,  W[8]),
    datTc(forced.h,  W[9]),
    datTc(rt.m,  W[10]),
    datTc(rt.d,  W[11]),
    datTc(rt.h,  W[12]),
    datTc(rt.min, W[13]),
    datTc('', W[14]),
    datTc('', W[15]),
  );

  return `<w:tbl><w:tblPr>
    <w:tblW w:w="${TOTAL}" w:type="dxa"/>
    <w:tblLayout w:type="fixed"/>
    ${TBL_BORDERS}
  </w:tblPr>
  <w:tblGrid>${W.map(w => `<w:gridCol w:w="${w}"/>`).join('')}</w:tblGrid>
  ${row1}${row2}${row3}
  </w:tbl>`;
};

const dividerLine = () => `<w:p><w:pPr>
  <w:spacing w:before="120" w:after="120"/>
  <w:pBdr><w:bottom w:val="single" w:sz="12" w:space="1" w:color="000000"/></w:pBdr>
</w:pPr></w:p>`;

const buildOneForm = (data, isEntry, copyNum) => {
  const title = isEntry ? '候詢人入室通知單' : '候詢人出室通知單';
  const copyLabel = copyNum === 1 ? '第一聯—存根' : '第二聯—送候詢室';
  const n = data.suspectCount || 1;
  const countStr = n > 1 ? `等${n}名` : '等1名';
  const bodyText = isEntry
    ? `　　上開${data.suspectName || '　　'}${countStr}因涉嫌${data.caseCause || '　　　　'}案送入候詢室（簽收：　　　　　　　　 ）`
    : `　　上開${data.suspectName || '　　'}${countStr}已自候詢室出室（簽收：　　　　　　　　 ）`;

  const agencyName = data.agencyName || '';
  const spacer = agencyName.length < 10 ? '　'.repeat(Math.max(1, 12 - agencyName.length)) : '　　';

  return [
    pn(rn(copyLabel, { bold: true, sz: 20 }), { before: 0, after: 40 }),
    pn(rn(`${agencyName}${spacer}${title}`, { bold: true, sz: 24 }), { before: 0, after: 120 }),
    buildInfoTable(data, isEntry),
    pn(rn(bodyText, { sz: 22 }), { before: 120, after: 60 }),
    pn(rn('　　　　此　致', { sz: 22 }), { before: 0, after: 60 }),
    pn(rn('　　候詢室', { sz: 22 }), { before: 0, after: 60 }),
    pn(rn('　　　　　　　　承辦人　　　　　　　　　　敬會　勤務指揮中心　　　　機關主管長官', { sz: 22 }), { before: 0, after: 0 }),
    pn(rn('　　　　　　　（簽　　章）', { sz: 22 }), { before: 0, after: 120 }),
  ].join('');
};

const buildDocxBlob = (data, isEntry) => {
  const body = buildOneForm(data, isEntry, 1) + dividerLine() + buildOneForm(data, isEntry, 2);

  const docXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
  xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    ${body}
    <w:sectPr>
      <w:pgSz w:w="16838" w:h="11906" w:orient="landscape"/>
      <w:pgMar w:top="567" w:right="567" w:bottom="567" w:left="567" w:header="0" w:footer="0" w:gutter="0"/>
    </w:sectPr>
  </w:body>
</w:document>`;

  const zip = new PizZip();
  zip.file('[Content_Types].xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`);

  zip.file('_rels/.rels',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`);

  zip.file('word/document.xml', docXml);
  zip.file('word/_rels/document.xml.rels',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
</Relationships>`);

  return zip.generate({ type: 'blob', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
};

export const generateBothNotifications = (data) => {
  const name = data.suspectName || '未命名';
  const entryBlob = buildDocxBlob(data, true);
  const exitBlob  = buildDocxBlob(data, false);
  saveAs(entryBlob, `入室通知單_${name}.docx`);
  setTimeout(() => saveAs(exitBlob, `出室通知單_${name}.docx`), 150);
};
