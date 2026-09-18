import { useState, useMemo, useCallback } from 'react';
import { 
  formatInputDateTime, 
  calculateTotalObstacleTime, 
  calculateDeadline 
} from '../utils/dateUtils';

export const useObstacleCalculator = (arrestDateTime, isWanted) => {
  const [obstacles, setObstacles] = useState([]);

  // 1. 新增時，時間預設為空
  const addObstacle = useCallback(() => {
    setObstacles(prev => [
      ...prev, 
      {
        id: Date.now(),
        type: '',
        startDateTime: '', // 預設空白
        endDateTime: '',   // 預設空白
        hours: 0,
        minutes: 0
      }
    ]);
  }, []);

  const removeObstacle = useCallback((id) => {
    setObstacles(prev => prev.filter(o => o.id !== id));
  }, []);

  // 智慧計算日出時間
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

  /**
   * 更新障礙事由 (包含多重防呆邏輯)
   */
  const updateObstacle = useCallback((id, field, value, sunriseHM = null) => {
    setObstacles(prev => {
      const targetIndex = prev.findIndex(o => o.id === id);
      if (targetIndex === -1) return prev;
      
      const oldObstacle = prev[targetIndex];
      const nextObstacle = { ...oldObstacle };
      const nowStr = formatInputDateTime(new Date());

      // --- 情境 A：修改類型 (Type) ---
      if (field === 'type') {
        nextObstacle.type = value;
        
        if (value) {
          // 若開始時間原本是空的，才自動填入「現在時間」
          if (!nextObstacle.startDateTime) {
            nextObstacle.startDateTime = nowStr;
            
            // 【補充防呆】：若自動填入的「現在時間」早於「逮捕時間」，雖然罕見但有可能
            // 這裡選擇不阻擋自動填入，讓使用者看到後手動修正，避免一選類型就跳錯誤的糟糕體驗
          }

          // 依類型自動填入結束時間
          if (value === '3' && sunriseHM) {
            nextObstacle.endDateTime = getSmartSunriseTime(nextObstacle.startDateTime, sunriseHM);
          } else {
            nextObstacle.endDateTime = nextObstacle.startDateTime;
          }
        }
      } 
      
      // --- 情境 B：修改開始時間 (Start) ---
      else if (field === 'startDateTime') {
        // 【新增防呆】：開始時間不可早於「逮捕時間」
        if (arrestDateTime && value) {
          if (new Date(value) < new Date(arrestDateTime)) {
            alert('時間錯誤：法定障礙事由「開始時間」不得早於「拘提/逮捕時間」');
            return prev; // 阻擋更新
          }
        }

        nextObstacle.startDateTime = value;

        // 連動邏輯：開始時間有修改，自動更動結束時間
        if (nextObstacle.type) {
          if (nextObstacle.type === '3' && sunriseHM) {
             nextObstacle.endDateTime = getSmartSunriseTime(value, sunriseHM);
          } else {
             // 其他類型：結束時間跟隨開始時間 (同步)
             nextObstacle.endDateTime = value;
          }
        }
      }

      // --- 情境 C：修改結束時間 (End) ---
      else if (field === 'endDateTime') {
        // 【原有防呆】：結束時間不可早於「開始時間」
        if (nextObstacle.startDateTime && value) {
           if (new Date(value) < new Date(nextObstacle.startDateTime)) {
             alert('時間錯誤：結束時間不能早於開始時間');
             return prev; // 阻擋更新
           }
        }
        nextObstacle.endDateTime = value;
      }

      // --- 最後：計算時數差 (Diff) ---
      if (nextObstacle.startDateTime && nextObstacle.endDateTime) {
        const start = new Date(nextObstacle.startDateTime);
        const end = new Date(nextObstacle.endDateTime);
        const diff = end - start;

        if (diff > 0) {
          nextObstacle.hours = Math.floor(diff / (1000 * 60 * 60));
          nextObstacle.minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        } else {
          nextObstacle.hours = 0;
          nextObstacle.minutes = 0;
        }
      } else {
        nextObstacle.hours = 0;
        nextObstacle.minutes = 0;
      }

      const newObstacles = [...prev];
      newObstacles[targetIndex] = nextObstacle;
      return newObstacles;
    });
  }, [arrestDateTime]); // 重要：加入 arrestDateTime 依賴，確保能抓到最新的逮捕時間

  const totalObstacleTime = useMemo(() => {
    return calculateTotalObstacleTime(obstacles);
  }, [obstacles]);

  const deadlineInfo = useMemo(() => {
    return calculateDeadline(arrestDateTime, totalObstacleTime.totalMinutes, isWanted);
  }, [arrestDateTime, totalObstacleTime.totalMinutes, isWanted]);

  return {
    obstacles,
    addObstacle,
    removeObstacle,
    updateObstacle,
    totalObstacleTime,
    deadlineInfo
  };
};