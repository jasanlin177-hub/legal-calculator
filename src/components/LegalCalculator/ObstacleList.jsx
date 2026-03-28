import React from 'react';
import { Plus, Trash2, Sun } from 'lucide-react';
import { OBSTACLE_TYPES } from '../../data/constants';
import ROCDateTimeInput from '../common/ROCDateTimeInput';

const ObstacleList = ({ obstacles, onAdd, onRemove, onUpdate, sunTimes }) => {
  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <div className="flex justify-between items-center mb-4 pb-2 border-b border-gray-100">
        <h2 className="text-lg font-bold text-gray-800">法定障礙事由</h2>
        <button
          onClick={onAdd}
          className="flex items-center gap-1 bg-blue-50 text-blue-600 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          新增事由
        </button>
      </div>

      <div className="space-y-4">
        {obstacles.length === 0 ? (
          <div className="text-center py-8 text-gray-400 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
            <p>尚無記錄</p>
            <p className="text-sm mt-1">請點擊右上方按鈕新增障礙事由</p>
          </div>
        ) : (
          obstacles.map((obstacle, index) => (
            <div key={obstacle.id} className="relative border border-gray-200 rounded-xl p-4 bg-gray-50 hover:bg-white hover:shadow-md transition">
              <div className="absolute top-4 left-4 bg-gray-200 text-gray-600 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold">
                {index + 1}
              </div>
              
              <div className="pl-8 space-y-4">
                <div>
                  <select
                    value={obstacle.type}
                    // 傳入 sunTimes.sunrise (HH:mm) 供 Hook 內部邏輯使用
                    onChange={(e) => onUpdate(obstacle.id, 'type', e.target.value, sunTimes?.sunrise)}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-sm"
                  >
                    <option value="">請選擇障礙類型...</option>
                    {OBSTACLE_TYPES.map(type => (
                      <option key={type.id} value={type.id}>{type.id}. {type.name}</option>
                    ))}
                  </select>
                  {/* 只保留類型3的簡單提示，告知日出連動 */}
                  {obstacle.type === '3' && (
                     <p className="text-xs text-blue-600 mt-1 flex items-center gap-1">
                       <Sun className="w-3 h-3" />
                       系統已自動帶入 {sunTimes?.sunrise || '日出'} 為結束時間
                     </p>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">開始時間</label>
                    <ROCDateTimeInput 
                      value={obstacle.startDateTime} 
                      onChange={(val) => onUpdate(obstacle.id, 'startDateTime', val, sunTimes?.sunrise)} 
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">結束時間</label>
                    <ROCDateTimeInput 
                      value={obstacle.endDateTime} 
                      onChange={(val) => onUpdate(obstacle.id, 'endDateTime', val)} 
                    />
                  </div>
                </div>

                <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                  <span className="text-sm font-semibold text-blue-700">
                    小計：{obstacle.hours} 小時 {obstacle.minutes} 分
                  </span>
                  <button
                    onClick={() => onRemove(obstacle.id)}
                    className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50"
                    title="刪除"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ObstacleList;