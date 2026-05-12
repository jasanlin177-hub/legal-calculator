import React from 'react';
import { Clock, Users } from 'lucide-react';
import { formatROCDateTime } from '../../utils/dateUtils';

const Summary = ({ arrestDateTime, totalObstacleTime, deadlineInfo, isWanted, allDeadlines }) => {
  const isWantedBool = String(isWanted) === 'true';
  const multiSuspect = allDeadlines && allDeadlines.length > 1;

  const displayResultLabel = isWantedBool
    ? '24小時內解送到指定的法院或檢察署'
    : '解送地檢署期限 檢警共同24小時(警方16小時 + 法定障礙事由時間)';

  const displayFormulaLabel = isWantedBool
    ? '* 計算公式：拘提時間 + 24小時 + 障礙時間'
    : '* 計算公式：拘提時間 + 16小時 + 障礙時間';

  return (
    <div className="space-y-4">
      {/* 主要期限 */}
      <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl shadow-lg p-6 text-white">
        <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5 text-green-400" />
          統計結果
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-4">
            <div>
              <p className="text-gray-400 text-sm">拘提/逮捕時間</p>
              <p className="text-xl font-mono text-white">
                {formatROCDateTime(arrestDateTime) || '--'}
              </p>
            </div>
            <div>
              <p className="text-gray-400 text-sm">障礙事由總計</p>
              <p className="text-xl font-mono text-yellow-400">
                {totalObstacleTime.hours} 小時 {totalObstacleTime.minutes} 分
              </p>
            </div>
          </div>

          <div className="bg-white/10 rounded-lg p-4 border border-white/10">
            <p className="text-gray-300 text-sm mb-1">{displayResultLabel}</p>
            <div className="text-2xl font-bold text-green-400 font-mono">
              {deadlineInfo ? deadlineInfo.formatted : '--'}
            </div>
            <p className="text-xs text-gray-400 mt-2">{displayFormulaLabel}</p>
          </div>
        </div>
      </div>

      {/* 多人速覽表 */}
      {multiSuspect && (
        <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-200">
          <h3 className="text-base font-bold text-gray-800 mb-3 flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-500" />
            全案嫌犯解送期限速覽
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-gray-600">
                  <th className="text-left px-3 py-2 rounded-tl-lg">編號</th>
                  <th className="text-left px-3 py-2">姓名</th>
                  <th className="text-left px-3 py-2 rounded-tr-lg">解送期限</th>
                </tr>
              </thead>
              <tbody>
                {allDeadlines.map((item, idx) => (
                  <tr key={item.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-3 py-2 text-gray-500 font-mono">{idx + 1}</td>
                    <td className="px-3 py-2 font-medium text-gray-800">
                      {item.name || <span className="text-gray-400 italic">未命名</span>}
                    </td>
                    <td className="px-3 py-2 font-mono text-green-700 font-semibold">
                      {item.deadlineInfo ? item.deadlineInfo.formatted : (
                        <span className="text-gray-400 text-xs">（尚未輸入逮捕時間）</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default Summary;
