import React from 'react';
import FrequencyResponseChart from './FrequencyResponseChart';
import { useMicroAppContext } from '../store/MicroAppContext';

/**
 * 曲线图显示组件 - 兼容旧版模式但实际使用新的图表渲染方式
 * 此组件主要用于保持API兼容性，实际已经改用FrequencyResponseChart
 */
const CurveImageDisplay: React.FC<{imageDataURL?: string | null}> = () => {
  // 不再使用imageDataURL属性，而是直接从Context获取原始数据
  const { originalDataSource, currentProcessedCurve } = useMicroAppContext();
  
  // 使用新的FrequencyResponseChart组件
  return (
    <FrequencyResponseChart 
      originalDataSource={originalDataSource}
      currentProcessedCurve={currentProcessedCurve}
    />
  );
};

export default CurveImageDisplay;
// 注意：此组件现已作为FrequencyResponseChart的包装器存在，仅为保持向后兼容
// 新代码应直接使用FrequencyResponseChart组件
