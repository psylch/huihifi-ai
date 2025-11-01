// 滤波器类型
export type FilterType = 'peaking' | 'low_shelf' | 'high_shelf' | 'lowpass' | 'highpass';

// 滤波器参数接口
export interface FilterParams {
  id: string;
  type: FilterType;
  freq: number;
  gain?: number;
  qFactor?: number;
};

// 滤波器操作接口 - 来自LLM的操作指令
export interface FilterManipulation {
  manipulationType: 'add' | 'edit' | 'delete';
  filterId?: string; // 用于编辑和删除操作
  filterParams?: {
    filterType?: FilterType;
    freq?: number;
    gain?: number;
    qFactor?: number;
  }; // 用于添加和编辑操作
}

// 聊天消息接口
export interface ChatMessage {
  id: string;
  content: string;
  sender: 'user' | 'ai';
  manipulationActions?: FilterManipulation[];
  timestamp: number;
  isStreaming?: boolean;
  error?: string;
  rawContent?: string; // 含操作标签的原始内容
  processedContent?: string; // 替换为占位符的内容
}

// 频率响应数据类型
export type FrequencyResponseDataPoint = [string, string]; // [频率, 响应值]，以字符串形式存储以便于解析
export type FrequencyResponseData = FrequencyResponseDataPoint[];

// 全局类型定义
declare global {
  interface Window {
    __POWERED_BY_QIANKUN__?: boolean;
  }
}
