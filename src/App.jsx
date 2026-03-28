import React, { useState, useEffect } from 'react';
import { Clock, FileText, WifiOff, Loader2 } from 'lucide-react';
import { useCaseForm } from './hooks/useCaseForm';
import { useObstacleCalculator } from './hooks/useObstacleCalculator';
import CaseInfo from './components/LegalCalculator/CaseInfo';
import ObstacleList from './components/LegalCalculator/ObstacleList';
import Summary from './components/LegalCalculator/Summary';
import { formatInputDateTime, fetchSunTimesFromCWA, formatROCDateTime } from './utils/dateUtils';
import { generateRightsNotification, generateArrestNoticeSelf, generateArrestNoticeRelative } from './utils/documentGenerator';
import { OBSTACLE_TYPES } from './data/constants';

const App = () => {
  const [arrestDateTime, setArrestDateTime] = useState(formatInputDateTime(new Date()));
  const [arrestLocation, setArrestLocation] = useState('');
  const [sunTimes, setSunTimes] = useState(null);
  const [isFetching, setIsFetching] = useState(false);
  const [isOffline, setIsOffline] = useState(false);

  const { caseInfo, updateField, handleAgencyChange, handleSubAgencyChange } = useCaseForm();
  const { obstacles, addObstacle, removeObstacle, updateObstacle, totalObstacleTime, deadlineInfo } = useObstacleCalculator(arrestDateTime, caseInfo.isWanted);

  const getLocalDateString = (d) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  useEffect(() => {
    let isMounted = true;
    const loadSunData = async () => {
      if (!arrestDateTime || !caseInfo.policeAgency) return;
      setIsFetching(true);
      setIsOffline(false);
      const countyName = caseInfo.policeAgency.substring(0, 3);
      const result = await fetchSunTimesFromCWA(arrestDateTime, countyName);
      if (isMounted) {
        if (result) {
          setSunTimes(result);
          setIsOffline(false);
        } else {
          setIsOffline(true);
          const d = new Date(arrestDateTime);
          const todayStr = getLocalDateString(d);
          const tmr = new Date(d);
          tmr.setDate(tmr.getDate() + 1);
          const tomorrowStr = getLocalDateString(tmr);
          setSunTimes({
            sunset: "18:00",
            sunrise: "06:00",
            sunsetTime: `${todayStr}T18:00`,
            sunriseTime: `${tomorrowStr}T06:00`,
            sunriseDisplay: formatROCDateTime(`${tomorrowStr}T06:00`)
          });
        }
        setIsFetching(false);
      }
    };
    loadSunData();
    return () => { isMounted = false; };
  }, [arrestDateTime, caseInfo.policeAgency]);

  const handleManualSunTimeChange = (type, timeValue) => {
    if (!timeValue) return;
    setSunTimes(prev => {
      const d = new Date(arrestDateTime);
      const todayStr = getLocalDateString(d);
      const tmr = new Date(d);
      tmr.setDate(tmr.getDate() + 1);
      const tomorrowStr = getLocalDateString(tmr);
      const newSunset = type === 'sunset' ? timeValue : (prev?.sunset || "18:00");
      const newSunrise = type === 'sunrise' ? timeValue : (prev?.sunrise || "06:00");
      return {
        sunset: newSunset,
        sunrise: newSunrise,
        sunsetTime: `${todayStr}T${newSunset}`,
        sunriseTime: `${tomorrowStr}T${newSunrise}`,
        sunriseDisplay: formatROCDateTime(`${tomorrowStr}T${newSunrise}`)
      };
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 font-sans text-gray-900">
      <div className="max-w-5xl mx-auto space-y-6">
        
        {/* Header - 已更新版本資訊 [cite: 2026-03-27] */}
        <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-blue-600 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              <Clock className="text-blue-600 w-8 h-8" />
              解送人犯法定障礙事由計算機 v2.3
            </h1>
            <div className="flex items-center gap-3 mt-1">
              <p className="text-gray-500">
                設計：文一偵查林正賢 協作AI：Claude、Gemini (2026/03 氣象署API+逮捕文書版 v2.3)
              </p>
              {isFetching && (
                <span className="flex items-center gap-1 text-xs text-blue-500 bg-blue-50 px-2 py-1 rounded-full">
                  <Loader2 className="w-3 h-3 animate-spin" /> 同步氣象署資料中...
                </span>
              )}
            </div>
          </div>
        </div>

        {/* 書表快速匯出面板 */}
        <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-200 flex flex-wrap items-center gap-4">
          <span className="text-gray-700 font-semibold flex items-center gap-2">
            <FileText className="w-5 h-5 text-gray-500" />
            自動產出公文書表：
          </span>
          <button 
            onClick={() => generateRightsNotification({ caseInfo, arrestDateTime })}
            className="bg-indigo-50 text-indigo-700 border border-indigo-200 px-4 py-2 rounded-lg hover:bg-indigo-100 transition text-sm font-medium"
          >
            附件12: 權利告知書
          </button>
          <button 
            onClick={() => generateArrestNoticeSelf({ caseInfo, arrestDateTime, arrestLocation })}
            className="bg-blue-50 text-blue-700 border border-blue-200 px-4 py-2 rounded-lg hover:bg-blue-100 transition text-sm font-medium"
          >
            附件16: 告知本人通知書
          </button>
          <button 
            onClick={() => generateArrestNoticeRelative({ caseInfo, arrestDateTime, arrestLocation })}
            className="bg-cyan-50 text-cyan-700 border border-cyan-200 px-4 py-2 rounded-lg hover:bg-cyan-100 transition text-sm font-medium"
          >
            附件17: 告知親友通知書
          </button>
        </div>

        {isOffline && (
          <div className="bg-amber-50 rounded-xl shadow-sm p-5 border border-amber-200">
            <div className="flex gap-3">
              <WifiOff className="text-amber-500 w-6 h-6 flex-shrink-0" />
              <div>
                <h3 className="text-amber-800 font-bold text-lg">目前處於無網路環境</h3>
                <div className="flex gap-6 mt-2">
                  <label className="flex flex-col gap-1">
                    <span className="text-sm font-semibold text-amber-900">手動輸入當日日落</span>
                    <input type="time" value={sunTimes?.sunset || "18:00"} onChange={(e) => handleManualSunTimeChange('sunset', e.target.value)} className="border border-amber-300 rounded px-2 py-1" />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-sm font-semibold text-amber-900">手動輸入隔日日出</span>
                    <input type="time" value={sunTimes?.sunrise || "06:00"} onChange={(e) => handleManualSunTimeChange('sunrise', e.target.value)} className="border border-amber-300 rounded px-2 py-1" />
                  </label>
                </div>
              </div>
            </div>
          </div>
        )}

        <CaseInfo caseInfo={caseInfo} updateField={updateField} onAgencyChange={handleAgencyChange} onSubAgencyChange={handleSubAgencyChange} arrestDateTime={arrestDateTime} setArrestDateTime={setArrestDateTime} arrestLocation={arrestLocation} setArrestLocation={setArrestLocation} sunTimes={sunTimes} />
        <ObstacleList obstacles={obstacles} onAdd={addObstacle} onRemove={removeObstacle} onUpdate={updateObstacle} sunTimes={sunTimes} />
        <Summary arrestDateTime={arrestDateTime} totalObstacleTime={totalObstacleTime} deadlineInfo={deadlineInfo} isWanted={caseInfo.isWanted} caseInfo={caseInfo} obstacles={obstacles} arrestLocation={arrestLocation} />
      </div>
    </div>
  );
};

export default App;
