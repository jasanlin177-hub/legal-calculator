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
    const SEP = '='.repeat(60);

    let y = '';
    y += `一、法定障礙事由記錄表\n`;
    y += `\n`;
    y += `案由：${o.caseCause || ''}\n`;
    y += `\n`;
    y += `是否為通緝犯：${isWantedBool ? '是' : '否'}\n`;
    y += `\n`;
    y += `犯罪嫌疑人：${o.suspectName || ''}\n`;
    y += `\n`;
    y += `承辦人：${o.officer || ''}\n`;
    y += `\n`;
    y += `警察機關：${o.policeAgency || ''}\n`;
    y += `\n`;
    y += `所屬機關：${o.policeSubAgency || ''}\n`;
    y += `\n`;
    y += `單位：${o.policeUnit || ''}\n`;
    y += `\n`;
    y += `機關地址：${o.unitAddress || ''}\n`;
    y += `\n`;
    if (arrestDateTime) {
      y += `拘提/逮捕時間：${Et(arrestDateTime)}\n`;
      y += `\n`;
    }
    if (arrestLocation) {
      y += `拘提/逮捕地點：${arrestLocation}\n`;
      y += `\n`;
    }
    y += `法定障礙事由明細\n`;
    y += `\n`;
    y += `${SEP}\n`;
    y += `\n`;

    // 9 種法定障礙事由全部列出，有記錄者□換■
    const obstacleNames = [
      '因交通障礙或其他不可抗力之事由所生不得已之遲滯',
      '在途解送期間',
      '依第一百條之三第一項規定不得為詢問者',
      '因被告或犯罪嫌疑人身體健康突發之事由，事實上無法訊問者',
      '被告或犯罪嫌疑人表示已選任辯護人，因等候其辯護人到場致未予訊問者',
      '被告或犯罪嫌疑人不通國語須由其通譯傳譯，因等候其通譯到場致未予訊問者',
      '經檢察官命具保之被告，在候保中者',
      '犯罪嫌疑人經法院提審之期間',
      '辯護人與偵查中受拘提或逮補之被告或犯罪嫌疑人接見經過之時間',
    ];

    OBSTACLE_TYPES.forEach((type, idx) => {
      const matched = obstacles.filter((ob) => parseInt(ob.type, 10) === type.id);
      const hasRecord = matched.length > 0;
      const checkbox = hasRecord ? '■' : '□';
      const name = obstacleNames[idx] || type.name;

      y += `${checkbox} ${name}\n`;
      y += `\n`;

      if (hasRecord) {
        matched.forEach((ob) => {
          y += `   (${Et(ob.startDateTime)} 至 ${Et(ob.endDateTime)})\n`;
        });
      } else {
        y += `   (                              )\n`;
      }
      y += `\n`;
    });

    y += `${SEP}\n`;
    y += `\n`;

    const x = totalObstacleTime;
    y += `因上述法定障礙事由，其經過之時間合計（ ${x.hours} ）小時 ( ${x.minutes} ) 分\n`;
    y += `\n`;
    y += `（註：上列每一法定障礙事由下之括弧內均須記明起迄之日、時、分）\n`;
    y += `\n`;

    // 法定時限計算區塊
    y += `【法定時限計算】\n`;
    y += `\n`;
    const baseHours = isWantedBool ? 24 : 16;
    if (arrestDateTime) {
      y += `${baseHours}小時起算點：${Et(arrestDateTime)}\n`;
      y += `\n`;
    }
    y += `加計障礙時間：${x.hours} 小時 ${x.minutes} 分\n`;
    y += `\n`;
    const k = deadlineInfo;
    y += `${displayResultLabel}：${k ? k.formatted : '--'}\n`;

    const S = new Blob(['\uFEFF' + y], { type: 'text/plain;charset=utf-8' });
    const N = URL.createObjectURL(S);
    const C = document.createElement('a');
    C.href = N;
    C.download = `法定障礙記錄_${o.suspectName || '未填姓名'}.txt`;
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
