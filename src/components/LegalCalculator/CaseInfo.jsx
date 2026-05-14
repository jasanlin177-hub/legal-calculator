import React from 'react';
import { FileText, MapPin, AlertCircle, Building, Sun, Sunset, Calendar, User, AlertTriangle } from 'lucide-react';
import { POLICE_AGENCIES } from '../../data/constants';
import ROCDateTimeInput from '../common/ROCDateTimeInput';

// ── 共用樣式 ──────────────────────────────
const INPUT_CLS = [
  'w-full px-3 py-2 rounded-lg outline-none text-gray-800',
  'border border-gray-300 bg-gradient-to-b from-white to-gray-50',
  'shadow-[inset_0_1px_3px_rgba(0,0,0,0.08)]',
  'focus:ring-2 focus:ring-blue-400 focus:border-blue-400 focus:from-white focus:to-white',
  'transition-shadow',
].join(' ');

const SELECT_CLS = [
  'w-full px-3 py-2 rounded-lg outline-none text-gray-800',
  'border border-gray-300 bg-gradient-to-b from-white to-gray-50',
  'shadow-[inset_0_1px_3px_rgba(0,0,0,0.08)]',
  'focus:ring-2 focus:ring-blue-400 focus:border-blue-400',
  'transition-shadow disabled:opacity-50 disabled:cursor-not-allowed',
].join(' ');

// ── 出生年月日萬年歷驗證 ──────────────────
const validateBirthDate = (birthDate) => {
  if (!birthDate || birthDate.trim() === '') return null; // 空白不報錯

  const parts = birthDate.trim().split('/');
  if (parts.length !== 3)
    return { error: '格式應為「年/月/日」，例：65/05/06', isMinor: false };

  const rocYear = parseInt(parts[0], 10);
  const month   = parseInt(parts[1], 10);
  const day     = parseInt(parts[2], 10);

  if (isNaN(rocYear) || isNaN(month) || isNaN(day))
    return { error: '年、月、日應為數字', isMinor: false };

  if (rocYear < 1 || rocYear > 130)
    return { error: '民國年份不合理', isMinor: false };

  const gYear = rocYear + 1911;
  const dt    = new Date(gYear, month - 1, day);

  // 萬年歷檢核：轉回來不同表示日期不存在
  if (
    dt.getFullYear() !== gYear ||
    dt.getMonth()    !== month - 1 ||
    dt.getDate()     !== day
  ) {
    const leapMsg = month === 2 && day === 29 ? '（非閏年，無 2/29）' : '';
    return { error: `日期不存在${leapMsg}，請重新確認`, isMinor: false };
  }

  // 未成年檢核（以今日為基準）
  const today = new Date();
  const adultDate = new Date(gYear + 18, month - 1, day);
  const isMinor = today < adultDate;

  return { error: null, isMinor };
};

// ── 元件 ─────────────────────────────────
const CaseInfo = ({
  caseSession,
  activeSuspect,
  updateCaseField,
  updateSuspectField,
  onAgencyChange,
  onSubAgencyChange,
  sunTimes
}) => {
  const selectedAgency = caseSession.policeAgency ? POLICE_AGENCIES[caseSession.policeAgency] : null;
  const updateS = (field, value) => updateSuspectField(activeSuspect.id, field, value);

  const birthCheck = validateBirthDate(activeSuspect.birthDate);

  return (
    <>
      {/* 1. 案件共用資料區塊 */}
      <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6">
        <h2 className="text-lg font-bold text-gray-800 mb-4 pb-2 border-b border-gray-100 flex items-center gap-2">
          <FileText className="w-5 h-5 text-blue-500" />
          案件基本資料
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">案由</label>
            <input
              type="text"
              value={caseSession.caseCause}
              onChange={e => updateCaseField('caseCause', e.target.value)}
              className={INPUT_CLS}
              placeholder="例：詐欺、傷害..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">承辦人</label>
            <input
              type="text"
              value={caseSession.officer}
              onChange={e => updateCaseField('officer', e.target.value)}
              className={INPUT_CLS}
              placeholder="職稱/姓名"
            />
          </div>

          {/* 機關選擇連動 */}
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1 flex items-center gap-1">
              <MapPin className="w-4 h-4 text-blue-400" /> 警察機關
            </label>
            <select
              value={caseSession.policeAgency}
              onChange={e => onAgencyChange(e.target.value)}
              className={SELECT_CLS}
            >
              <option value="">請選擇機關...</option>
              {Object.keys(POLICE_AGENCIES).map(agency => (
                <option key={agency} value={agency}>{agency}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">所屬機關 (分局/大隊)</label>
            <select
              value={caseSession.policeSubAgency}
              onChange={e => onSubAgencyChange(e.target.value)}
              disabled={!caseSession.policeAgency}
              className={SELECT_CLS}
            >
              <option value="">請選擇單位...</option>
              {selectedAgency?.subAgencies && Object.keys(selectedAgency.subAgencies).map(sub => (
                <option key={sub} value={sub}>{sub}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">單位 (派出所/隊)</label>
            <input
              type="text"
              value={caseSession.policeUnit}
              onChange={e => updateCaseField('policeUnit', e.target.value)}
              className={INPUT_CLS}
              placeholder="例：中正派出所"
            />
          </div>
        </div>

        {/* 地址 */}
        <div className="mt-4 pt-4 border-t border-gray-100">
          <div className="flex items-start gap-3">
            <div className="mt-2 text-blue-400"><Building className="w-5 h-5" /></div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-600 mb-1">機關地址 (自動帶入)</label>
              <input
                type="text"
                value={caseSession.unitAddress}
                onChange={e => updateCaseField('unitAddress', e.target.value)}
                placeholder="選擇機關後自動帶入，亦可手動修改"
                className={INPUT_CLS}
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

      {/* 2. 嫌犯資料區塊（per-suspect） */}
      <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6">
        <h2 className="text-lg font-bold text-gray-800 mb-4 pb-2 border-b border-gray-100 flex items-center gap-2">
          <User className="w-5 h-5 text-blue-500" />
          嫌疑人資料
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">犯罪嫌疑人姓名</label>
            <input
              type="text"
              value={activeSuspect.suspectName}
              onChange={e => updateS('suspectName', e.target.value)}
              className={INPUT_CLS}
              placeholder="姓名"
            />
          </div>

          {/* 出生年月日 + 萬年歷驗證 */}
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">出生年月日</label>
            <input
              type="text"
              value={activeSuspect.birthDate}
              onChange={e => updateS('birthDate', e.target.value)}
              className={[
                INPUT_CLS,
                birthCheck?.error ? 'border-red-400 focus:ring-red-400' : '',
                birthCheck?.isMinor && !birthCheck?.error ? 'border-amber-400 focus:ring-amber-400' : '',
              ].join(' ')}
              placeholder="民國年/月/日（例：65/05/06）"
            />
            {birthCheck?.error && (
              <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3 flex-shrink-0" />
                {birthCheck.error}
              </p>
            )}
            {birthCheck?.isMinor && !birthCheck?.error && (
              <p className="text-xs text-amber-600 mt-1 flex items-center gap-1 font-semibold">
                <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                未成年人
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">性別</label>
            <select
              value={activeSuspect.gender}
              onChange={e => updateS('gender', e.target.value)}
              className={SELECT_CLS}
            >
              <option value="男">男</option>
              <option value="女">女</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">身分證/護照號碼</label>
            <input
              type="text"
              value={activeSuspect.idNumber}
              onChange={e => updateS('idNumber', e.target.value)}
              className={INPUT_CLS}
              placeholder="例：A123456789"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1 flex items-center gap-1">
              <AlertCircle className="w-4 h-4 text-red-500" />
              是否為通緝犯
            </label>
            <select
              value={activeSuspect.isWanted}
              onChange={e => updateS('isWanted', e.target.value)}
              className={SELECT_CLS + ' font-medium'}
            >
              <option value="false">否 (一般案件 - 16小時)</option>
              <option value="true">是 (通緝犯 - 24小時)</option>
            </select>
          </div>
        </div>
      </div>

      {/* 3. 時間與地點設定區塊（per-suspect） */}
      <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6">
        <h2 className="text-lg font-bold text-gray-800 mb-4 pb-2 border-b border-gray-100 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-blue-500" />
          時間與地點設定
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">拘提/逮捕時間</label>
            <ROCDateTimeInput
              value={activeSuspect.arrestDateTime}
              onChange={v => updateS('arrestDateTime', v)}
            />
            {activeSuspect.arrestDateTime && sunTimes?.sunset && (
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
            <label className="block text-sm font-medium text-gray-600 mb-1">拘提/逮捕地點</label>
            <input
              type="text"
              value={activeSuspect.arrestLocation}
              onChange={e => updateS('arrestLocation', e.target.value)}
              className={INPUT_CLS}
              placeholder="例：台北市中山區..."
            />
          </div>
        </div>
      </div>
    </>
  );
};

export default CaseInfo;
