import React, { useState } from 'react';
import { FileText } from 'lucide-react';
import { generateBothNotifications } from '../../utils/roomNotificationGenerator';

const todayStr = () => new Date().toISOString().slice(0, 10);
const tomorrowStr = () => {
  const d = new Date(); d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
};

const RoomNotificationPanel = ({ caseSession }) => {
  const [entryDate, setEntryDate] = useState(todayStr);
  const [entryTime, setEntryTime] = useState('21:00');
  const [exitDate,  setExitDate]  = useState(tomorrowStr);
  const [exitTime,  setExitTime]  = useState('08:00');

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
              onChange={e => setEntryDate(e.target.value)}
              className={dateCls}
            />
            <input
              type="text"
              value={entryTime}
              onChange={e => setEntryTime(e.target.value)}
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
        匯出入室＋出室通知單（各含存根、送候詢室共 2 份）
      </button>
    </div>
  );
};

export default RoomNotificationPanel;
