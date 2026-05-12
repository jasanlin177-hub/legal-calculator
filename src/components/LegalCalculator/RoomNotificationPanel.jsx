import React, { useState } from 'react';
import { FileText } from 'lucide-react';
import { generateBothNotifications } from '../../utils/roomNotificationGenerator';

const todayStr = () => new Date().toISOString().slice(0, 10);
const nowTimeStr = () => {
  const d = new Date();
  return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
};
const addHoursToDateTime = (dateStr, timeStr, h) => {
  if (!dateStr || !/^\d{2}:\d{2}$/.test(timeStr)) return { date: dateStr, time: timeStr };
  const d = new Date(`${dateStr}T${timeStr}`);
  if (isNaN(d.getTime())) return { date: dateStr, time: timeStr };
  d.setHours(d.getHours() + h);
  return {
    date: d.toISOString().slice(0, 10),
    time: `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`,
  };
};

const RoomNotificationPanel = ({ caseSession }) => {
  const [entryDate, setEntryDate] = useState(todayStr);
  const [entryTime, setEntryTime] = useState(nowTimeStr);
  const [exitDate,  setExitDate]  = useState(() => addHoursToDateTime(todayStr(), nowTimeStr(), 2).date);
  const [exitTime,  setExitTime]  = useState(() => addHoursToDateTime(todayStr(), nowTimeStr(), 2).time);

  const handleEntryDateChange = (val) => {
    setEntryDate(val);
    const next = addHoursToDateTime(val, entryTime, 2);
    setExitDate(next.date);
    setExitTime(next.time);
  };
  const handleEntryTimeChange = (val) => {
    setEntryTime(val);
    if (/^\d{2}:\d{2}$/.test(val)) {
      const next = addHoursToDateTime(entryDate, val, 2);
      setExitDate(next.date);
      setExitTime(next.time);
    }
  };

  const buildData = () => ({
    agencyName:  [caseSession.policeAgency, caseSession.policeSubAgency].filter(Boolean).join(''),
    caseCause:   caseSession.caseCause  || '',
    officerName: caseSession.officer    || '',
    entryDateTime: entryDate && /^\d{2}:\d{2}$/.test(entryTime) ? `${entryDate}T${entryTime}` : null,
    exitDateTime:  exitDate  && /^\d{2}:\d{2}$/.test(exitTime)  ? `${exitDate}T${exitTime}`   : null,
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

  const count = caseSession.suspects.length;

  const dateCls = 'px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 outline-none text-sm w-36';
  const timeCls = 'px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 outline-none text-sm w-24 font-mono';

  return (
    <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-200">
      <h2 className="text-base font-bold text-gray-800 mb-4 pb-2 border-b border-gray-100 flex items-center gap-2">
        <FileText className="w-5 h-5 text-gray-500" />
        候詢人入/出室通知單
        <span className="ml-1 text-blue-600 font-normal text-sm">（{count} 人，每張最多 5 人共用）</span>
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <div className="flex flex-col gap-1">
          <span className="text-sm font-medium text-gray-700">入室時間</span>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={entryDate}
              onChange={e => handleEntryDateChange(e.target.value)}
              className={dateCls}
            />
            <input
              type="text"
              value={entryTime}
              onChange={e => handleEntryTimeChange(e.target.value)}
              placeholder="HH:MM"
              maxLength={5}
              className={timeCls}
            />
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-sm font-medium text-gray-700">出室時間</span>
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
              placeholder="HH:MM"
              maxLength={5}
              className={timeCls}
            />
          </div>
        </div>
      </div>

      <button
        onClick={() => generateBothNotifications(buildData())}
        className="bg-teal-600 text-white px-5 py-2.5 rounded-lg hover:bg-teal-700 transition text-sm font-medium flex items-center gap-2"
      >
        <FileText className="w-4 h-4" />
        產出入室＋出室通知單（各含存根、送候詢室共 2 份）
      </button>

      <p className="text-xs text-gray-400 mt-3">
        時間格式：24小時制，例如 20:10。強制到場時間自動帶入各嫌犯的拘提/逮捕時間。入室時間修改時出室時間自動 +2 小時。時間不寫入案件存檔。
      </p>
    </div>
  );
};

export default RoomNotificationPanel;
