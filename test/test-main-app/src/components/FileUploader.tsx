import React, { useState, useRef } from 'react';
import { useStore } from '../store/useStore';

const FileUploader: React.FC = () => {
  const { setOriginalData, setGlobalError, uiState } = useStore();
  const [dragActive, setDragActive] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // 处理文件上传事件
  const handleFileUpload = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    
    const file = files[0];
    setFileName(file.name);
    
    // 检查是否为JSON文件
    const isJsonFile = file.name.toLowerCase().endsWith('.json');
    console.log('文件类型:', file.type, '是JSON文件:', isJsonFile);
    
    // 使用FileReader读取文件内容
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        console.log('读取到文件内容长度:', content.length);
        console.log('文件内容前100字符:', content.substring(0, 100));
        
        // 尝试解析JSON
        const isLikelyJson = isJsonFile || 
                             (content.trim().startsWith('[') && content.trim().endsWith(']')) ||
                             (content.trim().startsWith('{') && content.trim().endsWith('}'));
        
        console.log('是否可能是JSON格式:', isLikelyJson);
        
        if (isLikelyJson) {
          try {
            // 尝试解析JSON
            console.log('尝试解析JSON...');
            const jsonData = JSON.parse(content);
            console.log('JSON解析成功, 数据类型:', typeof jsonData, Array.isArray(jsonData) ? '是数组' : '不是数组');
            
            if (Array.isArray(jsonData)) {
              console.log('JSON数组长度:', jsonData.length);
              console.log('第一项类型:', typeof jsonData[0], Array.isArray(jsonData[0]) ? '是数组' : '不是数组');
              
              // 处理不同的JSON数组格式
              let formattedData: [string, string][];
              
              // 如果是二维数组格式
              if (jsonData.length > 0 && Array.isArray(jsonData[0])) {
                console.log('检测到二维数组格式');
                
                // 确保每行都有两个元素
                const hasValidRows = jsonData.every(row => Array.isArray(row) && row.length >= 2);
                console.log('所有行都有至少两个元素:', hasValidRows);
                
                if (!hasValidRows) {
                  throw new Error('JSON数组中存在无效行，每行必须有至少两个元素');
                }
                
                // 获取前两列的数据
                formattedData = jsonData.map(row => [String(row[0]), String(row[1])] as [string, string]);
                
                // 检查第一行是否是标题行
                const firstRow = formattedData[0];
                const hasHeader = firstRow[0] === 'Freq(Hz)' || 
                                 firstRow[0] === 'Frequency(Hz)' || 
                                 firstRow[0] === 'Frequency' || 
                                 firstRow[0].toLowerCase().includes('freq');
                
                console.log('检测到标题行:', hasHeader, '第一行:', firstRow);
                
                // 如果没有标题行，添加一个
                if (!hasHeader) {
                  console.log('添加标题行');
                  formattedData = [['Freq(Hz)', 'SPL(dB)'], ...formattedData];
                }
              } 
              // 如果是包含x,y值的对象数组格式 [{x: 20, y: 10}, ...]
              else if (jsonData.length > 0 && typeof jsonData[0] === 'object' && !Array.isArray(jsonData[0])) {
                console.log('检测到对象数组格式');
                
                // 尝试查找x/y, freq/db 或其他可能的键名
                const firstItem = jsonData[0] as any;
                const keys = Object.keys(firstItem);
                console.log('对象键:', keys);
                
                let freqKey = keys.find(k => 
                  k.toLowerCase().includes('freq') || 
                  k.toLowerCase() === 'x' || 
                  k.toLowerCase() === 'hz');
                
                let dbKey = keys.find(k => 
                  k.toLowerCase().includes('db') || 
                  k.toLowerCase().includes('spl') || 
                  k.toLowerCase() === 'y' ||
                  k.toLowerCase() === 'level');
                
                if (!freqKey || !dbKey) {
                  if (keys.length >= 2) {
                    // 假设第一个是频率，第二个是SPL
                    freqKey = keys[0];
                    dbKey = keys[1];
                    console.log('使用默认键映射:', freqKey, '->', 'freq', dbKey, '->', 'db');
                  } else {
                    throw new Error('无法确定频率和SPL键');
                  }
                }
                
                // 转换为二维数组格式
                formattedData = [
                  ['Freq(Hz)', 'SPL(dB)'],
                  ...jsonData.map(item => [String((item as any)[freqKey!]), String((item as any)[dbKey!])] as [string, string])
                ];
              } else {
                throw new Error('不支持的JSON数组格式');
              }
              
              console.log('最终数据格式示例 (前3行):', formattedData.slice(0, 3));
              
              // 确保数据有至少2行（标题 + 至少1个数据点）
              if (formattedData.length < 2) {
                throw new Error('数据必须至少包含标题行和一个数据点');
              }
              
              // 设置原始数据
              setOriginalData(formattedData);
              setGlobalError(null);
              console.log('成功设置JSON数据');
              return;
            } else {
              console.error('JSON不是数组格式');
              throw new Error('JSON必须是数组格式');
            }
          } catch (jsonError) {
            console.error('JSON解析或处理错误:', jsonError);
            setGlobalError(`JSON解析错误: ${(jsonError as Error).message || '格式无效'}`);
          }
        } else {
          console.log('不是JSON格式，尝试使用文本解析器');
        }
        
        // 如果JSON解析失败或不是JSON格式，回退到文本解析
        console.log('尝试使用文本解析器');
        const parsedData = parseFrequencyResponseData(content);
        if (parsedData && parsedData.length > 0) {
          console.log('文本解析成功，数据行数:', parsedData.length);
          console.log('文本解析数据示例 (前3行):', parsedData.slice(0, 3));
          setOriginalData(parsedData);
          setGlobalError(null);
        } else {
          console.error('文本解析失败，无有效数据');
          setGlobalError('无法解析文件。请确保它包含有效的频率响应数据，可以是JSON格式或CSV/TXT格式。');
        }
      } catch (error) {
        console.error('文件处理过程中发生错误:', error);
        setGlobalError(`文件解析错误: ${(error as Error).message || '未知错误'}`);
      }
    };
    
    reader.onerror = () => {
      console.error('FileReader错误');
      setGlobalError('读取文件时发生错误。请尝试另一个文件。');
    };
    
    console.log('开始读取文件...');
    reader.readAsText(file);
  };
  
  // 处理文件拖拽事件
  const handleDrag = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };
  
  // 处理文件拖放事件
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files) {
      handleFileUpload(e.dataTransfer.files);
    }
  };
  
  // 处理文件输入事件
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    handleFileUpload(e.target.files);
  };
  
  // 处理点击上传区域事件
  const handleClick = () => {
    fileInputRef.current?.click();
  };

  // 处理加载演示数据
  const handleLoadDemo = () => {
    // 演示数据 - 频率(Hz)和分贝(dB)对，包含标题行
    const demoData: [string, string][] = [
      ['Freq(Hz)', 'SPL(dB)'],
      ['20', '0'], ['30', '0.5'], ['40', '1'], ['50', '1.2'], ['60', '1.5'],
      ['70', '1.7'], ['80', '1.9'], ['90', '2'], ['100', '2.2'], ['200', '2.5'],
      ['300', '2.3'], ['400', '2'], ['500', '1.5'], ['600', '1'], ['700', '0.5'],
      ['800', '0'], ['900', '-0.5'], ['1000', '-1'], ['2000', '-2'], ['3000', '-1'],
      ['4000', '0'], ['5000', '1'], ['6000', '2'], ['7000', '3'], ['8000', '4'],
      ['9000', '3'], ['10000', '2'], ['12000', '1'], ['14000', '0'], ['16000', '-1'],
      ['18000', '-2'], ['20000', '-3']
    ];
    
    setOriginalData(demoData);
    setGlobalError(null);
    setFileName('演示数据');
  };
  
  return (
    <div className="card" style={{ opacity: uiState.isUploadMinimized ? 0.7 : 1 }}>
      <h2>上传频率响应数据</h2>
      
      {/* 拖放上传区域 */}
      <div 
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={handleClick}
        style={{
          border: `2px dashed ${dragActive ? 'var(--primary-color)' : '#555'}`,
          borderRadius: '5px',
          padding: '40px 20px',
          textAlign: 'center',
          cursor: 'pointer',
          margin: '20px 0',
          backgroundColor: dragActive ? 'rgba(25, 118, 210, 0.08)' : 'var(--surface-light)',
          transition: 'all 0.3s'
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".txt,.csv,.json"
          onChange={handleChange}
          style={{ display: 'none' }}
          id="file-upload-input"
        />
        
        <div>
          <p style={{ marginBottom: '15px' }}>
            {fileName ? `已选择: ${fileName}` : '拖放文件到此处或点击选择'}
          </p>
          <p style={{ fontSize: '0.9rem', color: '#888' }}>
            支持格式: JSON, TXT或CSV格式的频率响应数据<br />
            JSON格式: [["Freq(Hz)", "SPL(dB)"], ["20", "96.91"], ...] <br />
            文本格式: 每行包含频率(Hz)和分贝(dB)值，用逗号或制表符分隔
          </p>
        </div>
      </div>
      
      {/* 演示数据按钮 */}
      <div style={{ textAlign: 'center', marginTop: '10px' }}>
        <button 
          onClick={handleLoadDemo}
          style={{ backgroundColor: '#555' }}
        >
          加载演示数据
        </button>
      </div>
    </div>
  );
};

// 辅助函数：解析频率响应数据 (仅用于文本格式，JSON格式在上传函数中直接处理)
const parseFrequencyResponseData = (content: string): [string, string][] => {
  try {
    // 注意：上传函数中已经处理了JSON格式的特殊情况，这里只处理文本格式
    
    // 按行分割文本
    const lines = content.trim().split(/\r?\n/);
    
    // 解析每一行
    const parsedData = lines.map(line => {
      // 尝试使用逗号、制表符或空格作为分隔符
      const parts = line.trim().split(/[,\t ]+/);
      
      // 我们期望至少有两个值：频率和分贝
      if (parts.length < 2) return null;
      
      // 检查解析的值是否为有效数字
      const freq = parseFloat(parts[0]);
      const db = parseFloat(parts[1]);
      
      if (isNaN(freq) || isNaN(db)) return null;
      
      // 返回[频率, 分贝]对
      return [parts[0], parts[1]];
    }).filter(Boolean) as [string, string][];
    
    // 如果解析成功，添加标题行
    if (parsedData.length > 0) {
      return [['Freq(Hz)', 'SPL(dB)'], ...parsedData];
    }
    
    return parsedData;
  } catch (error) {
    console.error('解析数据时出错:', error);
    return [];
  }
};

export default FileUploader;
