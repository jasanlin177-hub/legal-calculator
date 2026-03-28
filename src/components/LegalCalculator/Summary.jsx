import React from 'react';
import { Clock, FileText } from 'lucide-react';
import { formatROCDateTime } from '../../utils/dateUtils';
import { OBSTACLE_TYPES } from '../../data/constants';

const Summary = ({
    arrestDateTime,
    totalObstacleTime,
    deadlineInfo,
    isWanted,
    caseInfo = {},
    obstacles = [],
    arrestLocation = '',
}) => {
    const isWantedBool = String(isWanted) === 'true';

    const displayResultLabel = isWantedBool
      ? '24小時內解送到指定的法院或檢察署'
          : '解送地檢署期限 檢警共同24小時(警方16小時 + 法定障礙事由時間)';

    const displayFormulaLabel = isWantedBool
      ? '* 計算公式：拘提時間 + 24小時 + 障礙時間'
          : '* 計算公式：拘提時間 + 16小時 + 障礙時間';

    const handleExportTxt = () => {
          const o = caseInfo;
          const Et = formatROCDateTime;

          let y = '';
          y += `解送人犯法定障礙事由計算表\n`;
          y += `${'='.repeat(60)}\n`;
          y += `案　　由：${o.caseCause || '__________'}\n`;
          y += `犯罪嫌疑人：${o.suspectName || '__________'}\n`;
          y += `承　辦　人：${o.officer || '__________'}\n`;
          y += `機關全銜：${o.policeAgency || '__________'}\n`;
          y += `分局全銜：${o.policeSubAgency || '__________'}\n`;
          y += `通知單位：${o.policeUnit || '__________'}\n`;
          y += `機關地址：${o.unitAddress || '__________'}\n`;
          y += `\n`;

          const t = arrestDateTime;
          t && (y += `拘提/逮捕時間：${Et(t)}\n`);
          arrestLocation && (y += `拘捕地點：${arrestLocation}\n`);
          y += `\n`;

          y += `法定障礙事由明細\n`;
          y += `${'='.repeat(60)}\n`;

          const cc = OBSTACLE_TYPES;
          cc.forEach((j) => {
                  const A = obstacles.filter((ne) => parseInt(ne.type, 10) === j.id);
                  if (A.length > 0) {
                            y += `【${j.name}】\n`;
                            A.forEach((ne) => {
                                        y += `  開始：${Et(ne.startDateTime)}  結束：${Et(ne.endDateTime)}\n`;
                            });
                  }
          });

          y += `\n`;
          y += `${'='.repeat(60)}\n`;

          const x = totalObstacleTime;
          y += `障礙事由合計：共 ${x.hours} 小時 ${x.minutes} 分\n`;

          y += `\n各事由時間小計：\n`;
          cc.forEach((j) => {
                  const A = obstacles.filter((ne) => parseInt(ne.type, 10) === j.id);
                  if (A.length > 0) {
                            let groupH = 0, groupM = 0;
                            A.forEach((ne) => {
                                        groupH += (ne.hours || 0);
                                        groupM += (ne.minutes || 0);
                            });
                            groupH += Math.floor(groupM / 60);
                            groupM = groupM % 60;
                            y += `  ${j.name}：${groupH} 小時 ${groupM} 分\n`;
                  }
          });

          y += `\n`;
          const k = deadlineInfo;
          y += `${displayResultLabel}\n`;
          y += `解送期限：${k ? k.formatted : '--'}\n`;
          y += `${displayFormulaLabel}\n`;

          const S = new Blob(['\uFEFF' + y], { type: 'text/plain;charset=utf-8' });
          const N = URL.createObjectURL(S);
          const C = document.createElement('a');
          C.href = N;
          C.download = `解送人犯法定障礙事由_${o.suspectName || '未填姓名'}.txt`;
          C.click();
          URL.revokeObjectURL(N);
    };

    return (
          <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl shadow-lg p-6 text-white">
                <div className="flex justify-between items-center mb-4">
                        <h2 className="text-lg font-bold flex items-center gap-2">
                                  <Clock className="w-5 h-5 text-green-400" />
                                  統計結果
                        </h2>
                        <button
                                    onClick={handleExportTxt}
                                    className="flex items-center gap-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition text-sm font-medium"
                                  >
                                  <FileText className="w-4 h-4" />
                                  匯出 法定障礙事由
                        </button>
                </div>
          
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
                                  <p className="text-xs text-gray-400 mt-2">
                                    {displayFormulaLabel}
                                  </p>
                        </div>
                </div>
          </div>
        );
};

export default Summary;
