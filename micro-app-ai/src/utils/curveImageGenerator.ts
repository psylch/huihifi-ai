/**
 * 曲线图图片生成器
 * 独立于DOM渲染，直接基于数据生成曲线图片
 */

/**
 * 生成频响曲线图片
 * @param originalData 原始曲线数据 [[freq, db], ...]
 * @param processedData 处理后曲线数据 [[freq, db], ...]
 * @returns 图片的Data URL (base64)
 */
export function generateCurveImage(
  originalData: Array<[string | number, string | number]>, 
  processedData: Array<[string | number, string | number]> | null,
  options: {
    width?: number,
    height?: number,
    backgroundColor?: string,
    originalLineColor?: string,
    processedLineColor?: string,
    showGrid?: boolean,
    gridColor?: string
  } = {}
): string {
  // 设置默认参数
  const width = options.width || 800;
  const height = options.height || 400;
  const backgroundColor = options.backgroundColor || '#1e1e1e';
  const originalLineColor = options.originalLineColor || '#8884d8';
  const processedLineColor = options.processedLineColor || '#82ca9d';
  const showGrid = options.showGrid !== undefined ? options.showGrid : true;
  const gridColor = options.gridColor || '#444';

  // 创建Canvas元素（不附加到DOM）
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  
  if (!ctx) {
    console.error('Canvas context could not be created');
    return '';
  }

  // 跳过标题行（如果有）
  const dataRows = originalData.slice(originalData[0][0] === 'freq' ? 1 : 0);
  
  // 绘制背景
  ctx.fillStyle = backgroundColor;
  ctx.fillRect(0, 0, width, height);

  // 设置边距
  const margin = { top: 30, right: 30, bottom: 50, left: 50 };
  const chartWidth = width - margin.left - margin.right;
  const chartHeight = height - margin.top - margin.bottom;

  // 计算X、Y轴范围
  // 使用对数刻度的X轴 (20Hz-20kHz)
  const xMin = 20;
  const xMax = 20000;
  
  // 查找Y轴范围（dB值）
  let minDb = Infinity;
  let maxDb = -Infinity;

  dataRows.forEach(row => {
    const origDb = parseFloat(String(row[1]));
    if (!isNaN(origDb)) {
      minDb = Math.min(minDb, origDb);
      maxDb = Math.max(maxDb, origDb);
    }
  });

  if (processedData && processedData.length > 0) {
    // 跳过标题行（如果有）
    const processedRows = processedData.slice(processedData[0][0] === 'freq' ? 1 : 0);
    processedRows.forEach(row => {
      const procDb = parseFloat(String(row[1]));
      if (!isNaN(procDb)) {
        minDb = Math.min(minDb, procDb);
        maxDb = Math.max(maxDb, procDb);
      }
    });
  }

  // 添加一些边距到Y轴范围
  minDb = Math.floor(minDb - 5);
  maxDb = Math.ceil(maxDb + 5);
  
  // 频率转为对数坐标的转换函数
  const freqToX = (freq: number): number => {
    const logFreq = Math.log10(freq);
    const logMin = Math.log10(xMin);
    const logMax = Math.log10(xMax);
    return margin.left + (chartWidth * (logFreq - logMin) / (logMax - logMin));
  };

  // dB值转为Y坐标的转换函数
  const dbToY = (db: number): number => {
    return margin.top + chartHeight - (chartHeight * (db - minDb) / (maxDb - minDb));
  };

  // 绘制网格
  if (showGrid) {
    ctx.strokeStyle = gridColor;
    ctx.lineWidth = 0.5;
    ctx.setLineDash([3, 3]);
    
    // 水平网格线 (dB)
    for (let db = Math.ceil(minDb / 5) * 5; db <= maxDb; db += 5) {
      const y = dbToY(db);
      ctx.beginPath();
      ctx.moveTo(margin.left, y);
      ctx.lineTo(width - margin.right, y);
      ctx.stroke();
    }
    
    // 垂直网格线 (频率)
    const freqTicks = [20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000];
    for (const freq of freqTicks) {
      const x = freqToX(freq);
      ctx.beginPath();
      ctx.moveTo(x, margin.top);
      ctx.lineTo(x, height - margin.bottom);
      ctx.stroke();
    }
    
    ctx.setLineDash([]);
  }
  
  // 绘制X轴和Y轴
  ctx.strokeStyle = '#999';
  ctx.fillStyle = '#999';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(margin.left, height - margin.bottom);
  ctx.lineTo(width - margin.right, height - margin.bottom);
  ctx.stroke();
  
  ctx.beginPath();
  ctx.moveTo(margin.left, margin.top);
  ctx.lineTo(margin.left, height - margin.bottom);
  ctx.stroke();
  
  // 绘制X轴刻度和标签
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.font = '12px Arial';
  const freqTicks = [20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000];
  
  for (const freq of freqTicks) {
    const x = freqToX(freq);
    // 绘制刻度线
    ctx.beginPath();
    ctx.moveTo(x, height - margin.bottom);
    ctx.lineTo(x, height - margin.bottom + 5);
    ctx.stroke();
    
    // 绘制标签
    const label = freq >= 1000 ? `${freq/1000}k` : `${freq}`;
    ctx.fillText(label, x, height - margin.bottom + 8);
  }
  
  // X轴标题
  ctx.fillText('频率 (Hz)', width - margin.right - 40, height - margin.bottom + 30);
  
  // 绘制Y轴刻度和标签
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  
  for (let db = Math.ceil(minDb / 5) * 5; db <= maxDb; db += 5) {
    const y = dbToY(db);
    // 绘制刻度线
    ctx.beginPath();
    ctx.moveTo(margin.left, y);
    ctx.lineTo(margin.left - 5, y);
    ctx.stroke();
    
    // 绘制标签
    ctx.fillText(`${db}`, margin.left - 10, y);
  }
  
  // Y轴标题 - 需要旋转
  ctx.save();
  ctx.translate(margin.left - 35, margin.top + chartHeight / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.textAlign = 'center';
  ctx.fillText('SPL (dB)', 0, 0);
  ctx.restore();
  
  // 绘制原始曲线
  if (dataRows.length > 1) {
    ctx.strokeStyle = originalLineColor;
    ctx.lineWidth = 2;
    ctx.beginPath();
    
    let firstPoint = true;
    for (const row of dataRows) {
      const freq = parseFloat(String(row[0]));
      const db = parseFloat(String(row[1]));
      
      if (!isNaN(freq) && !isNaN(db) && freq >= xMin && freq <= xMax) {
        const x = freqToX(freq);
        const y = dbToY(db);
        
        if (firstPoint) {
          ctx.moveTo(x, y);
          firstPoint = false;
        } else {
          ctx.lineTo(x, y);
        }
      }
    }
    ctx.stroke();
  }
  
  // 绘制处理后曲线（如果有）
  if (processedData && processedData.length > 1) {
    const processedRows = processedData.slice(processedData[0][0] === 'freq' ? 1 : 0);
    
    if (processedRows.length > 1) {
      ctx.strokeStyle = processedLineColor;
      ctx.lineWidth = 2;
      ctx.beginPath();
      
      let firstPoint = true;
      for (const row of processedRows) {
        const freq = parseFloat(String(row[0]));
        const db = parseFloat(String(row[1]));
        
        if (!isNaN(freq) && !isNaN(db) && freq >= xMin && freq <= xMax) {
          const x = freqToX(freq);
          const y = dbToY(db);
          
          if (firstPoint) {
            ctx.moveTo(x, y);
            firstPoint = false;
          } else {
            ctx.lineTo(x, y);
          }
        }
      }
      ctx.stroke();
    }
  }
  
  // 添加图例
  const legendX = width - margin.right - 150;
  const legendY = margin.top + 20;
  
  // 原始曲线图例
  ctx.strokeStyle = originalLineColor;
  ctx.beginPath();
  ctx.moveTo(legendX, legendY);
  ctx.lineTo(legendX + 30, legendY);
  ctx.stroke();
  
  ctx.fillStyle = '#999';
  ctx.textAlign = 'left';
  ctx.fillText('原始曲线', legendX + 40, legendY);
  
  // 处理后曲线图例（如果有）
  if (processedData && processedData.length > 1) {
    ctx.strokeStyle = processedLineColor;
    ctx.beginPath();
    ctx.moveTo(legendX, legendY + 20);
    ctx.lineTo(legendX + 30, legendY + 20);
    ctx.stroke();
    
    ctx.fillStyle = '#999';
    ctx.fillText('处理后曲线', legendX + 40, legendY + 20);
  }
  
  // 返回图片的base64 data URL
  return canvas.toDataURL('image/png');
}
