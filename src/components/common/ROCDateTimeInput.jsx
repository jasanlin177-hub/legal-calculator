import React, { useState, useEffect } from 'react';

const ROCDateTimeInput = ({ value, onChange, disabled, allowFuture = false }) => {
  const parseISO = (isoString) => {
    if (!isoString) return { year: '', month: '', day: '', hour: '', minute: '' };
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return { year: '', month: '', day: '', hour: '', minute: '' };

    return {
      year: date.getFullYear() - 1911,
      month: String(date.getMonth() + 1).padStart(2, '0'),
      day: String(date.getDate()).padStart(2, '0'),
      hour: String(date.getHours()).padStart(2, '0'),
      minute: String(date.getMinutes()).padStart(2, '0')
    };
  };

  const [dateParts, setDateParts] = useState(parseISO(value));
  const [isFuture, setIsFuture] = useState(false);

  useEffect(() => {
    setDateParts(parseISO(value));
    if (!allowFuture) {
      setIsFuture(value ? new Date(value) > new Date() : false);
    }
  }, [value, allowFuture]);

  const handleChange = (field, val) => {
    const newParts = { ...dateParts, [field]: val };
    setDateParts(newParts);

    // 只有當所有欄位都有值時，才觸發 onChange 回傳 ISO 字串
    if (newParts.year && newParts.month && newParts.day && newParts.hour !== '' && newParts.minute !== '') {
      const westernYear = parseInt(newParts.year, 10) + 1911;
      if (westernYear > 1900 && westernYear < 2100) {
        const isoStr = `${westernYear}-${newParts.month}-${newParts.day}T${newParts.hour}:${newParts.minute}`;
        if (!allowFuture) {
          const dt = new Date(isoStr);
          if (dt > new Date()) {
            setIsFuture(true);
            return; // 不接受未來時間
          }
          setIsFuture(false);
        }
        onChange(isoStr);
      }
    }
  };

  const range = (start, end) => Array.from({ length: end - start + 1 }, (_, i) => String(start + i).padStart(2, '0'));

  return (
    <div>
    {isFuture && (
      <p className="text-xs text-red-600 mb-1 flex items-center gap-1">
        ⚠ 逮捕時間不能晚於現在，請重新輸入
      </p>
    )}
    <div className="flex flex-wrap items-center gap-1 sm:gap-2">
      <div className="flex items-center">
        <span className="text-gray-500 mr-1 text-sm">民國</span>
        <input
          type="number"
          value={dateParts.year}
          onChange={(e) => handleChange('year', e.target.value)}
          className="w-16 px-2 py-1 border border-gray-300 rounded text-center focus:ring-2 focus:ring-blue-500 outline-none"
          placeholder="115"
          disabled={disabled}
        />
        <span className="text-gray-700 ml-1 text-sm">年</span>
      </div>
      <div className="flex items-center">
        <select
          value={dateParts.month}
          onChange={(e) => handleChange('month', e.target.value)}
          className="px-1 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none bg-white"
          disabled={disabled}
        >
          {range(1, 12).map(m => <option key={m} value={m}>{m}</option>)}
        </select>
        <span className="text-gray-700 ml-1 text-sm">月</span>
      </div>
      <div className="flex items-center">
        <select
          value={dateParts.day}
          onChange={(e) => handleChange('day', e.target.value)}
          className="px-1 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none bg-white"
          disabled={disabled}
        >
          {range(1, 31).map(d => <option key={d} value={d}>{d}</option>)}
        </select>
        <span className="text-gray-700 ml-1 text-sm">日</span>
      </div>
      <div className="flex items-center ml-2 border-l pl-2 border-gray-300">
        <select
          value={dateParts.hour}
          onChange={(e) => handleChange('hour', e.target.value)}
          className="px-1 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none bg-white font-mono"
          disabled={disabled}
        >
          {range(0, 23).map(h => <option key={h} value={h}>{h}</option>)}
        </select>
        <span className="text-gray-700 mx-1 text-sm">:</span>
        <select
          value={dateParts.minute}
          onChange={(e) => handleChange('minute', e.target.value)}
          className="px-1 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none bg-white font-mono"
          disabled={disabled}
        >
          {range(0, 59).map(m => <option key={m} value={m}>{m}</option>)}
        </select>
      </div>
    </div>
    </div>
  );
};

export default ROCDateTimeInput;
