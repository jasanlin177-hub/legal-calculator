import React, { useState } from 'react';
import { FileText } from 'lucide-react';
import { generateBothNotifications } from '../../utils/roomNotificationGenerator';
import { formatInputDateTime } from '../../utils/dateUtils';

const nowStr = () => formatInputDateTime(new Date());
const addHours = (isoStr, h) => {
  const d = new Date(isoStr);
  d.setHours(d.getHours() + h);
  return formatInputDateTime(d);
};

const RoomNotificationPanel = ({ caseSession }) => {
  const [entryTime, setEntryTime] = useState(nowStr);
  const [exitTime,  setExitTime]  = useState(() => addHours(nowStr(), 2));

  const handleEntryChange = (val) => {
    setEntryTime(val);
    if (val) setExitTime(addHours(val, 2));
  };

  const buildData = () => ({
    agencyName: [caseSession.policeAgency, caseSession.policeSubAgency].filter(Boolean).join(''),
    caseCause:  caseSession.caseCause  || '',
    officerName: caseSession.officer   || '',
    entryDateTime: entryTime,
    exitDateTime:  exitTime,
    suspects: caseSession.suspects.map(s => ({
      suspectName:     s.suspectName    || '',
      gender:          s.gender         || '',
      birthDate:       s.birthDate      || '',
      idNumber:        s.idNumber       || '',
      occupation:      '',
      address:         s.arrestLocation || '',
      arrestDateTime:  s.arrestDateTime || null,
    })),
  });

  const count = caseSession.suspects.length;

  return (
    <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-200">
      <h2 className="text-base font-bold text-gray-800 mb-4 pb-2 border-b border-gray-100 flex items-center gap-2">
        <FileText className="w-5 h-5 text-gray-500" />
        候詢人入/出室通知單
        <span className="ml-1 text-blue-600 font-normal text-sm">（{count} 人，每張最多 5 人共用）</span>
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-gray-700">入室時間</span>
          <input
            type="datetime-local"
            value={entryTime}
            onChange={e => handleEntryChange(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 outline-none text-sm"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-gray-700">出室時間</span>
          <input
            type="datetime-local"
            value={exitTime}
            onChange={e => setExitTime(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 outline-none text-sm"
          />
        </label>
      </div>

      <button
        onClick={() => generateBothNotifications(buildData())}
        className="bg-teal-600 text-white px-5 py-2.5 rounded-lg hover:bg-teal-700 transition text-sm font-medium flex items-center gap-2"
      >
        <FileText className="w-4 h-4" />
        產出入室＋出室通知單（各含存根、送候詢室共 2 份）
      </button>

      <p className="text-xs text-gray-400 mt-3">
        強制到場時間自動帶入各嫌犯的拘提/逮捕時間。入室時間修改時出室時間自動 +2 小時。時間不寫入案件存檔。
      </p>
    </div>
  );
};

export default RoomNotificationPanel;
