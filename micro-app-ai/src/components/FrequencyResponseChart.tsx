import React, { useEffect, useState, useRef } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { generateCurveImage } from '../utils/curveImageGenerator';
import { useMicroAppContext } from '../store/MicroAppContext';

interface FrequencyResponseChartProps {
  originalDataSource: [string, string][] | null;
  currentProcessedCurve: [string, string][] | null;
  onImageGenerated?: (imageDataURL: string) => void; // 新增回调函数用于向父组件传递生成的图像
}

const FrequencyResponseChart: React.FC<FrequencyResponseChartProps> = ({ 
  originalDataSource, 
  currentProcessedCurve,
  onImageGenerated
}) => {
  const { setCurrentCurveImageDataURL } = useMicroAppContext(); // 从 MicroAppContext 获取设置图像的方法
  const [chartData, setChartData] = useState<any[]>([]);
  const [yAxisDomain, setYAxisDomain] = useState<[number, number]>([-20, 20]);
  const [curveImageURL, setCurveImageURL] = useState<string>('');
  
  // 格式化数据来适配Recharts
  useEffect(() => {
    if (!originalDataSource || originalDataSource.length < 2) return;
    
    // 跳过标题行（第一行），只处理数据行
    const dataRows = originalDataSource.slice(1);
    
    // 确保有数据可处理
    if (dataRows.length === 0) {
      return;
    }
    
    const formattedData = dataRows.map((row, index) => {
      const [freq, origDb] = row;
      const processedDb = currentProcessedCurve && currentProcessedCurve.length > index + 1
        ? currentProcessedCurve[index + 1][1] // 注意currentProcessedCurve也应跳过标题行
        : origDb;
        
      return {
        freq: parseFloat(freq),
        original: parseFloat(origDb),
        processed: parseFloat(processedDb)
      };
    }).filter(item => !isNaN(item.freq) && !isNaN(item.original) && !isNaN(item.processed)); // 过滤无效值
    
    // 计算合适的Y轴范围
    if (formattedData.length > 0) {
      const allDbValues = formattedData.flatMap(item => [item.original, item.processed]);
      const minDb = Math.floor(Math.min(...allDbValues) - 5);
      const maxDb = Math.ceil(Math.max(...allDbValues) + 5);
      setYAxisDomain([minDb, maxDb]);
    }
    
    setChartData(formattedData);
    console.log('图表数据已格式化:', { originalRows: originalDataSource.length, formattedRows: formattedData.length });
  }, [originalDataSource, currentProcessedCurve]);
  
  // 生成曲线图像 - 与渲染解耦
  useEffect(() => {
    if (!originalDataSource || originalDataSource.length < 2) return;
    
    try {
      // 使用独立的图片生成器，直接基于数据生成图片
      const imageDataURL = generateCurveImage(
        originalDataSource,
        currentProcessedCurve,
        {
          width: 800, 
          height: 400,
          backgroundColor: '#1e1e1e',
          originalLineColor: '#8884d8', // 原始曲线颜色
          processedLineColor: '#82ca9d' // 处理后曲线颜色
        }
      );
      
      // 保存图片URL到本地状态
      setCurveImageURL(imageDataURL);
      
      // 更新到 MicroAppContext
      setCurrentCurveImageDataURL(imageDataURL);
      
      // 如果父组件提供了回调函数，则将图像传递给父组件
      if (onImageGenerated) {
        onImageGenerated(imageDataURL);
      }
      
      console.log('已生成独立的曲线图像，完全不依赖DOM渲染');
    } catch (err) {
      console.error('生成图表图像时出错:', err);
    }
  }, [originalDataSource, currentProcessedCurve, onImageGenerated]);

  if (!originalDataSource || chartData.length === 0) {
    return <div className="card">暂无频率响应数据。请从主应用获取数据。</div>;
  }

  return (
    <div className="frequency-response-chart" style={{
      width: '100%',
      backgroundColor: '#1e1e1e',
      borderRadius: '4px',
      padding: '10px',
      marginBottom: '10px'
    }}>
      <h3 style={{ margin: '0 0 10px 0', color: '#e0e0e0' }}>频率响应曲线</h3>
      {/* 渲染图表用于界面展示 */}
      <div style={{ width: '100%', height: '350px' }}>
        <ResponsiveContainer>
          <LineChart
            data={chartData}
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#444" />
            <XAxis
              dataKey="freq"
              type="number"
              scale="log"
              domain={[20, 20000]}
              ticks={[20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000]}
              tickFormatter={(value) => value >= 1000 ? `${value / 1000}k` : value.toString()}
              stroke="#999"
              label={{ value: '频率 (Hz)', position: 'insideBottomRight', offset: -10, style: { fill: '#999' } }}
            />
            <YAxis
              domain={yAxisDomain}
              stroke="#999"
              label={{ value: 'SPL (dB)', angle: -90, position: 'insideLeft', style: { fill: '#999' } }}
            />
            <Tooltip 
              formatter={(value) => `${parseFloat(value as string).toFixed(2)} dB`}
              labelFormatter={(label) => `${typeof label === 'number' ? label : String(label)} Hz`}
              contentStyle={{ backgroundColor: '#333', border: '1px solid #555' }}
            />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="original" 
              name="原始曲线" 
              stroke="#8884d8" 
              dot={false}
              strokeWidth={2}
            />
            <Line 
              type="monotone" 
              dataKey="processed" 
              name="处理后曲线" 
              stroke="#82ca9d" 
              dot={false} 
              strokeWidth={2}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      
      {/* 调试区域：显示生成的图像 */}
      {curveImageURL && (
        <div style={{ marginTop: '15px', border: '1px dashed #666', padding: '10px' }}>
          <h4 style={{ margin: '0 0 10px 0', color: '#e0e0e0' }}>生成的图像（用于LLM）</h4>
          <img 
            src={curveImageURL} 
            alt="频率响应曲线" 
            style={{ maxWidth: '100%', height: 'auto' }} 
          />
        </div>
      )}
    </div>
  );
};

export default FrequencyResponseChart;
