import React from 'react';
import { FileText, MapPin, AlertCircle, Building, Sun, Sunset, Calendar } from 'lucide-react';
import { POLICE_AGENCIES } from '../../data/constants';
import ROCDateTimeInput from '../common/ROCDateTimeInput';

const CaseInfo = ({ 
  caseInfo, 
  updateField, 
  onAgencyChange, 
  onSubAgencyChange,
  arrestDateTime,
  setArrestDateTime,
  arrestLocation,
  setArrestLocation,
  sunTimes
}) => {
  const selectedAgency = caseInfo.policeAgency ? POLICE_AGENCIES[caseInfo.policeAgency] : null;

  return (
    <>
      {/* 1. 案件基本資料區塊 */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-lg font-bold text-gray-800 mb-4 pb-2 border-b border-gray-100 flex items-center gap-2">
          <FileText className="w-5 h-5 text-gray-500" />
          案件基本資料
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">案由</label>
            <input
              type="text"
              value={caseInfo.caseCause}
              onChange={(e) => updateField('caseCause', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="例：詐欺、傷害..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
               <AlertCircle className="w-4 h-4 text-red-500" />
               是否為通緝犯
            </label>
            <select
              value={caseInfo.isWanted}
              onChange={(e) => updateField('isWanted', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white font-medium text-gray-700"
            >
              <option value="false">否 (一般案件 - 16小時)</option>
              <option value="true">是 (通緝犯 - 24小時)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">犯罪嫌疑人</label>
            <input
              type="text"
              value={caseInfo.suspectName}
              onChange={(e) => updateField('suspectName', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="姓名"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">承辦人</label>
            <input
              type="text"
              value={caseInfo.officer}
              onChange={(e) => updateField('officer', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="職稱/姓名"
            />
          </div>
          
          {/* 機關選擇連動區 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
              <MapPin className="w-4 h-4" /> 警察機關
            </label>
            <select
              value={caseInfo.policeAgency}
              onChange={(e) => onAgencyChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
            >
              <option value="">請選擇機關...</option>
              {Object.keys(POLICE_AGENCIES).map(agency => (
                <option key={agency} value={agency}>{agency}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">所屬機關 (分局/大隊)</label>
            <select
              value={caseInfo.policeSubAgency}
              onChange={(e) => onSubAgencyChange(e.target.value)}
              disabled={!caseInfo.policeAgency}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-gray-100 bg-white"
            >
              <option value="">請選擇單位...</option>
              {selectedAgency?.subAgencies && Object.keys(selectedAgency.subAgencies).map(subAgency => (
                <option key={subAgency} value={subAgency}>{subAgency}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">單位 (派出所/隊)</label>
            <input
              type="text"
              value={caseInfo.policeUnit}
              onChange={(e) => updateField('policeUnit', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="例：中正派出所"
            />
          </div>
        </div>

        {/* 地址與日出日落提示 */}
        <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="flex items-start gap-3">
              <div className="mt-2 text-gray-500"><Building className="w-5 h-5"/></div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">機關地址 (自動帶入)</label>
                <input 
                  type="text" 
                  value={caseInfo.unitAddress}
                  onChange={(e) => updateField('unitAddress', e.target.value)}
                  placeholder="選擇機關後自動帶入，亦可手動修改"
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-700 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                />
                {sunTimes?.sunrise && (
                  <p className="text-xs text-blue-600 mt-1 flex items-center gap-1">
                    <Sun className="w-3 h-3" />
                    已根據此地區經緯度校正日出日落時間
                  </p>
                )}
              </div>
            </div>
        </div>
      </div>

      {/* 2. 時間與地點設定區塊 */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-lg font-bold text-gray-800 mb-4 pb-2 border-b border-gray-100 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-gray-500" />
          時間與地點設定
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">拘提/逮捕時間</label>
            <ROCDateTimeInput 
              value={arrestDateTime} 
              onChange={setArrestDateTime} 
            />
            {arrestDateTime && sunTimes?.sunset && (
              <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm grid grid-cols-2 gap-2">
                <div className="flex items-center gap-2 text-amber-800">
                  <Sunset className="w-4 h-4" />
                  <span>當日日落：{sunTimes.sunset}</span>
                </div>
                <div className="flex items-center gap-2 text-amber-800">
                  <Sun className="w-4 h-4" />
                  <span>隔日日出：{sunTimes.sunrise}</span>
                </div>
              </div>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">拘提/逮捕地點</label>
            <input
              type="text"
              value={arrestLocation}
              onChange={(e) => setArrestLocation(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="例：台北市中山區..."
            />
          </div>
        </div>
      </div>
    </>
  );
};

export default CaseInfo;