import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { POLICE_AGENCIES } from '../data/constants';
import {
  formatInputDateTime,
  fetchSunTimesFromCWA,
  formatROCDateTime,
  calculateTotalObstacleTime,
  calculateDeadline,
  calcSunTimesNOAA
} from '../utils/dateUtils';
import { saveCase } from '../utils/db';

// ─────────────────────────────────────────
// 輔助：建立空白嫌犯物件
// ─────────────────────────────────────────
const createNewSuspect = () => ({
  id: Date.now().toString(36) + Math.random().toString(36).slice(2),
  suspectName: '',
  birthDate: '',
  gender: '男',
  idNumber: '',
  isWanted: 'false',
  arrestDateTime: formatInputDateTime(new Date()),
  arrestLocation: '',
  sunTimes: null,
  isOffline: false,
  obstacles: []
});

// ─────────────────────────────────────────
// 內部：障礙事由更新邏輯（保留原有防呆）
// ─────────────────────────────────────────
const getSmartSunriseTime = (startStr, sunriseHM) => {
  if (!startStr || !sunriseHM) return null;
  const startDate = new Date(startStr);
  if (isNaN(startDate.getTime())) return null;
  const [sH, sM] = sunriseHM.split(':').map(Number);
  const sunriseToday = new Date(startDate);
  sunriseToday.setHours(sH, sM, 0, 0);
  if (startDate < sunriseToday) {
    return formatInputDateTime(sunriseToday);
  } else {
    const sunriseTom = new Date(sunriseToday);
    sunriseTom.setDate(sunriseTom.getDate() + 1);
    return formatInputDateTime(sunriseTom);
  }
};

const applyObstacleUpdate = (obstacles, id, field, value, arrestDateTime, sunriseHM) => {
  const targetIndex = obstacles.findIndex(o => o.id === id);
  if (targetIndex === -1) return { obstacles, blocked: false };

  const old = obstacles[targetIndex];
  const next = { ...old };
  const nowStr = formatInputDateTime(new Date());

  if (field === 'type') {
    next.type = value;
    if (value) {
      if (!next.startDateTime) next.startDateTime = nowStr;
      if (value === '3' && sunriseHM) {
        next.endDateTime = getSmartSunriseTime(next.startDateTime, sunriseHM);
      } else {
        next.endDateTime = next.startDateTime;
      }
    }
  } else if (field === 'startDateTime') {
    if (arrestDateTime && value && new Date(value) < new Date(arrestDateTime)) {
      alert('時間錯誤：法定障礙事由「開始時間」不得早於「拘提/逮捕時間」');
      return { obstacles, blocked: true };
    }
    next.startDateTime = value;
    if (next.type) {
      if (next.type === '3' && sunriseHM) {
        next.endDateTime = getSmartSunriseTime(value, sunriseHM);
      } else {
        next.endDateTime = value;
      }
    }
  } else if (field === 'endDateTime') {
    if (next.startDateTime && value && new Date(value) < new Date(next.startDateTime)) {
      alert('時間錯誤：結束時間不能早於開始時間');
      return { obstacles, blocked: true };
    }
    next.endDateTime = value;
  }

  if (next.startDateTime && next.endDateTime) {
    const diff = new Date(next.endDateTime) - new Date(next.startDateTime);
    if (diff > 0) {
      next.hours = Math.floor(diff / 3600000);
      next.minutes = Math.floor((diff % 3600000) / 60000);
    } else {
      next.hours = 0;
      next.minutes = 0;
    }
  } else {
    next.hours = 0;
    next.minutes = 0;
  }

  const updated = [...obstacles];
  updated[targetIndex] = next;
  return { obstacles: updated, blocked: false };
};

// ─────────────────────────────────────────
// 初始案件 session
// ─────────────────────────────────────────
const buildInitialSession = () => ({
  id: null,
  caseCause: '',
  officer: '',
  policeAgency: '',
  policeSubAgency: '',
  policeUnit: '',
  unitAddress: '',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  suspects: [createNewSuspect()],
  activeSuspectIndex: 0
});

// ─────────────────────────────────────────
// 主 hook
// ─────────────────────────────────────────
export const useCase = () => {
  const [caseSession, setCaseSession] = useState(buildInitialSession);
  const [isFetching, setIsFetching] = useState(false);
  const [saveStatus, setSaveStatus] = useState('idle'); // 'idle' | 'saving' | 'saved'
  const autoSaveTimer = useRef(null);

  // ── Auto-save（debounce 2s）──
  useEffect(() => {
    if (!caseSession.id) return;
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(async () => {
      try {
        setSaveStatus('saving');
        await saveCase(caseSession);
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2000);
      } catch (e) {
        console.error('Auto-save failed:', e);
        setSaveStatus('idle');
      }
    }, 2000);
    return () => clearTimeout(autoSaveTimer.current);
  }, [caseSession]);

  // ── 便捷存取器 ──
  const activeSuspect = caseSession.suspects[caseSession.activeSuspectIndex] ?? caseSession.suspects[0];

  // ── 案件 ID 自動更新 ──
  useEffect(() => {
    const first = caseSession.suspects[0];
    if (!first?.suspectName || !first?.arrestDateTime) return;
    const d = new Date(first.arrestDateTime);
    if (isNaN(d.getTime())) return;
    const rocYear = d.getFullYear() - 1911;
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const newId = `${rocYear}${mm}${dd}_${first.suspectName}`;
    if (newId !== caseSession.id) {
      setCaseSession(prev => ({ ...prev, id: newId }));
    }
  }, [caseSession.suspects[0]?.suspectName, caseSession.suspects[0]?.arrestDateTime]);

  // ── 日出日沒自動抓取（依 active suspect 的逮捕時間 + 共用機關）──
  useEffect(() => {
    let alive = true;
    const load = async () => {
      if (!activeSuspect?.arrestDateTime || !caseSession.policeAgency) return;
      setIsFetching(true);
      const countyName = caseSession.policeAgency.substring(0, 3);
      const result = await fetchSunTimesFromCWA(activeSuspect.arrestDateTime, countyName);
      if (!alive) return;

      const suspectId = activeSuspect.id;
      if (result) {
        updateSuspectFields(suspectId, { sunTimes: result, isOffline: false });
      } else {
        const d = new Date(activeSuspect.arrestDateTime);
        const todayStr = localDateStr(d);
        const tmr = new Date(d);
        tmr.setDate(tmr.getDate() + 1);
        const tomorrowStr = localDateStr(tmr);

        // NOAA 備援：依機關座標推算日出日沒，精度 ±2 分鐘
        const agency = POLICE_AGENCIES[caseSession.policeAgency];
        const sub    = agency?.subAgencies?.[caseSession.policeSubAgency];
        const lat    = sub?.lat ?? agency?.lat ?? 25.04;
        const lon    = sub?.lon ?? agency?.lon ?? 121.52;
        const noaa   = calcSunTimesNOAA(lat, lon, todayStr);

        updateSuspectFields(suspectId, {
          isOffline: true,
          sunTimes: noaa ?? {
            sunset:  '18:00',
            sunrise: '06:00',
            sunsetTime:  `${todayStr}T18:00`,
            sunriseTime: `${tomorrowStr}T06:00`,
            sunriseDisplay: formatROCDateTime(`${tomorrowStr}T06:00`)
          }
        });
      }
      setIsFetching(false);
    };
    load();
    return () => { alive = false; };
  }, [activeSuspect?.id, activeSuspect?.arrestDateTime, caseSession.policeAgency]);

  // ── 共用 helper ──
  const localDateStr = (d) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  const touch = () => ({ updatedAt: new Date().toISOString() });

  // ─────────────────────────────────────────
  // 共用欄位更新
  // ─────────────────────────────────────────
  const updateCaseField = useCallback((field, value) => {
    setCaseSession(prev => ({ ...prev, [field]: value, ...touch() }));
  }, []);

  const handleAgencyChange = useCallback((agencyName) => {
    const agency = POLICE_AGENCIES[agencyName];
    const newAddress = agency?.addr ?? '';
    setCaseSession(prev => ({
      ...prev,
      policeAgency: agencyName,
      policeSubAgency: '',
      unitAddress: newAddress,
      ...touch()
    }));
  }, []);

  const handleSubAgencyChange = useCallback((subAgencyName) => {
    setCaseSession(prev => {
      const agency = POLICE_AGENCIES[prev.policeAgency];
      const sub = agency?.subAgencies?.[subAgencyName];
      const newAddress = sub?.addr ?? prev.unitAddress;
      return {
        ...prev,
        policeSubAgency: subAgencyName,
        unitAddress: newAddress,
        ...touch()
      };
    });
  }, []);

  // ─────────────────────────────────────────
  // 嫌犯管理
  // ─────────────────────────────────────────
  const addSuspect = useCallback(() => {
    setCaseSession(prev => {
      if (prev.suspects.length >= 20) return prev;
      const newSuspect = createNewSuspect();
      return {
        ...prev,
        suspects: [...prev.suspects, newSuspect],
        activeSuspectIndex: prev.suspects.length,
        ...touch()
      };
    });
  }, []);

  const removeSuspect = useCallback((suspectId) => {
    setCaseSession(prev => {
      if (prev.suspects.length <= 1) return prev;
      const idx = prev.suspects.findIndex(s => s.id === suspectId);
      if (idx === -1) return prev;
      const newSuspects = prev.suspects.filter(s => s.id !== suspectId);
      const newActive = Math.min(prev.activeSuspectIndex, newSuspects.length - 1);
      return { ...prev, suspects: newSuspects, activeSuspectIndex: newActive, ...touch() };
    });
  }, []);

  const setActiveSuspect = useCallback((index) => {
    setCaseSession(prev => ({ ...prev, activeSuspectIndex: index }));
  }, []);

  // 更新嫌犯單一欄位
  const updateSuspectField = useCallback((suspectId, field, value) => {
    setCaseSession(prev => ({
      ...prev,
      suspects: prev.suspects.map(s =>
        s.id === suspectId ? { ...s, [field]: value } : s
      ),
      ...touch()
    }));
  }, []);

  // 批次更新嫌犯多個欄位（內部使用）
  const updateSuspectFields = useCallback((suspectId, fields) => {
    setCaseSession(prev => ({
      ...prev,
      suspects: prev.suspects.map(s =>
        s.id === suspectId ? { ...s, ...fields } : s
      )
    }));
  }, []);

  // ─────────────────────────────────────────
  // 手動調整日出日沒（離線模式）
  // ─────────────────────────────────────────
  const handleManualSunTimeChange = useCallback((type, timeValue) => {
    if (!timeValue) return;
    setCaseSession(prev => {
      const suspect = prev.suspects[prev.activeSuspectIndex];
      if (!suspect) return prev;
      const d = new Date(suspect.arrestDateTime);
      const todayStr = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
      const tmr = new Date(d);
      tmr.setDate(tmr.getDate() + 1);
      const tomorrowStr = `${tmr.getFullYear()}-${String(tmr.getMonth()+1).padStart(2,'0')}-${String(tmr.getDate()).padStart(2,'0')}`;
      const prevSun = suspect.sunTimes;
      const newSunset = type === 'sunset' ? timeValue : (prevSun?.sunset ?? '18:00');
      const newSunrise = type === 'sunrise' ? timeValue : (prevSun?.sunrise ?? '06:00');
      const newSunTimes = {
        sunset: newSunset,
        sunrise: newSunrise,
        sunsetTime: `${todayStr}T${newSunset}`,
        sunriseTime: `${tomorrowStr}T${newSunrise}`,
        sunriseDisplay: formatROCDateTime(`${tomorrowStr}T${newSunrise}`)
      };
      return {
        ...prev,
        suspects: prev.suspects.map((s, i) =>
          i === prev.activeSuspectIndex ? { ...s, sunTimes: newSunTimes } : s
        )
      };
    });
  }, []);

  // ─────────────────────────────────────────
  // 障礙事由 CRUD（針對 active suspect）
  // ─────────────────────────────────────────
  const addObstacle = useCallback(() => {
    setCaseSession(prev => {
      const suspect = prev.suspects[prev.activeSuspectIndex];
      if (!suspect) return prev;
      const newObs = {
        id: Date.now(),
        type: '',
        startDateTime: '',
        endDateTime: '',
        hours: 0,
        minutes: 0
      };
      return {
        ...prev,
        suspects: prev.suspects.map((s, i) =>
          i === prev.activeSuspectIndex
            ? { ...s, obstacles: [...s.obstacles, newObs] }
            : s
        ),
        ...touch()
      };
    });
  }, []);

  const removeObstacle = useCallback((obstacleId) => {
    setCaseSession(prev => ({
      ...prev,
      suspects: prev.suspects.map((s, i) =>
        i === prev.activeSuspectIndex
          ? { ...s, obstacles: s.obstacles.filter(o => o.id !== obstacleId) }
          : s
      ),
      ...touch()
    }));
  }, []);

  const updateObstacle = useCallback((obstacleId, field, value, sunriseHM = null) => {
    setCaseSession(prev => {
      const suspect = prev.suspects[prev.activeSuspectIndex];
      if (!suspect) return prev;
      const { obstacles: updated, blocked } = applyObstacleUpdate(
        suspect.obstacles, obstacleId, field, value,
        suspect.arrestDateTime, sunriseHM
      );
      if (blocked) return prev;
      return {
        ...prev,
        suspects: prev.suspects.map((s, i) =>
          i === prev.activeSuspectIndex ? { ...s, obstacles: updated } : s
        ),
        ...touch()
      };
    });
  }, []);

  // ─────────────────────────────────────────
  // 計算（active suspect）
  // ─────────────────────────────────────────
  const totalObstacleTime = useMemo(
    () => calculateTotalObstacleTime(activeSuspect?.obstacles ?? []),
    [activeSuspect?.obstacles]
  );

  const deadlineInfo = useMemo(
    () => calculateDeadline(
      activeSuspect?.arrestDateTime,
      totalObstacleTime.totalMinutes,
      activeSuspect?.isWanted
    ),
    [activeSuspect?.arrestDateTime, totalObstacleTime.totalMinutes, activeSuspect?.isWanted]
  );

  // 全部嫌犯的期限摘要（供 Summary 速覽表用）
  const allDeadlines = useMemo(() =>
    caseSession.suspects.map(s => {
      const tot = calculateTotalObstacleTime(s.obstacles);
      const dl = calculateDeadline(s.arrestDateTime, tot.totalMinutes, s.isWanted);
      return { id: s.id, name: s.suspectName, deadlineInfo: dl };
    }),
    [caseSession.suspects]
  );

  // ── 手動存檔 ──
  const manualSave = useCallback(async () => {
    if (!caseSession.id) return;
    try {
      setSaveStatus('saving');
      await saveCase(caseSession);
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (e) {
      console.error('Save failed:', e);
      setSaveStatus('idle');
    }
  }, [caseSession]);

  // ── 載入案件（替換 session，保留 activeSuspectIndex = 0）──
  const loadCaseSession = useCallback((savedSession) => {
    setCaseSession({ ...savedSession, activeSuspectIndex: 0 });
  }, []);

  return {
    caseSession,
    activeSuspect,
    isFetching,
    saveStatus,
    manualSave,
    loadCaseSession,
    // 共用欄位
    updateCaseField,
    handleAgencyChange,
    handleSubAgencyChange,
    // 嫌犯管理
    addSuspect,
    removeSuspect,
    setActiveSuspect,
    updateSuspectField,
    // 離線日出日沒
    handleManualSunTimeChange,
    // 障礙事由
    addObstacle,
    removeObstacle,
    updateObstacle,
    // 計算結果
    totalObstacleTime,
    deadlineInfo,
    allDeadlines
  };
};
