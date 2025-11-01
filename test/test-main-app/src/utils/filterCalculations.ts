// Implementation of biquad filter calculations
// Based on Robert Bristow-Johnson's "Audio EQ Cookbook"

import { FilterParams, FilterType } from '../store/useStore';

// Calculate the gain at a specific frequency for a peaking filter
export const calculatePeakingGain = (freq: number, filterFreq: number, gain: number, q: number): number => {
  const w0 = 2 * Math.PI * filterFreq / 44100; // Using 44.1kHz as reference sample rate
  const alpha = Math.sin(w0) / (2 * q);
  
  const omega = 2 * Math.PI * freq / 44100;
  const cosOmega = Math.cos(omega);
  const cosW0 = Math.cos(w0);
  
  const a0 = 1 + alpha / Math.pow(10, gain / 40);
  const a1 = -2 * cosW0;
  const a2 = 1 - alpha / Math.pow(10, gain / 40);
  const b0 = 1 + alpha * Math.pow(10, gain / 40);
  const b1 = -2 * cosW0;
  const b2 = 1 - alpha * Math.pow(10, gain / 40);
  
  // Calculate the frequency response
  const numerator = Math.pow(b0 + b1 * cosOmega + b2 * Math.cos(2 * omega), 2) + 
                    Math.pow(b1 * Math.sin(omega) + b2 * Math.sin(2 * omega), 2);
  const denominator = Math.pow(a0 + a1 * cosOmega + a2 * Math.cos(2 * omega), 2) + 
                      Math.pow(a1 * Math.sin(omega) + a2 * Math.sin(2 * omega), 2);
  
  // Convert to dB
  return 20 * Math.log10(Math.sqrt(numerator / denominator));
};

// Calculate the gain at a specific frequency for a low shelf filter
export const calculateLowShelfGain = (freq: number, filterFreq: number, gain: number, q: number): number => {
  const A = Math.pow(10, gain / 40);
  const w0 = 2 * Math.PI * filterFreq / 44100;
  const alpha = Math.sin(w0) / (2 * q);
  
  const omega = 2 * Math.PI * freq / 44100;
  const cosOmega = Math.cos(omega);
  
  const b0 = A * ((A + 1) - (A - 1) * Math.cos(w0) + 2 * Math.sqrt(A) * alpha);
  const b1 = 2 * A * ((A - 1) - (A + 1) * Math.cos(w0));
  const b2 = A * ((A + 1) - (A - 1) * Math.cos(w0) - 2 * Math.sqrt(A) * alpha);
  const a0 = (A + 1) + (A - 1) * Math.cos(w0) + 2 * Math.sqrt(A) * alpha;
  const a1 = -2 * ((A - 1) + (A + 1) * Math.cos(w0));
  const a2 = (A + 1) + (A - 1) * Math.cos(w0) - 2 * Math.sqrt(A) * alpha;
  
  // Simplified response calculation for shelf filter
  // Returns gain based on the frequency in relation to the cutoff frequency
  if (freq <= filterFreq) {
    return gain;
  } else {
    const ratio = filterFreq / freq;
    return gain * Math.pow(ratio, 2);
  }
};

// Calculate the gain at a specific frequency for a high shelf filter
export const calculateHighShelfGain = (freq: number, filterFreq: number, gain: number, q: number): number => {
  // Similar approach as low shelf but with inverted frequency relationship
  if (freq >= filterFreq) {
    return gain;
  } else {
    const ratio = freq / filterFreq;
    return gain * Math.pow(ratio, 2);
  }
};

// Calculate the gain at a specific frequency for a lowpass filter
export const calculateLowpassGain = (freq: number, filterFreq: number, q: number): number => {
  const w0 = 2 * Math.PI * filterFreq / 44100;
  const alpha = Math.sin(w0) / (2 * q);
  
  const omega = 2 * Math.PI * freq / 44100;
  const cosOmega = Math.cos(omega);
  
  const b0 = (1 - Math.cos(w0)) / 2;
  const b1 = 1 - Math.cos(w0);
  const b2 = (1 - Math.cos(w0)) / 2;
  const a0 = 1 + alpha;
  const a1 = -2 * Math.cos(w0);
  const a2 = 1 - alpha;
  
  // Simplified response calculation
  if (freq <= filterFreq) {
    return 0; // No attenuation in pass band
  } else {
    // Simple rolloff calculation based on octave distance
    const octaveDistance = Math.log2(freq / filterFreq);
    // -12dB per octave for a second-order filter
    return -12 * octaveDistance;
  }
};

// Calculate the gain at a specific frequency for a highpass filter
export const calculateHighpassGain = (freq: number, filterFreq: number, q: number): number => {
  // Similar to lowpass but with inverted frequency relationship
  if (freq >= filterFreq) {
    return 0; // No attenuation in pass band
  } else {
    // Simple rolloff calculation based on octave distance
    const octaveDistance = Math.log2(filterFreq / freq);
    // -12dB per octave for a second-order filter
    return -12 * octaveDistance;
  }
};

// Calculate the combined filter effect of all applied filters
export const calculateCombinedFilterResponse = (
  frequency: number,
  filters: FilterParams[]
): number => {
  let totalGain = 0;
  
  filters.forEach(filter => {
    switch (filter.type) {
      case 'peaking':
        if (filter.gain !== undefined && filter.qFactor !== undefined) {
          totalGain += calculatePeakingGain(frequency, filter.freq, filter.gain, filter.qFactor);
        }
        break;
      case 'low_shelf':
        if (filter.gain !== undefined && filter.qFactor !== undefined) {
          totalGain += calculateLowShelfGain(frequency, filter.freq, filter.gain, filter.qFactor);
        }
        break;
      case 'high_shelf':
        if (filter.gain !== undefined && filter.qFactor !== undefined) {
          totalGain += calculateHighShelfGain(frequency, filter.freq, filter.gain, filter.qFactor);
        }
        break;
      case 'lowpass':
        if (filter.qFactor !== undefined) {
          totalGain += calculateLowpassGain(frequency, filter.freq, filter.qFactor);
        }
        break;
      case 'highpass':
        if (filter.qFactor !== undefined) {
          totalGain += calculateHighpassGain(frequency, filter.freq, filter.qFactor);
        }
        break;
    }
  });
  
  return totalGain;
};

// Apply all filters to the original frequency response data
export const applyFiltersToData = (
  originalData: [string, string][],
  filters: FilterParams[]
): [string, string][] => {
  // Skip the header row
  const header = originalData[0];
  const processedData: [string, string][] = [header];
  
  // Process each data point
  for (let i = 1; i < originalData.length; i++) {
    const [freqStr, splStr] = originalData[i];
    const frequency = parseFloat(freqStr);
    const originalSPL = parseFloat(splStr);
    
    // Calculate the combined filter effect
    const filterGain = calculateCombinedFilterResponse(frequency, filters);
    
    // Apply the filter gain to the original SPL
    const newSPL = originalSPL + filterGain;
    
    // Add the processed data point
    processedData.push([freqStr, newSPL.toFixed(2)]);
  }
  
  return processedData;
};

// Validate the frequency response data format
export const validateFrequencyData = (data: any[]): { valid: boolean; error?: string } => {
  // 详细日志记录开始验证过程
  console.log('开始验证频率响应数据格式，数据长度:', data.length);
  
  // Check if it's an array of arrays
  if (!Array.isArray(data) || data.length < 2) {
    console.error('数据验证失败：不是数组或长度不足2行');
    return { valid: false, error: 'Data must be an array with at least 2 rows (header + data)' };
  }
  
  // 更宽松地检查每行是否为数组且至少有两个元素
  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    if (!Array.isArray(row)) {
      console.error(`数据验证失败：第${i}行不是数组`, row);
      return { valid: false, error: `Row ${i} is not an array` };
    }
    
    if (row.length < 2) {
      console.error(`数据验证失败：第${i}行元素少于2个`, row);
      return { valid: false, error: `Row ${i} has less than 2 elements` };
    }
  }
  
  // 检查标题行 - 更宽松的验证
  const header = data[0];
  console.log('标题行内容:', header);
  
  // 只要第一行的两个元素都能转换为字符串即可
  const hasValidHeader = header[0] !== undefined && header[1] !== undefined;
  
  // 打印调试信息
  console.log('标题行验证结果:', hasValidHeader ? '有效' : '无效');
  
  // 检查第一行之后的数据行 - 确保至少有一行数据
  if (data.length < 2) {
    console.error('数据验证失败：没有数据行，只有标题行');
    return { valid: false, error: 'No data rows found, only header' };
  }
  
  // 检查数据点 - 确保频率和SPL值是有效数字
  let prevFreq = -1;
  let validDataPoints = 0;
  
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    
    // 将值转换为数字
    let freq, spl;
    try {
      freq = parseFloat(String(row[0]));
      spl = parseFloat(String(row[1]));
    } catch (e) {
      console.error(`数据行${i}转换错误:`, e);
      freq = NaN;
      spl = NaN;
    }
    
    // 检查值是否为有效数字
    if (isNaN(freq)) {
      console.warn(`第${i}行频率值不是有效数字:`, row[0]);
      continue; // 跳过无效行，而不是直接拒绝整个数据集
    }
    
    if (isNaN(spl)) {
      console.warn(`第${i}行SPL值不是有效数字:`, row[1]);
      continue; // 跳过无效行，而不是直接拒绝整个数据集
    }
    
    // 计数有效数据点
    validDataPoints++;
    
    // 检查频率是否大致按升序排列 (允许一些容差)
    // 注意：此处放宽了要求，不再严格要求频率必须是升序
    if (freq < prevFreq * 0.9) { // 允许10%的容差
      console.warn(`频率顺序可能有问题：第${i}行频率${freq}小于前一个频率${prevFreq}`);
    }
    
    prevFreq = freq;
  }
  
  console.log(`有效数据点数量: ${validDataPoints}`);
  
  // 检查最小数据点数量 - 放宽要求
  if (validDataPoints < 10) {  // 至少10个有效数据点
    console.error('有效数据点数量不足10个');
    return { 
      valid: false, 
      error: 'Data must contain at least 10 valid frequency response data points'
    };
  }
  
  // 所有检查通过
  console.log('数据验证成功！');
  return { valid: true };
};
