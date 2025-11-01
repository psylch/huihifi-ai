import React, { useState } from 'react';
import { useStore, FilterParams, FilterType } from '../store/useStore';

const FilterManager: React.FC = () => {
  const { appliedFilters, addFilter, deleteFilter, editFilter } = useStore();
  
  // 新滤波器的初始状态
  const initialNewFilter = {
    type: 'peaking' as FilterType,
    freq: 1000,
    gain: 0,
    qFactor: 1.0
  };
  
  const [newFilter, setNewFilter] = useState(initialNewFilter);
  const [editingFilterId, setEditingFilterId] = useState<string | null>(null);
  
  // 处理添加新滤波器
  const handleAddFilter = () => {
    addFilter(newFilter);
    // 重置表单
    setNewFilter(initialNewFilter);
  };
  
  // 处理开始编辑滤波器
  const handleStartEdit = (filter: FilterParams) => {
    setEditingFilterId(filter.id);
    setNewFilter({
      type: filter.type,
      freq: filter.freq,
      gain: filter.gain || 0,
      qFactor: filter.qFactor || 1.0
    });
  };
  
  // 处理保存编辑
  const handleSaveEdit = () => {
    if (editingFilterId) {
      const { freq, gain, qFactor } = newFilter;
      editFilter(editingFilterId, { freq, gain, qFactor });
      setEditingFilterId(null);
      setNewFilter(initialNewFilter);
    }
  };
  
  // 处理取消编辑
  const handleCancelEdit = () => {
    setEditingFilterId(null);
    setNewFilter(initialNewFilter);
  };
  
  // 根据滤波器类型确定需要显示的参数
  const showGain = newFilter.type !== 'lowpass' && newFilter.type !== 'highpass';
  const showQFactor = newFilter.type !== 'low_shelf' && newFilter.type !== 'high_shelf';
  
  return (
    <div className="card">
      <h2>滤波器管理</h2>
      
      {/* 添加/编辑滤波器表单 */}
      <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: 'var(--surface-light)', borderRadius: '4px' }}>
        <h3>{editingFilterId ? '编辑滤波器' : '添加新滤波器'}</h3>
        
        {/* 滤波器类型选择 */}
        <div style={{ marginBottom: '10px' }}>
          <label>
            类型:
            <select
              value={newFilter.type}
              onChange={(e) => setNewFilter({ ...newFilter, type: e.target.value as FilterType })}
              style={{ 
                marginLeft: '10px',
                backgroundColor: 'var(--surface-medium)',
                color: 'white',
                border: '1px solid #555',
                padding: '5px',
                borderRadius: '4px'
              }}
              disabled={!!editingFilterId} // 编辑时不允许改变类型
            >
              <option value="peaking">峰值 (Peaking)</option>
              <option value="low_shelf">低架 (Low Shelf)</option>
              <option value="high_shelf">高架 (High Shelf)</option>
              <option value="lowpass">低通 (Lowpass)</option>
              <option value="highpass">高通 (Highpass)</option>
            </select>
          </label>
        </div>
        
        {/* 频率滑动条 */}
        <div style={{ marginBottom: '10px' }}>
          <label>
            频率 (Hz): {newFilter.freq}
            <input
              type="range"
              min="20"
              max="20000"
              step="1"
              value={newFilter.freq}
              onChange={(e) => setNewFilter({ ...newFilter, freq: parseInt(e.target.value, 10) })}
              style={{ width: '100%', marginTop: '5px' }}
            />
          </label>
        </div>
        
        {/* 增益滑动条 - 仅对某些滤波器类型显示 */}
        {showGain && (
          <div style={{ marginBottom: '10px' }}>
            <label>
              增益 (dB): {newFilter.gain}
              <input
                type="range"
                min="-20"
                max="20"
                step="0.5"
                value={newFilter.gain}
                onChange={(e) => setNewFilter({ ...newFilter, gain: parseFloat(e.target.value) })}
                style={{ width: '100%', marginTop: '5px' }}
              />
            </label>
          </div>
        )}
        
        {/* Q因子滑动条 - 仅对某些滤波器类型显示 */}
        {showQFactor && (
          <div style={{ marginBottom: '10px' }}>
            <label>
              Q因子: {newFilter.qFactor?.toFixed(2)}
              <input
                type="range"
                min="0.1"
                max="10"
                step="0.1"
                value={newFilter.qFactor}
                onChange={(e) => setNewFilter({ ...newFilter, qFactor: parseFloat(e.target.value) })}
                style={{ width: '100%', marginTop: '5px' }}
              />
            </label>
          </div>
        )}
        
        {/* 按钮区域 */}
        <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
          {editingFilterId ? (
            <>
              <button onClick={handleSaveEdit}>保存更改</button>
              <button onClick={handleCancelEdit} style={{ backgroundColor: '#666' }}>取消</button>
            </>
          ) : (
            <button onClick={handleAddFilter}>添加滤波器</button>
          )}
        </div>
      </div>
      
      {/* 已应用滤波器列表 */}
      <div>
        <h3>已应用滤波器</h3>
        {appliedFilters.length === 0 ? (
          <p>尚未应用滤波器。</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {appliedFilters.map((filter) => (
              <div
                key={filter.id}
                style={{
                  padding: '10px',
                  backgroundColor: 'var(--surface-light)',
                  borderRadius: '4px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <div>
                  <strong>{filterTypeToLabel(filter.type)}</strong>: {filter.freq} Hz
                  {filter.gain !== undefined && `, ${filter.gain} dB`}
                  {filter.qFactor !== undefined && `, Q: ${filter.qFactor.toFixed(2)}`}
                </div>
                <div>
                  <button 
                    onClick={() => handleStartEdit(filter)}
                    style={{ marginRight: '8px', backgroundColor: '#555' }}
                    disabled={!!editingFilterId}
                  >
                    编辑
                  </button>
                  <button 
                    onClick={() => deleteFilter(filter.id)}
                    style={{ backgroundColor: '#d32f2f' }}
                    disabled={!!editingFilterId}
                  >
                    删除
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// 辅助函数：将滤波器类型转换为中文标签
const filterTypeToLabel = (type: FilterType): string => {
  const labels: Record<FilterType, string> = {
    'peaking': '峰值',
    'low_shelf': '低架', 
    'high_shelf': '高架',
    'lowpass': '低通',
    'highpass': '高通'
  };
  return labels[type] || type;
};

export default FilterManager;
