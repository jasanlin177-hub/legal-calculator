import React from 'react';
import { Plus, X, Users } from 'lucide-react';

const MAX_SUSPECTS = 20;

const SuspectTabs = ({ suspects, activeSuspectIndex, onAdd, onRemove, onSetActive }) => {
  const handleRemove = (e, suspect, idx) => {
    e.stopPropagation();
    const name = suspect.suspectName || `嫌疑人 ${idx + 1}`;
    if (window.confirm(`確定移除「${name}」？此動作無法復原。`)) {
      onRemove(suspect.id);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 px-4 py-3 flex items-center gap-2 flex-wrap">
      <span className="text-sm font-semibold text-gray-600 flex items-center gap-1 mr-1">
        <Users className="w-4 h-4" />
        嫌疑人：
      </span>

      {suspects.map((suspect, idx) => {
        const isActive = idx === activeSuspectIndex;
        const label = suspect.suspectName
          ? (suspect.suspectName.length > 8 ? suspect.suspectName.slice(0, 8) + '…' : suspect.suspectName)
          : `嫌疑人 ${idx + 1}`;

        return (
          <button
            key={suspect.id}
            onClick={() => onSetActive(idx)}
            className={[
              'flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition border',
              isActive
                ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-blue-50 hover:border-blue-300'
            ].join(' ')}
          >
            <span>{label}</span>
            {suspects.length > 1 && (
              <span
                role="button"
                tabIndex={0}
                onClick={e => handleRemove(e, suspect, idx)}
                onKeyDown={e => e.key === 'Enter' && handleRemove(e, suspect, idx)}
                className={[
                  'ml-0.5 rounded-full w-4 h-4 flex items-center justify-center text-xs leading-none',
                  isActive ? 'hover:bg-blue-400' : 'hover:bg-red-100 text-red-400'
                ].join(' ')}
                title={`移除 ${label}`}
              >
                <X className="w-3 h-3" />
              </span>
            )}
          </button>
        );
      })}

      <button
        onClick={onAdd}
        disabled={suspects.length >= MAX_SUSPECTS}
        title={suspects.length >= MAX_SUSPECTS ? `最多 ${MAX_SUSPECTS} 名嫌疑人` : '新增嫌疑人'}
        className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium border border-dashed border-gray-300 text-gray-500 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <Plus className="w-4 h-4" />
        新增
      </button>

      <span className="ml-auto text-xs text-gray-400">
        {suspects.length}/{MAX_SUSPECTS} 人
      </span>
    </div>
  );
};

export default SuspectTabs;
