import { LEGAL_TIME_LIMITS, CWA_API_KEY } from '../data/constants';

/**
 * 將 Date 物件格式化為 ISO 格式的日期字串 (YYYY-MM-DDTHH:mm)
 */
export const formatInputDateTime = (date) => {
  if (!date) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

/**
 * 將 ISO 日期字串格式化為中華民國時間格式
 */
export const formatROCDateTime = (isoString) => {
  if (!isoString) return '';
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return '';
  
  const rocYear = d.getFullYear() - 1911;
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  
  return `${rocYear}年${month}月${day}日 ${hours}:${minutes}`;
};

/**
 * 從中央氣象署 API 獲取官方日出日落時間 (A-B0062-001)
 * 考慮到學長您在台北分局實務需求，此功能需網路連線
 */
export const fetchSunTimesFromCWA = async (dateTimeStr, countyName) => {
  if (!dateTimeStr || !countyName || !CWA_API_KEY) return null;

  try {
    const arrestDate = new Date(dateTimeStr);
    const todayStr = arrestDate.toISOString().split('T')[0];
    
    // 計算明天日期字串 (用於抓取隔日日出)
    const tomorrow = new Date(arrestDate);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    // 氣象署 API：日出日沒時刻資料集
    const encodedCounty = encodeURIComponent(countyName);
    const url = `https://opendata.cwa.gov.tw/api/v1/rest/datastore/A-B0062-001?Authorization=${CWA_API_KEY}&format=JSON&locationName=${encodedCounty}&timeFrom=${todayStr}&timeTo=${tomorrowStr}`;

    const response = await fetch(url);
    const result = await response.json();

    if (result.success === "true") {
      const location = result.records.location[0];
      
      // 擷取當天日沒與隔天日出
      const todayRecord = location.time.find(t => t.dataTime === todayStr);
      const tomorrowRecord = location.time.find(t => t.dataTime === tomorrowStr);

      if (todayRecord && tomorrowRecord) {
        const sunsetHM = todayRecord.parameter.find(p => p.parameterName === "日沒時刻")?.parameterValue;
        const sunriseHM = tomorrowRecord.parameter.find(p => p.parameterName === "日出時刻")?.parameterValue;

        // 轉換為系統可識別日期格式
        const sunsetFull = new Date(`${todayStr}T${sunsetHM}:00`);
        const sunriseFull = new Date(`${tomorrowStr}T${sunriseHM}:00`);

        return {
          sunset: sunsetHM,   // "17:46"
          sunrise: sunriseHM, // "06:31"
          sunsetTime: formatInputDateTime(sunsetFull),
          sunriseTime: formatInputDateTime(sunriseFull),
          sunriseDisplay: formatROCDateTime(formatInputDateTime(sunriseFull))
        };
      }
    }
    return null;
  } catch (error) {
    console.error("氣象署 API 連線失敗，請檢查網路:", error);
    return null;
  }
};

/**
 * 計算法定障礙事由總時間
 */
export const calculateTotalObstacleTime = (obstacles = []) => {
  const totalMinutes = obstacles.reduce((sum, o) => {
    const h = parseInt(o.hours || 0);
    const m = parseInt(o.minutes || 0);
    return sum + (h * 60 + m);
  }, 0);

  return {
    hours: Math.floor(totalMinutes / 60),
    minutes: totalMinutes % 60,
    totalMinutes: totalMinutes
  };
};

/**
 * 計算最終解送 Deadline [cite: 2026-03-27]
 */
export const calculateDeadline = (arrestDateTime, obstacleTotalMinutes, isWanted) => {
  if (!arrestDateTime) return null;
  
  const arrest = new Date(arrestDateTime);
  if (isNaN(arrest.getTime())) return null;

  // 判定基準時數 (一般 16hr / 通緝 24hr)
  const isWantedBool = String(isWanted) === 'true';
  const baseMinutes = isWantedBool ? LEGAL_TIME_LIMITS.WANTED : LEGAL_TIME_LIMITS.NORMAL;
  
  const deadlineMinutes = baseMinutes + obstacleTotalMinutes;
  const deadline = new Date(arrest.getTime() + deadlineMinutes * 60000);
  
  return {
    deadline: deadline,
    formatted: formatROCDateTime(deadline.toISOString())
  };
};