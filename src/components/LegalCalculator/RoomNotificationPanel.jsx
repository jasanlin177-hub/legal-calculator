import React, { useState } from 'react';
import { DoorOpen, DoorClosed, FileText } from 'lucide-react';
import { generateEntryNotification, generateExitNotification } from '../../utils/roomNotificationGenerator';
import { formatInputDateTime } from '../../utils/dateUtils';

const nowStr = () => formatInputDateTime(new Date());

const RoomNotificationPanel = ({ activeSuspect, caseSession }) => {
  const [entryTime, setEntryTime] = useState(nowStr);
  const [exitTime, setExitTime] = useState(nowStr);

  const buildData = (time) => ({
    suspectName: activeSuspect.suspectName || '',
    birthDate: activeSuspect.birthDate || '',
    gender: activeSuspect.gender || '男',
    idNumber: activeSuspect.idNumber || '',
    caseNumber: caseSession.caseCause || '',
    officerName: caseSession.officer || '',
    entryDateTime: entryTime,
    exitDateTime: exitTime,
    overrideTime: time
  });

  const handleEntry = () => {
    const data = buildData(entryTime);
    data.entryDateTime = entryTime;
    generateEntryNotification(data);
  };

  const handleExit = () => {
    const data = buildData(exitTime);
    data.exitDateTime = exitTime;
    generateExitNotification(data);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-200">
      <h2 className="text-base font-bold text-gray-800 mb-4 pb-2 border-b border-gray-100 flex items-center gap-2">
        <FileText className="w-5 h-5 text-gray-500" />
        候詢人入/出室通知單
        {activeSuspect.suspectName && (
          <span className="ml-1 text-blue-600 font-normal">（{activeSuspect.suspectName}）</span>
        )}
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* 入室 */}
        <div className="border border-green-200 rounded-lg p-4 bg-green-50">
          <div className="flex items-center gap-2 mb-3 font-semibold text-green-800">
            <DoorOpen className="w-5 h-5" />
            入室通知單
          </div>
          <label className="block text-sm font-medium text-gray-700 mb-1">入室時間</label>
          <input
            type="datetime-local"
            value={entryTime}
            onChange={e => setEntryTime(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-400 outline-none mb-3 text-sm"
          />
          <button
            onClick={handleEntry}
            className="w-full bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition text-sm font-medium flex items-center justify-center gap-2"
          >
            <DoorOpen className="w-4 h-4" />
            產出入室通知單（4份）
          </button>
        </div>

        {/* 出室 */}
        <div className="border border-orange-200 rounded-lg p-4 bg-orange-50">
          <div className="flex items-center gap-2 mb-3 font-semibold text-orange-800">
            <DoorClosed className="w-5 h-5" />
            出室通知單
          </div>
          <label className="block text-sm font-medium text-gray-700 mb-1">出室時間</label>
          <input
            type="datetime-local"
            value={exitTime}
            onChange={e => setExitTime(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-400 outline-none mb-3 text-sm"
          />
          <button
            onClick={handleExit}
            className="w-full bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition text-sm font-medium flex items-center justify-center gap-2"
          >
            <DoorClosed className="w-4 h-4" />
            產出出室通知單（4份）
          </button>
        </div>
      </div>

      <p className="text-xs text-gray-400 mt-3">
        時間預設為目前時間，可依實際入/出室時間修改後再產出。每份文件包含 4 份通知單。
      </p>
    </div>
  );
};

export default RoomNotificationPanel;
