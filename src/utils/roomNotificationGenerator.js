import PizZip from 'pizzip';
import { saveAs } from 'file-saver';

const esc = (s) => String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');

const fmtRoc = (isoStr) => {
  if (!isoStr) return { y:'', m:'', d:'', h:'', min:'' };
  const dt = new Date(isoStr);
  if (isNaN(dt.getTime())) return { y:'', m:'', d:'', h:'', min:'' };
  return {
    y: String(dt.getFullYear() - 1911),
    m: String(dt.getMonth() + 1),
    d: String(dt.getDate()),
    h: String(dt.getHours()),
    min: String(dt.getMinutes()).padStart(2, '0'),
  };
};

const FONT = `<w:rFonts w:eastAsia="標楷體" w:ascii="標楷體" w:hAnsi="標楷體" w:cs="標楷體"/>`;

const rn = (text, { bold = false, sz = 24 } = {}) =>
  `<w:r><w:rPr>${FONT}${bold ? '<w:b/><w:bCs/>' : ''}<w:sz w:val="${sz}"/><w:szCs w:val="${sz}"/></w:rPr><w:t xml:space="preserve">${esc(text)}</w:t></w:r>`;

const pn = (content, { align = '', before = 0, after = 0 } = {}) => {
  const jc = align ? `<w:jc w:val="${align}"/>` : '';
  return `<w:p><w:pPr>${jc}<w:spacing w:before="${before}" w:after="${after}"/></w:pPr>${content}</w:p>`;
};

const emptyP = () => `<w:p><w:pPr><w:spacing w:before="0" w:after="0"/></w:pPr></w:p>`;

const CELL_BORDER = `<w:tcBorders>
  <w:top    w:val="single" w:sz="4" w:space="0" w:color="000000"/>
  <w:left   w:val="single" w:sz="4" w:space="0" w:color="000000"/>
  <w:bottom w:val="single" w:sz="4" w:space="0" w:color="000000"/>
  <w:right  w:val="single" w:sz="4" w:space="0" w:color="000000"/>
</w:tcBorders>`;

const TBL_BORDER = `<w:tblBorders>
  <w:top    w:val="single" w:sz="8" w:space="0" w:color="000000"/>
  <w:left   w:val="single" w:sz="8" w:space="0" w:color="000000"/>
  <w:bottom w:val="single" w:sz="8" w:space="0" w:color="000000"/>
  <w:right  w:val="single" w:sz="8" w:space="0" w:color="000000"/>
  <w:insideH w:val="single" w:sz="4" w:space="0" w:color="000000"/>
  <w:insideV w:val="single" w:sz="4" w:space="0" w:color="000000"/>
</w:tblBorders>`;

const tc = (content, { w, gs, vm, shaded } = {}) => {
  const width    = w  ? `<w:tcW w:w="${w}" w:type="dxa"/>` : '';
  const gridSpan = gs ? `<w:gridSpan w:val="${gs}"/>` : '';
  const vMerge   = vm === 'start' ? '<w:vMerge w:val="restart"/>' : vm === 'cont' ? '<w:vMerge/>' : '';
  const shd      = shaded ? `<w:shd w:val="clear" w:color="auto" w:fill="EEEEEE"/>` : '';
  return `<w:tc><w:tcPr>${gridSpan}${width}${vMerge}${CELL_BORDER}${shd}<w:vAlign w:val="center"/></w:tcPr>${content}</w:tc>`;
};

const tr = (cells, height) => {
  const trPr = height ? `<w:trPr><w:trHeight w:val="${height}" w:hRule="atLeast"/></w:trPr>` : '';
  return `<w:tr>${trPr}${cells}</w:tr>`;
};

const chunkArr = (arr, size) => {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
};

// 19 columns exactly matching the reference template tblGrid
// col 11 (17 dxa) is a thin separator; 強制到場時 always uses gs=2 to span cols 11+12
const W = [
  1300, // 0:  姓名
  680,  // 1:  性別
  572,  // 2:  出生年
  709,  // 3:  出生月
  567,  // 4:  出生日
  708,  // 5:  職業
  1418, // 6:  身分證統一編號
  3544, // 7:  住居所
  522,  // 8:  候詢時數
  560,  // 9:  強制到場月
  560,  // 10: 強制到場日
  17,   // 11: (分隔欄)
  543,  // 12: 強制到場時 (與col11合併 gs=2, 實際寬560)
  530,  // 13: 入/出室月
  530,  // 14: 入/出室日
  530,  // 15: 入/出室時
  530,  // 16: 入/出室分
  624,  // 17: 准否接見
  1156, // 18: 備考（捺指紋）
]; // total: 15600

const TOTAL_W = W.reduce((a, b) => a + b, 0); // 15600
const L_SPAN  = 12; // cols 0-11 → 標題左欄
const R_SPAN  = 7;  // cols 12-18 → 標題右欄
const L_W     = W.slice(0, L_SPAN).reduce((a, b) => a + b, 0); // 11157
const R_W     = W.slice(L_SPAN).reduce((a, b) => a + b, 0);    // 4443

// Header cell: bold, sz=24, shaded
const hCell = (text, opts = {}) =>
  tc(pn(rn(text, { bold: true, sz: 24 }), { align: 'center' }), { shaded: true, ...opts });

// Continuation cell for vMerge
const contCell = (w) => tc(emptyP(), { w, vm: 'cont', shaded: true });

// Data cell: sz=28 default, optional gs for gridSpan
const dCell = (text, w, { align = 'center', sz = 28, gs } = {}) =>
  tc(pn(rn(text, { sz }), { align }), gs ? { w, gs } : { w });

const buildFormTable = (suspects, isEntry, entryDT, exitDT, agencyName, caseCause) => {
  const timeLabel = isEntry ? '入　室　時　間' : '出　室　時　間';
  const today = fmtRoc(new Date().toISOString());

  // ── Row 0: 標題行（機關名稱 + 通知單名稱 | 填單日期 + 編號）
  const titleLeft =
    pn(rn(`${agencyName || '　　　　　　　　'}　　候詢人${isEntry ? '入' : '出'}室通知單`, { bold: true, sz: 36 }),
      { align: 'left', before: 40, after: 40 });
  const titleRight =
    pn(rn(`填單：民國${today.y}年${today.m}月${today.d}日　　時　　分`, { sz: 22 }), { before: 20, after: 0 }) +
    pn(rn('編號：', { sz: 22 }), { before: 0, after: 20 });
  const row0 = tr(
    tc(titleLeft,  { w: L_W, gs: L_SPAN }) +
    tc(titleRight, { w: R_W, gs: R_SPAN })
  );

  // ── Row 1: 主要欄位標題（vMerge start for 單欄，gs for 跨欄）
  const row1 = tr(
    hCell('姓　名',            { w: W[0], vm: 'start' }) +
    hCell('性　別',            { w: W[1], vm: 'start' }) +
    hCell('出　生',            { w: W[2]+W[3]+W[4], gs: 3 }) +
    hCell('職　業',            { w: W[5], vm: 'start' }) +
    hCell('身分證\n統一編號',  { w: W[6], vm: 'start' }) +
    hCell('住　居　所',        { w: W[7], vm: 'start' }) +
    hCell('候詢\n時數',        { w: W[8], vm: 'start' }) +
    hCell('強制到場時間',      { w: W[9]+W[10]+W[11]+W[12], gs: 4 }) +
    hCell(timeLabel,           { w: W[13]+W[14]+W[15]+W[16], gs: 4 }) +
    hCell('准否\n接見',        { w: W[17], vm: 'start' }) +
    hCell('備　考\n（捺指紋）',{ w: W[18], vm: 'start' })
  );

  // ── Row 2: 次要欄位標題（年月日 / 月日時 / 月日時分）
  // 強制到場時 用 gs=2 跨 col11(17)+col12(543)=560 dxa
  const row2 = tr(
    contCell(W[0]) + contCell(W[1]) +
    hCell('年', { w: W[2] }) + hCell('月', { w: W[3] }) + hCell('日', { w: W[4] }) +
    contCell(W[5]) + contCell(W[6]) + contCell(W[7]) + contCell(W[8]) +
    hCell('月', { w: W[9] }) + hCell('日', { w: W[10] }) +
    hCell('時', { w: W[11]+W[12], gs: 2 }) +
    hCell('月', { w: W[13] }) + hCell('日', { w: W[14] }) +
    hCell('時', { w: W[15] }) + hCell('分', { w: W[16] }) +
    contCell(W[17]) + contCell(W[18])
  );

  // ── Rows 3-7: 5 筆資料列
  const dataRows = Array.from({ length: 5 }, (_, i) => {
    const s      = suspects[i] ?? null;
    const forced = s ? fmtRoc(s.arrestDateTime) : {};
    const rt     = fmtRoc(isEntry ? entryDT : exitDT);
    const [birthY = '', birthM = '', birthD = ''] = (s?.birthDate || '').split('/');

    return tr(
      dCell(s?.suspectName || '',  W[0]) +
      dCell(s?.gender      || '',  W[1]) +
      dCell(birthY,                W[2]) +
      dCell(birthM,                W[3]) +
      dCell(birthD,                W[4]) +
      dCell(s?.occupation  || '',  W[5]) +
      dCell(s?.idNumber    || '',  W[6], { sz: 24 }) +
      dCell(s?.address     || '',  W[7], { align: 'left', sz: 22 }) +
      dCell('',                    W[8]) +
      dCell(s ? (forced.m || '') : '', W[9]) +
      dCell(s ? (forced.d || '') : '', W[10]) +
      dCell(s ? (forced.h || '') : '', W[11]+W[12], { gs: 2 }) +
      dCell(s ? rt.m : '',  W[13]) +
      dCell(s ? rt.d : '',  W[14]) +
      dCell(s ? rt.h : '',  W[15]) +
      dCell(s ? rt.min : '', W[16]) +
      dCell('', W[17]) +
      dCell('', W[18])
    );
  });

  // ── 正文 + 此致 + 候詢室 + 承辦人 列（固定列高比照範本）
  const fullCell = (content) =>
    tc(content, { w: TOTAL_W, gs: 19 });

  const n         = suspects.filter(Boolean).length;
  const firstName = suspects[0]?.suspectName || '　　';
  const namePart  = n <= 1
    ? `${firstName}1名`
    : `${firstName}等${n}名`;
  const bodyText  = isEntry
    ? `　　上開${namePart}因涉嫌${caseCause || '　　　　'}案送入候詢室（簽收：　　　　　　　　　　　　　　 ）`
    : `　　上開${namePart}已自候詢室出室（簽收：　　　　　　　　　　　　　　 ）`;

  const bodyRow  = tr(fullCell(pn(rn(bodyText,                                                   { sz: 24 }), { before: 60, after: 0  })), 675);
  const cizhiRow = tr(fullCell(pn(rn('　　　　此　致',                                           { sz: 24 }), { before: 20, after: 0  })), 553);
  const roomRow  = tr(fullCell(pn(rn('　　候詢室',                                               { sz: 24 }), { before: 20, after: 0  })), 615);
  const sigRow   = tr(fullCell(
    pn(rn('　　　　　　　　承辦人　　　　　　　　　　　　　敬會　勤務指揮中心　　　　機關主管長官', { sz: 24 }), { before: 20, after: 0  }) +
    pn(rn('　　　　　　　（簽　　章）',                                                           { sz: 24 }), { before: 0,  after: 60 })
  ), 971);

  return `<w:tbl>
<w:tblPr>
  <w:tblW w:w="${TOTAL_W}" w:type="dxa"/>
  <w:tblInd w:w="10" w:type="dxa"/>
  ${TBL_BORDER}
  <w:tblLayout w:type="fixed"/>
  <w:tblCellMar>
    <w:top    w:w="0"  w:type="dxa"/>
    <w:left   w:w="10" w:type="dxa"/>
    <w:bottom w:w="0"  w:type="dxa"/>
    <w:right  w:w="10" w:type="dxa"/>
  </w:tblCellMar>
</w:tblPr>
<w:tblGrid>${W.map(w => `<w:gridCol w:w="${w}"/>`).join('')}</w:tblGrid>
${row0}${row1}${row2}${dataRows.join('')}${bodyRow}${cizhiRow}${roomRow}${sigRow}
</w:tbl>`;
};

const copyLabel = (num) =>
  `<w:p><w:pPr><w:spacing w:after="40"/></w:pPr>` +
  `<w:r><w:rPr>${FONT}<w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr>` +
  `<w:t>${esc(num === 1 ? '第一聯—存根' : '第二聯—送候詢室')}</w:t></w:r></w:p>`;

const pageBreak = () => `<w:p><w:r><w:br w:type="page"/></w:r></w:p>`;

const buildOneForm = (suspects, isEntry, entryDT, exitDT, copyNum, agencyName, caseCause) =>
  copyLabel(copyNum) +
  buildFormTable(suspects, isEntry, entryDT, exitDT, agencyName, caseCause);

const buildDocxBlob = (data, isEntry) => {
  const { agencyName = '', caseCause = '', entryDateTime, exitDateTime, suspects = [] } = data;
  const groups = suspects.length > 0 ? chunkArr(suspects, 5) : [[]];

  const pages = [];
  for (const group of groups) {
    pages.push(buildOneForm(group, isEntry, entryDateTime, exitDateTime, 1, agencyName, caseCause));
    pages.push(buildOneForm(group, isEntry, entryDateTime, exitDateTime, 2, agencyName, caseCause));
  }

  const docXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
  xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    ${pages.join(pageBreak())}
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
  <Default Extension="xml"  ContentType="application/xml"/>
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
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>`);

  return zip.generate({ type: 'blob', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
};

export const generateBothNotifications = (data) => {
  const name = data.suspects?.[0]?.suspectName || '未命名';
  saveAs(buildDocxBlob(data, true),  `入室通知單_${name}.docx`);
  setTimeout(() => saveAs(buildDocxBlob(data, false), `出室通知單_${name}.docx`), 150);
};
