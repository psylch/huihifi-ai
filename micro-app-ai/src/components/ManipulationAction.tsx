import React, { useState } from 'react';
import { FilterManipulation, FilterParams } from '../types';

interface ManipulationActionProps {
  action: FilterManipulation;
  onAddFilter: (params: FilterManipulation['filterParams']) => void;
  onEditFilter: (id: string, params: FilterManipulation['filterParams']) => boolean;
  onDeleteFilter: (id: string) => boolean;
  appliedFilters: FilterParams[];
}

const ManipulationAction: React.FC<ManipulationActionProps> = ({
  action,
  onAddFilter,
  onEditFilter,
  onDeleteFilter,
  appliedFilters
}) => {
  const [actionTaken, setActionTaken] = useState(false);
  const [actionResult, setActionResult] = useState<'success' | 'failed' | null>(null);

  // 根据操作类型获取样式和标题
  const getActionStyle = () => {
    switch(action.manipulationType) {
      case 'add':
        return { 
          className: 'ai-manipulation-card ai-add-card',
          title: '添加滤波器',
          actionText: '应用',
          icon: '➕'
        };
      case 'edit':
        return { 
          className: 'ai-manipulation-card ai-edit-card',
          title: '编辑滤波器',
          actionText: '应用',
          icon: '✏️'
        };
      case 'delete':
        return { 
          className: 'ai-manipulation-card ai-delete-card',
          title: '删除滤波器',
          actionText: '删除',
          icon: '🗑️'
        };
      default:
        return { 
          className: 'ai-manipulation-card',
          title: '操作',
          actionText: '应用',
          icon: '🔧'
        };
    }
  };

  // 处理操作执行
  const handleAction = () => {
    try {
      let success = false;
      
      switch(action.manipulationType) {
        case 'add':
          if (action.filterParams) {
            onAddFilter(action.filterParams);
            success = true;
          }
          break;
        case 'edit':
          if (action.filterId && action.filterParams) {
            success = onEditFilter(action.filterId, action.filterParams);
          }
          break;
        case 'delete':
          if (action.filterId) {
            success = onDeleteFilter(action.filterId);
          }
          break;
      }
      
      setActionTaken(true);
      setActionResult(success ? 'success' : 'failed');
    } catch (error) {
      console.error('执行滤波器操作时出错:', error);
      setActionTaken(true);
      setActionResult('failed');
    }
  };

  // 格式化滤波器参数显示
  const formatFilterParams = () => {
    if (!action.filterParams) return null;
    
    // 找到要编辑或删除的滤波器的当前值作为参考
    let currentFilter: FilterParams | undefined;
    if (action.filterId && action.manipulationType !== 'add') {
      currentFilter = appliedFilters.find(f => f.id === action.filterId);
    }

    // 显示参数
    const params = [];
    if (action.filterParams.filterType) {
      params.push(<div key="type">类型: <strong>{getFilterTypeLabel(action.filterParams.filterType)}</strong></div>);
    }
    if (action.filterParams.freq !== undefined) {
      const oldValue = currentFilter?.freq;
      params.push(
        <div key="freq">
          频率: <strong>{action.filterParams.freq} Hz</strong>
          {oldValue !== undefined && action.manipulationType === 'edit' && oldValue !== action.filterParams.freq && 
            <span style={{color: '#ffc107'}}> (原值: {oldValue} Hz)</span>
          }
        </div>
      );
    }
    if (action.filterParams.gain !== undefined) {
      const oldValue = currentFilter?.gain;
      params.push(
        <div key="gain">
          增益: <strong>{action.filterParams.gain} dB</strong>
          {oldValue !== undefined && action.manipulationType === 'edit' && oldValue !== action.filterParams.gain && 
            <span style={{color: '#ffc107'}}> (原值: {oldValue} dB)</span>
          }
        </div>
      );
    }
    if (action.filterParams.qFactor !== undefined) {
      const oldValue = currentFilter?.qFactor;
      params.push(
        <div key="q">
          Q值: <strong>{action.filterParams.qFactor}</strong>
          {oldValue !== undefined && action.manipulationType === 'edit' && oldValue !== action.filterParams.qFactor && 
            <span style={{color: '#ffc107'}}> (原值: {oldValue})</span>
          }
        </div>
      );
    }
    
    return params;
  };

  // 获取滤波器类型的显示名称
  const getFilterTypeLabel = (type?: string) => {
    switch(type) {
      case 'peaking': return '峰值均衡器';
      case 'low_shelf': return '低音搁架';
      case 'high_shelf': return '高音搁架';
      case 'lowpass': return '低通滤波器';
      case 'highpass': return '高通滤波器';
      default: return type || '未知类型';
    }
  };

  // 获取当前滤波器的显示信息
  const getCurrentFilterInfo = () => {
    if (!action.filterId || action.manipulationType === 'add') return null;
    
    const filter = appliedFilters.find(f => f.id === action.filterId);
    if (!filter) return <div style={{color: '#dc3545'}}>找不到ID为 {action.filterId} 的滤波器</div>;

    return (
      <div>
        <div>滤波器ID: <code>{filter.id.substring(0, 8)}...</code></div>
        <div>类型: {getFilterTypeLabel(filter.type)}</div>
        <div>频率: {filter.freq} Hz</div>
        {filter.gain !== undefined && <div>增益: {filter.gain} dB</div>}
        {filter.qFactor !== undefined && <div>Q值: {filter.qFactor}</div>}
      </div>
    );
  };

  const { className, title, actionText, icon } = getActionStyle();

  return (
    <div className={className}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <h4 style={{ margin: 0 }}>
          {icon} {title}
        </h4>
        {!actionTaken && (
          <button
            type="button"
            onClick={handleAction}
            style={{
              padding: '4px 8px',
              fontSize: '12px',
              backgroundColor: 
                action.manipulationType === 'add' ? '#198754' :
                action.manipulationType === 'edit' ? '#ffc107' :
                action.manipulationType === 'delete' ? '#dc3545' : '#6c757d',
              color: action.manipulationType === 'edit' ? '#000' : '#fff'
            }}
          >
            {actionText}
          </button>
        )}
        {actionTaken && (
          <div style={{ 
            padding: '4px 8px',
            fontSize: '12px',
            backgroundColor: actionResult === 'success' ? 'rgba(25, 135, 84, 0.2)' : 'rgba(220, 53, 69, 0.2)',
            color: actionResult === 'success' ? '#198754' : '#dc3545',
            borderRadius: '4px'
          }}>
            {actionResult === 'success' ? '✓ 已应用' : '✗ 操作失败'}
          </div>
        )}
      </div>

      <div style={{ fontSize: '14px' }}>
        {action.manipulationType === 'delete' ? (
          <>
            <p>将删除以下滤波器:</p>
            {getCurrentFilterInfo()}
          </>
        ) : action.manipulationType === 'edit' ? (
          <>
            <p>将编辑以下滤波器:</p>
            {getCurrentFilterInfo()}
            <p>修改为:</p>
            {formatFilterParams()}
          </>
        ) : (
          formatFilterParams()
        )}
      </div>
    </div>
  );
};

export default ManipulationAction;
