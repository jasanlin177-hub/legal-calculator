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

/**
 * NOAA 太陽出沒計算（離線備援）
 * 精度 ≈ ±2 分鐘，完全符合法律實務需求
 * @param {number} lat  緯度（decimal degrees）
 * @param {number} lon  經度（decimal degrees）
 * @param {string} dateStr  YYYY-MM-DD（逮捕當日，台灣時間）
 * @returns {{ sunset, sunrise, sunsetTime, sunriseTime, sunriseDisplay } | null}
 */
export const calcSunTimesNOAA = (lat, lon, dateStr) => {
  const TZ  = 8; // Taiwan UTC+8
  const DEG = Math.PI / 180;

  const calcJulian = (ymd) => {
    const [y, m, d] = ymd.split('-').map(Number);
    const A = Math.floor((14 - m) / 12);
    const Y = y + 4800 - A;
    const M = m + 12 * A - 3;
    return d + Math.floor((153 * M + 2) / 5) + 365 * Y
         + Math.floor(Y / 4) - Math.floor(Y / 100)
         + Math.floor(Y / 400) - 32045 + 0.5; // JD at noon UT
  };

  const calcForDate = (ymd) => {
    const JD = calcJulian(ymd);
    const T  = (JD - 2451545.0) / 36525.0;

    // Geometric mean longitude & anomaly
    const L0 = ((280.46646 + T * (36000.76983 + T * 0.0003032)) % 360 + 360) % 360;
    const M0 = 357.52911 + T * (35999.05029 - T * 0.0001537);
    const Mr = M0 * DEG;

    // Equation of center → true longitude
    const C   = Math.sin(Mr)   * (1.914602 - T * (0.004817 + 0.000014 * T))
              + Math.sin(2*Mr) * (0.019993 - 0.000101 * T)
              + Math.sin(3*Mr) *  0.000289;
    const omg = 125.04 - 1934.136 * T;
    const lam = (L0 + C - 0.00569 - 0.00478 * Math.sin(omg * DEG)) * DEG;

    // Obliquity (corrected)
    const eps0 = (23 + (26 + (21.448 - T * (46.815 + T * (0.00059 - T * 0.001813))) / 60) / 60) * DEG;
    const eps  = eps0 + 0.00256 * Math.cos(omg * DEG) * DEG;

    // Declination
    const dec = Math.asin(Math.sin(eps) * Math.sin(lam));

    // Equation of time (minutes)
    const y2  = Math.tan(eps / 2) ** 2;
    const L0r = L0 * DEG;
    const M0r = M0 * DEG;
    const eot = 4 / DEG * (
        y2 * Math.sin(2 * L0r)
      - 2 * 0.016708634 * Math.sin(M0r)
      + 4 * 0.016708634 * y2 * Math.sin(M0r) * Math.cos(2 * L0r)
      - 0.5 * y2 ** 2 * Math.sin(4 * L0r)
      - 1.25 * 0.016708634 ** 2 * Math.sin(2 * M0r)
    );

    // Solar noon (min from midnight UTC)
    const noon = 720 - 4 * lon - eot;

    // Hour angle at sunrise (standard solar elevation −0.833°)
    const cosHA = Math.cos(90.833 * DEG) / (Math.cos(lat * DEG) * Math.cos(dec))
                - Math.tan(lat * DEG) * Math.tan(dec);
    if (Math.abs(cosHA) > 1) return null; // polar day/night

    const HA = Math.acos(cosHA) / DEG;
    return { sunriseUTC: noon - HA * 4, sunsetUTC: noon + HA * 4 };
  };

  const toHHMM = (minUTC) => {
    let min = ((minUTC + TZ * 60) % 1440 + 1440) % 1440;
    let h = Math.floor(min / 60);
    let m = Math.round(min % 60);
    if (m === 60) { h = (h + 1) % 24; m = 0; }
    return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
  };

  try {
    const [y, mo, d] = dateStr.split('-').map(Number);
    const tmr = new Date(y, mo - 1, d + 1);
    const tomorrowStr = `${tmr.getFullYear()}-${String(tmr.getMonth()+1).padStart(2,'0')}-${String(tmr.getDate()).padStart(2,'0')}`;

    const today    = calcForDate(dateStr);
    const tomorrow = calcForDate(tomorrowStr);
    if (!today || !tomorrow) return null;

    const sunsetHM  = toHHMM(today.sunsetUTC);
    const sunriseHM = toHHMM(tomorrow.sunriseUTC);
    const sunsetTime  = `${dateStr}T${sunsetHM}`;
    const sunriseTime = `${tomorrowStr}T${sunriseHM}`;

    return {
      sunset:  sunsetHM,
      sunrise: sunriseHM,
      sunsetTime,
      sunriseTime,
      sunriseDisplay: formatROCDateTime(sunriseTime),
    };
  } catch {
    return null;
  }
};