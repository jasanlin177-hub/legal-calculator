import React, { useState } from 'react';
import { Clock, FileText, WifiOff, Loader2, Save, FolderOpen, CheckCircle, Download, FileDown, AlertTriangle } from 'lucide-react';
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
  const [batchProgress, setBatchProgress] = useState(null);

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
    try {
      await batchExportAllDocuments(caseSession, (done, total) => {
        setBatchProgress({ done, total });
      });
    } finally {
      setBatchProgress(null);
    }
  };

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
    <div className="min-h-screen bg-slate-100 p-4 font-sans text-gray-900">
      <div className="max-w-5xl mx-auto space-y-4">

        {/* Header */}
        <div className="bg-blue-900 rounded-xl shadow-lg p-5 flex justify-between items-center flex-wrap gap-4">
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <Clock className="text-blue-300 w-6 h-6 flex-shrink-0" />
              解送人犯法定障礙事由計算機
              <span className="text-blue-300 font-normal text-sm ml-1">v3.0</span>
            </h1>
            <p className="text-blue-300 text-xs mt-1 flex items-center gap-2">
              設計：文一偵查林正賢　協作AI：Claude (2026/05 多人支援版)
              {isFetching && (
                <span className="flex items-center gap-1 text-blue-200 bg-blue-800 px-2 py-0.5 rounded-full">
                  <Loader2 className="w-3 h-3 animate-spin" /> 同步氣象署...
                </span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {saveStatus === 'saved' && (
              <span className="flex items-center gap-1 text-xs text-green-300 bg-green-900/50 px-2 py-1 rounded-full">
                <CheckCircle className="w-3 h-3" /> 已儲存
              </span>
            )}
            {saveStatus === 'saving' && (
              <span className="flex items-center gap-1 text-xs text-blue-200 bg-blue-800 px-2 py-1 rounded-full">
                <Loader2 className="w-3 h-3 animate-spin" /> 儲存中...
              </span>
            )}
            <button
              onClick={manualSave}
              disabled={!caseSession.id}
              title={caseSession.id ? '儲存案件' : '請先輸入第一名嫌犯姓名及逮捕時間'}
              className="flex items-center gap-1 px-3 py-1.5 bg-white/10 hover:bg-white/20 border border-white/30 text-white rounded-lg disabled:opacity-40 disabled:cursor-not-allowed text-sm font-medium transition"
            >
              <Save className="w-4 h-4" /> 儲存案件
            </button>
            <button
              onClick={() => setShowLoadModal(true)}
              className="flex items-center gap-1 px-3 py-1.5 bg-white/10 hover:bg-white/20 border border-white/30 text-white rounded-lg text-sm font-medium transition"
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

        {/* 書表匯出面板 */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 space-y-4">
          {/* 當前嫌犯書表 */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">
              當前嫌犯書表（{activeSuspect.suspectName || '—'}）
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => generateRightsNotification(buildDocData())}
                className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg transition text-sm font-medium shadow-sm"
              >
                <FileText className="w-4 h-4" /> 權利告知書
              </button>
              <button
                onClick={() => generateArrestNoticeSelf(buildDocData())}
                className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition text-sm font-medium shadow-sm"
              >
                <FileText className="w-4 h-4" /> 告知本人通知書
              </button>
              <button
                onClick={() => generateArrestNoticeRelative(buildDocData())}
                className="flex items-center gap-1.5 bg-cyan-600 hover:bg-cyan-700 text-white px-4 py-2 rounded-lg transition text-sm font-medium shadow-sm"
              >
                <FileText className="w-4 h-4" /> 告知親友通知書
              </button>
            </div>
          </div>

          {/* 案件批次操作 */}
          <div className="border-t border-gray-100 pt-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">
              案件批次操作（{caseSession.suspects.length} 人）
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={handleBatchExport}
                disabled={!!batchProgress}
                className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg transition text-sm font-medium shadow-sm disabled:opacity-50"
              >
                <Download className="w-4 h-4" />
                {batchProgress
                  ? `匯出中 ${batchProgress.done}/${batchProgress.total}...`
                  : `批次匯出全部書表（${caseSession.suspects.length}人 × 3份）`}
              </button>
              <button
                onClick={() => exportObstacleRecordAsText(caseSession)}
                className="flex items-center gap-1.5 bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg transition text-sm font-medium shadow-sm"
              >
                <FileDown className="w-4 h-4" /> 匯出障礙事由記錄表
              </button>
            </div>
          </div>
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
              <AlertTriangle className="text-amber-500 w-6 h-6 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-amber-800 font-bold text-base">目前處於無網路環境</h3>
                <div className="flex gap-6 mt-3">
                  <label className="flex flex-col gap-1">
                    <span className="text-sm font-medium text-amber-900">手動輸入當日日落</span>
                    <input
                      type="time"
                      value={activeSuspect.sunTimes?.sunset || '18:00'}
                      onChange={e => handleManualSunTimeChange('sunset', e.target.value)}
                      className="border border-amber-300 rounded-lg px-3 py-1.5 text-sm"
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-sm font-medium text-amber-900">手動輸入隔日日出</span>
                    <input
                      type="time"
                      value={activeSuspect.sunTimes?.sunrise || '06:00'}
                      onChange={e => handleManualSunTimeChange('sunrise', e.target.value)}
                      className="border border-amber-300 rounded-lg px-3 py-1.5 text-sm"
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
