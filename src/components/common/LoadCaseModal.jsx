import React, { useState, useEffect } from 'react';
import { FolderOpen, Trash2, X, RefreshCw } from 'lucide-react';
import { listCases, loadCase, deleteCase } from '../../utils/db';

const LoadCaseModal = ({ onLoad, onClose }) => {
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    setLoading(true);
    try {
      setCases(await listCases());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { refresh(); }, []);

  const handleLoad = async (id) => {
    const session = await loadCase(id);
    if (session) { onLoad(session); onClose(); }
  };

  const handleDelete = async (e, id, label) => {
    e.stopPropagation();
    if (!window.confirm(`確定刪除「${label}」的存檔？`)) return;
    await deleteCase(id);
    refresh();
  };

  const formatDate = (isoStr) => {
    if (!isoStr) return '';
    const d = new Date(isoStr);
    const y = d.getFullYear() - 1911;
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const h = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${y}/${m}/${day} ${h}:${min}`;
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b">
          <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            <FolderOpen className="w-5 h-5 text-blue-600" />
            載入已儲存案件
          </h2>
          <div className="flex items-center gap-2">
            <button onClick={refresh} title="重新整理" className="p-1.5 rounded hover:bg-gray-100 text-gray-500">
              <RefreshCw className="w-4 h-4" />
            </button>
            <button onClick={onClose} className="p-1.5 rounded hover:bg-gray-100 text-gray-500">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto flex-1 p-4">
          {loading ? (
            <p className="text-center text-gray-400 py-8">載入中...</p>
          ) : cases.length === 0 ? (
            <p className="text-center text-gray-400 py-8">尚無已儲存案件</p>
          ) : (
            <div className="space-y-2">
              {cases.map(c => {
                const label = c.firstSuspectName
                  ? `${c.firstSuspectName}${c.suspectCount > 1 ? `等${c.suspectCount}人` : ''}`
                  : c.id;
                return (
                  <div
                    key={c.id}
                    onClick={() => handleLoad(c.id)}
                    className="flex items-center justify-between p-3 rounded-lg border border-gray-200 hover:border-blue-400 hover:bg-blue-50 cursor-pointer transition group"
                  >
                    <div>
                      <p className="font-semibold text-gray-800">{label}</p>
                      <p className="text-sm text-gray-500">
                        {c.caseCause} ・ {c.suspectCount} 人 ・ 最後儲存：{formatDate(c.updatedAt)}
                      </p>
                    </div>
                    <button
                      onClick={e => handleDelete(e, c.id, label)}
                      className="p-1.5 rounded text-gray-300 group-hover:text-red-400 hover:bg-red-50 transition opacity-0 group-hover:opacity-100"
                      title="刪除存檔"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="p-4 border-t">
          <p className="text-xs text-gray-400">點擊案件列以載入；目前案件資料將被取代（請先確認已儲存）</p>
        </div>
      </div>
    </div>
  );
};

export default LoadCaseModal;
