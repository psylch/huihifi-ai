import React from 'react';
import { FilterManipulation, FilterParams } from '../types';

interface AIManipulationCardProps {
  manipulation: FilterManipulation;
  cardIndex: string;
  addFilterFromLLM: (filterParams: FilterParams) => void;
  editFilterFromLLM: (filterId: string, filterParams: Partial<FilterParams>) => void;
  deleteFilterFromLLM: (filterId: string) => void;
  appliedFilters: FilterParams[];
}

const AIManipulationCard: React.FC<AIManipulationCardProps> = ({
  manipulation,
  cardIndex,
  addFilterFromLLM,
  editFilterFromLLM,
  deleteFilterFromLLM,
  appliedFilters
}) => {
  if (manipulation.manipulationType === 'add' && manipulation.filterParams) {
    // 从操作中提取参数
    const { filterType, freq, gain, qFactor } = manipulation.filterParams;
    // 获取原始参数对象，可能包含额外属性
    const rawParams = manipulation.filterParams as any;
    // 确定过滤器类型（使用filterType或type属性，优先使用filterType）
    const actualFilterType = filterType || (rawParams.type as string) || 'peaking';
    
    // 格式化显示的过滤器类型名称
    const displayFilterType = actualFilterType.split('_')
      .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
    
    console.log('Add filter params:', manipulation.filterParams);
    
    return (
      <div key={cardIndex} className="ai-action-card">
        <h4>添加 {displayFilterType} 滤波器</h4>
        <p>频率: {freq}Hz</p>
        {gain !== undefined && <p>增益: {gain}dB</p>}
        {qFactor !== undefined && <p>Q值: {qFactor}</p>}
        <button type="button" onClick={() => {
          if (manipulation.filterParams) {
            // 准备适合store函数的参数
            // 注意：addFilterFromLLM要求的参数结构与接口不完全匹配，所以这里使用as any
            addFilterFromLLM({
              filterType: actualFilterType,
              freq: freq || 1000, // 默认为1000Hz
              gain: gain,
              qFactor: qFactor
            } as any);
          }
        }}>应用</button>
      </div>
    );
  } else if (manipulation.manipulationType === 'edit' && manipulation.filterParams) {
    const { freq, gain, qFactor } = manipulation.filterParams;
    const filterId = manipulation.filterId === 'FILTER_ID_PLACEHOLDER' && appliedFilters.length > 0
      ? appliedFilters[0].id
      : manipulation.filterId;
    
    if (!filterId) return null;
    
    return (
      <div key={cardIndex} className="ai-action-card">
        <h4>编辑滤波器</h4>
        {freq !== undefined && <p>频率: {freq}Hz</p>}
        {gain !== undefined && <p>增益: {gain}dB</p>}
        {qFactor !== undefined && <p>Q值: {qFactor}</p>}
        <button type="button" onClick={() => filterId && manipulation.filterParams && editFilterFromLLM(filterId, manipulation.filterParams)}>应用</button>
      </div>
    );
  } else if (manipulation.manipulationType === 'delete' && manipulation.filterId) {
    return (
      <div key={cardIndex} className="ai-action-card">
        <h4>删除滤波器</h4>
        <p>移除ID为: {manipulation.filterId} 的滤波器</p>
        <button type="button" onClick={() => manipulation.filterId && deleteFilterFromLLM(manipulation.filterId)}>应用</button>
      </div>
    );
  }
  
  return null;
};

export default AIManipulationCard;
