import React, { useState } from 'react';
import { FileText, AlertCircle } from 'lucide-react';
import { generateBothNotifications } from '../../utils/roomNotificationGenerator';

const todayStr = () => new Date().toISOString().slice(0, 10);
const tomorrowStr = () => {
  const d = new Date(); d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
};

// 驗證 HH:MM 格式（24小時制）
const validateTime = (t) => {
  if (!t || t.trim() === '') return null; // 空白不報錯
  const m = t.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return '格式應為 HH:MM';
  const h = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  if (h < 0 || h > 23) return '小時應為 00–23';
  if (min < 0 || min > 59) return '分鐘應為 00–59';
  return null;
};

const RoomNotificationPanel = ({ caseSession }) => {
  const [entryDate, setEntryDate] = useState(todayStr);
  const [entryTime, setEntryTime] = useState('21:00');
  const [exitDate,  setExitDate]  = useState(tomorrowStr);
  const [exitTime,  setExitTime]  = useState('08:00');
  const [entryTouched, setEntryTouched] = useState(false);
  const [exitTouched,  setExitTouched]  = useState(false);

  const entryErr = entryTouched ? validateTime(entryTime) : null;
  const exitErr  = exitTouched  ? validateTime(exitTime)  : null;
  const hasErr   = !!entryErr || !!exitErr;

  const buildData = () => ({
    agencyName:  [caseSession.policeAgency, caseSession.policeSubAgency].filter(Boolean).join(''),
    caseCause:   caseSession.caseCause  || '',
    officerName: caseSession.officer    || '',
    entryDateTime: entryDate && !validateTime(entryTime) && entryTime ? `${entryDate}T${entryTime}` : null,
    exitDateTime:  exitDate  && !validateTime(exitTime)  && exitTime  ? `${exitDate}T${exitTime}`   : null,
    suspects: caseSession.suspects.map(s => ({
      suspectName:    s.suspectName    || '',
      gender:         s.gender         || '',
      birthDate:      s.birthDate      || '',
      idNumber:       s.idNumber       || '',
      occupation:     '',
      address:        s.arrestLocation || '',
      arrestDateTime: s.arrestDateTime || null,
    })),
  });

  const handleExport = () => {
    setEntryTouched(true);
    setExitTouched(true);
    if (validateTime(entryTime) || validateTime(exitTime)) return;
    generateBothNotifications(buildData());
  };

  const count = caseSession.suspects.length;

  const dateCls = 'px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 outline-none text-sm w-36';
  const timeOk  = 'px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 outline-none text-sm w-24 font-mono';
  const timeErr = 'px-3 py-2 border border-red-400 rounded-lg focus:ring-2 focus:ring-red-400 outline-none text-sm w-24 font-mono bg-red-50';

  return (
    <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6">
      <h2 className="text-lg font-bold text-gray-800 mb-4 pb-2 border-b border-gray-100 flex items-center gap-2">
        <FileText className="w-5 h-5 text-blue-500" />
        候詢人入/出室通知單
        <span className="ml-1 text-blue-600 font-normal text-sm">（{count} 人，每張最多 5 人共用）</span>
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <div className="flex flex-col gap-1">
          <span className="text-sm font-medium text-gray-600">入室時間</span>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={entryDate}
              onChange={e => setEntryDate(e.target.value)}
              className={dateCls}
            />
            <input
              type="text"
              value={entryTime}
              onChange={e => setEntryTime(e.target.value)}
              onBlur={() => setEntryTouched(true)}
              placeholder="HH:MM"
              maxLength={5}
              className={entryErr ? timeErr : timeOk}
            />
          </div>
          {entryErr && (
            <p className="text-xs text-red-600 flex items-center gap-1 mt-0.5">
              <AlertCircle className="w-3 h-3 flex-shrink-0" />{entryErr}
            </p>
          )}
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-sm font-medium text-gray-600">出室時間</span>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={exitDate}
              onChange={e => setExitDate(e.target.value)}
              className={dateCls}
            />
            <input
              type="text"
              value={exitTime}
              onChange={e => setExitTime(e.target.value)}
              onBlur={() => setExitTouched(true)}
              placeholder="HH:MM"
              maxLength={5}
              className={exitErr ? timeErr : timeOk}
            />
          </div>
          {exitErr && (
            <p className="text-xs text-red-600 flex items-center gap-1 mt-0.5">
              <AlertCircle className="w-3 h-3 flex-shrink-0" />{exitErr}
            </p>
          )}
        </div>
      </div>

      <button
        onClick={handleExport}
        disabled={hasErr}
        className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-white transition disabled:opacity-50 disabled:cursor-not-allowed
          bg-gradient-to-b from-teal-500 to-teal-700
          shadow-[0_3px_6px_rgba(0,0,0,0.25),inset_0_1px_0_rgba(255,255,255,0.2)]
          hover:from-teal-400 hover:to-teal-600 active:shadow-[inset_0_2px_4px_rgba(0,0,0,0.3)] active:translate-y-px"
      >
        <FileText className="w-4 h-4" />
        匯出入室＋出室通知單（各含存根、送候詢室共 2 份）
      </button>
    </div>
  );
};

export default RoomNotificationPanel;
