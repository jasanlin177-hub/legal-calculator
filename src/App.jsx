import React, { useState } from 'react';
import { Clock, FileText, WifiOff, Loader2, Save, FolderOpen, CheckCircle, Download, FileDown } from 'lucide-react';
import { useCase } from './hooks/useCase';
import CaseInfo from './components/LegalCalculator/CaseInfo';
import ObstacleList from './components/LegalCalculator/ObstacleList';
import Summary from './components/LegalCalculator/Summary';
import SuspectTabs from './components/LegalCalculator/SuspectTabs';
import LoadCaseModal from './components/common/LoadCaseModal';
import RoomNotificationPanel from './components/LegalCalculator/RoomNotificationPanel';
import { generateRightsNotification, generateArrestNoticeSelf, generateArrestNoticeRelative } from './utils/documentGenerator';
import { batchExportAllDocuments, exportObstacleRecordAsText } from './utils/exportUtils';

const App = () => {
  const [showLoadModal, setShowLoadModal] = useState(false);
  const [batchProgress, setBatchProgress] = useState(null); // null | {done, total}

  const {
    caseSession,
    activeSuspect,
    isFetching,
    saveStatus,
    manualSave,
    loadCaseSession,
    updateCaseField,
    handleAgencyChange,
    handleSubAgencyChange,
    addSuspect,
    removeSuspect,
    setActiveSuspect,
    updateSuspectField,
    handleManualSunTimeChange,
    addObstacle,
    removeObstacle,
    updateObstacle,
    totalObstacleTime,
    deadlineInfo,
    allDeadlines
  } = useCase();

  const handleBatchExport = async () => {
    setBatchProgress({ done: 0, total: caseSession.suspects.length * 3 });
    await batchExportAllDocuments(caseSession, (done, total) => {
      setBatchProgress({ done, total });
    });
    setBatchProgress(null);
  };

  // 為現有 documentGenerator 組裝參數（沿用舊格式）
  const buildDocData = () => ({
    caseInfo: {
      suspectName: activeSuspect.suspectName,
      caseCause: caseSession.caseCause,
      officer: caseSession.officer,
      policeAgency: caseSession.policeAgency,
      policeSubAgency: caseSession.policeSubAgency,
      policeUnit: caseSession.policeUnit,
      isWanted: activeSuspect.isWanted
    },
    arrestDateTime: activeSuspect.arrestDateTime,
    arrestLocation: activeSuspect.arrestLocation
  });

  return (
    <div className="min-h-screen bg-gray-50 p-4 font-sans text-gray-900">
      <div className="max-w-5xl mx-auto space-y-6">

        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-blue-600 flex justify-between items-center flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              <Clock className="text-blue-600 w-8 h-8" />
              解送人犯法定障礙事由計算機 v3.0
            </h1>
            <div className="flex items-center gap-3 mt-1">
              <p className="text-gray-500">
                設計：文一偵查林正賢 協作AI：Claude (2026/05 多人支援版 v3.0)
              </p>
              {isFetching && (
                <span className="flex items-center gap-1 text-xs text-blue-500 bg-blue-50 px-2 py-1 rounded-full">
                  <Loader2 className="w-3 h-3 animate-spin" /> 同步氣象署資料中...
                </span>
              )}
            </div>
          </div>
          {/* 儲存/載入 */}
          <div className="flex items-center gap-2">
            {saveStatus === 'saved' && (
              <span className="flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full">
                <CheckCircle className="w-3 h-3" /> 已儲存
              </span>
            )}
            {saveStatus === 'saving' && (
              <span className="flex items-center gap-1 text-xs text-blue-500 bg-blue-50 px-2 py-1 rounded-full">
                <Loader2 className="w-3 h-3 animate-spin" /> 儲存中...
              </span>
            )}
            <button
              onClick={manualSave}
              disabled={!caseSession.id}
              title={caseSession.id ? '儲存案件' : '請先輸入第一名嫌犯姓名及逮捕時間'}
              className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-sm font-medium transition"
            >
              <Save className="w-4 h-4" /> 儲存案件
            </button>
            <button
              onClick={() => setShowLoadModal(true)}
              className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm font-medium transition"
            >
              <FolderOpen className="w-4 h-4" /> 載入案件
            </button>
          </div>
        </div>

        {showLoadModal && (
          <LoadCaseModal
            onLoad={loadCaseSession}
            onClose={() => setShowLoadModal(false)}
          />
        )}

        {/* 書表快速匯出面板 */}
        <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-200 flex flex-wrap items-center gap-4">
          <span className="text-gray-700 font-semibold flex items-center gap-2">
            <FileText className="w-5 h-5 text-gray-500" />
            自動產出公文書表（{activeSuspect.suspectName || '當前嫌犯'}）：
          </span>
          <button
            onClick={() => generateRightsNotification(buildDocData())}
            className="bg-indigo-50 text-indigo-700 border border-indigo-200 px-4 py-2 rounded-lg hover:bg-indigo-100 transition text-sm font-medium"
          >
            附件12: 權利告知書
          </button>
          <button
            onClick={() => generateArrestNoticeSelf(buildDocData())}
            className="bg-blue-50 text-blue-700 border border-blue-200 px-4 py-2 rounded-lg hover:bg-blue-100 transition text-sm font-medium"
          >
            附件16: 告知本人通知書
          </button>
          <button
            onClick={() => generateArrestNoticeRelative(buildDocData())}
            className="bg-cyan-50 text-cyan-700 border border-cyan-200 px-4 py-2 rounded-lg hover:bg-cyan-100 transition text-sm font-medium"
          >
            附件17: 告知親友通知書
          </button>

          {/* 分隔線 */}
          <div className="w-full h-px bg-gray-100 my-1" />

          {/* 批次匯出 */}
          <span className="text-gray-700 font-semibold flex items-center gap-2 w-full">
            <Download className="w-5 h-5 text-gray-500" />
            案件批次操作：
          </span>
          <button
            onClick={handleBatchExport}
            disabled={!!batchProgress}
            className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-4 py-2 rounded-lg hover:bg-emerald-100 transition text-sm font-medium disabled:opacity-50"
          >
            {batchProgress
              ? `匯出中 ${batchProgress.done}/${batchProgress.total}...`
              : `批次匯出全部書表（${caseSession.suspects.length}人 × 3份）`}
          </button>
          <button
            onClick={() => exportObstacleRecordAsText(caseSession)}
            className="bg-amber-50 text-amber-700 border border-amber-200 px-4 py-2 rounded-lg hover:bg-amber-100 transition text-sm font-medium flex items-center gap-1"
          >
            <FileDown className="w-4 h-4" />
            匯出障礙事由記錄表 (.txt)
          </button>
        </div>

        {/* 嫌犯分頁列 */}
        <SuspectTabs
          suspects={caseSession.suspects}
          activeSuspectIndex={caseSession.activeSuspectIndex}
          onAdd={addSuspect}
          onRemove={removeSuspect}
          onSetActive={setActiveSuspect}
        />

        {/* 離線模式警告 */}
        {activeSuspect.isOffline && (
          <div className="bg-amber-50 rounded-xl shadow-sm p-5 border border-amber-200">
            <div className="flex gap-3">
              <WifiOff className="text-amber-500 w-6 h-6 flex-shrink-0" />
              <div>
                <h3 className="text-amber-800 font-bold text-lg">目前處於無網路環境</h3>
                <div className="flex gap-6 mt-2">
                  <label className="flex flex-col gap-1">
                    <span className="text-sm font-semibold text-amber-900">手動輸入當日日落</span>
                    <input
                      type="time"
                      value={activeSuspect.sunTimes?.sunset || '18:00'}
                      onChange={e => handleManualSunTimeChange('sunset', e.target.value)}
                      className="border border-amber-300 rounded px-2 py-1"
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-sm font-semibold text-amber-900">手動輸入隔日日出</span>
                    <input
                      type="time"
                      value={activeSuspect.sunTimes?.sunrise || '06:00'}
                      onChange={e => handleManualSunTimeChange('sunrise', e.target.value)}
                      className="border border-amber-300 rounded px-2 py-1"
                    />
                  </label>
                </div>
              </div>
            </div>
          </div>
        )}

        <CaseInfo
          caseSession={caseSession}
          activeSuspect={activeSuspect}
          updateCaseField={updateCaseField}
          updateSuspectField={updateSuspectField}
          onAgencyChange={handleAgencyChange}
          onSubAgencyChange={handleSubAgencyChange}
          sunTimes={activeSuspect.sunTimes}
        />

        <ObstacleList
          obstacles={activeSuspect.obstacles}
          onAdd={addObstacle}
          onRemove={removeObstacle}
          onUpdate={updateObstacle}
          sunTimes={activeSuspect.sunTimes}
        />

        <RoomNotificationPanel
          caseSession={caseSession}
        />

        <Summary
          arrestDateTime={activeSuspect.arrestDateTime}
          totalObstacleTime={totalObstacleTime}
          deadlineInfo={deadlineInfo}
          isWanted={activeSuspect.isWanted}
          allDeadlines={allDeadlines}
        />
      </div>
    </div>
  );
};

export default App;
