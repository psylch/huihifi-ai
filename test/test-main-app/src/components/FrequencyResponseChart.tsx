import React, { useRef, useEffect, useState } from 'react';
import { useStore } from '../store/useStore';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { generateCurveImage } from '../utils/curveImageGenerator';

const FrequencyResponseChart: React.FC = () => {
  const { originalDataSource, currentProcessedCurve, setCurrentCurveImageDataURL } = useStore();
  const chartRef = useRef<HTMLDivElement>(null);
  const [chartData, setChartData] = useState<any[]>([]);
  const [yAxisDomain, setYAxisDomain] = useState<[number, number]>([-20, 20]);
  
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

  // 生成图表图像并保存到store中 - 与渲染解耦
  useEffect(() => {
    // 不再依赖DOM，直接从原始数据生成图片
    if (!originalDataSource || originalDataSource.length < 2) return;
    
    try {
      // 使用独立的图片生成器，直接基于数据生成图片
      // 这完全解耦了DOM渲染和图片生成过程
      const imageDataURL = generateCurveImage(
        originalDataSource,
        currentProcessedCurve,
        {
          // 可选配置
          width: 800, 
          height: 400,
          backgroundColor: '#1e1e1e',
          originalLineColor: '#8884d8', // 原始曲线颜色
          processedLineColor: '#82ca9d' // 处理后曲线颜色
        }
      );
      
      // 更新store中的图像URL
      setCurrentCurveImageDataURL(imageDataURL);
      console.log('已生成独立的曲线图像，完全不依赖DOM渲染');
    } catch (err) {
      console.error('生成图表图像时出错:', err);
    }
  }, [originalDataSource, currentProcessedCurve, setCurrentCurveImageDataURL]);

  if (!originalDataSource || chartData.length === 0) {
    return <div className="card">无数据可显示。请上传频率响应数据。</div>;
  }

  return (
    <div className="card">
      <h2>频率响应曲线</h2>
      <div ref={chartRef} style={{ width: '100%', height: '400px' }}>
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
    </div>
  );
};

export default FrequencyResponseChart;
