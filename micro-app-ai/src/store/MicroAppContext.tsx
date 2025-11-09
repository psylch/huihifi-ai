import React, { createContext, useContext, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import {
  FilterParams,
  FilterManipulation,
  ChatMessage,
  FrequencyResponseData,
  UserMessagePayload,
  SegmentCoverData,
} from '../types';

// 创建上下文接口
interface MicroAppContextType {
  // 数据
  originalDataSource: FrequencyResponseData | null;
  appliedFilters: FilterParams[];
  currentProcessedCurve: FrequencyResponseData | null;
  currentCurveImageDataURL: string | null; // 曲线图的图像数据URL
  chatHistory: ChatMessage[];
  isLoadingLLM: boolean;
  userToken: string | null; // 添加userToken

  // 动作
  addUserMessage: (payload: UserMessagePayload) => void;
  addEmptyStreamingAIMessage: (messageId?: string) => string;
  appendChunkToAIMessage: (messageId: string, chunk: string) => void;
  finalizeAIMessage: (
    messageId: string,
    fullContent: string,
    manipulations?: FilterManipulation[],
    extraContent?: { rawContent?: string; processedContent?: string; segmentCover?: SegmentCoverData | null }
  ) => void;
  setAIMessageError: (messageId: string, error: string) => void;
  setLoadingLLM: (isLoading: boolean) => void;
  setCurrentCurveImageDataURL: (dataURL: string | null) => void; // 添加设置图像URL的方法
  
  // 从主应用获取的回调
  addFilterFromLLM: (params: FilterManipulation['filterParams']) => void;
  editFilterFromLLM: (id: string, params: FilterManipulation['filterParams']) => boolean;
  deleteFilterFromLLM: (id: string) => boolean;
  coverSegmentFromLLM?: (data: SegmentCoverData) => void;
}

// 创建上下文
const MicroAppContext = createContext<MicroAppContextType | null>(null);

// 上下文提供者组件
interface StoreProviderProps {
  children: React.ReactNode;
  sharedData: {
    originalDataSource: FrequencyResponseData | null;
    appliedFilters: FilterParams[];
    currentProcessedCurve: FrequencyResponseData | null;
    // 移除 currentCurveImageDataURL，由微应用内部管理
  };
  callbacks: {
    addFilterFromLLM: (filterParams: FilterManipulation['filterParams']) => void;
    editFilterFromLLM: (filterId: string, filterParams: FilterManipulation['filterParams']) => boolean;
    deleteFilterFromLLM: (filterId: string) => boolean;
    coverSegmentFromLLM?: (data: SegmentCoverData) => void;
  };
  userToken?: string; // 添加userToken参数
}

export const StoreProvider: React.FC<StoreProviderProps> = ({ children, sharedData, callbacks, userToken }) => {
  // 聊天历史状态
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  // AI加载状态
  const [isLoadingLLM, setIsLoadingLLM] = useState(false);
  // 曲线图图像数据URL - 仅在微应用内部管理，初始化为 null
  const [currentCurveImageDataURL, setCurrentCurveImageDataURL] = useState<string | null>(null);

  // 添加用户消息
  const addUserMessage = (payload: UserMessagePayload) => {
    const newMessage: ChatMessage = {
      id: uuidv4(),
      content: payload.displayContent,
      sender: 'user',
      timestamp: Date.now(),
      richContent: payload.richContent,
      mentions: payload.mentions,
    };
    setChatHistory(prev => [...prev, newMessage]);
  };

  // 添加空的AI消息流
  const addEmptyStreamingAIMessage = (messageId?: string) => {
    const newMessageId = messageId || uuidv4();
    const newMessage: ChatMessage = {
      id: newMessageId,
      content: '',
      sender: 'ai',
      isStreaming: true,
      timestamp: Date.now()
    };
    setChatHistory(prev => [...prev, newMessage]);
    return newMessageId;
  };

  // 将内容块添加到AI消息中
  const appendChunkToAIMessage = (messageId: string, chunk: string) => {
    setChatHistory(prev => prev.map(msg =>
      msg.id === messageId ? { ...msg, content: msg.content + chunk, isStreaming: true } : msg
    ));
  };

  // 完成AI消息
  const finalizeAIMessage = (
    messageId: string,
    fullContent: string,
    manipulations?: FilterManipulation[],
    extraContent?: { rawContent?: string; processedContent?: string; segmentCover?: SegmentCoverData | null }
  ) => {
    console.log('完成AI消息:', messageId);
    console.log('完整内容:', fullContent);
    console.log('要附加的操作:', manipulations);
    
    setChatHistory(prev => {
      const updatedHistory = prev.map(msg =>
        msg.id === messageId 
        ? { 
            ...msg, 
            content: fullContent,
            manipulationActions: manipulations, 
            isStreaming: false,
            rawContent: extraContent?.rawContent,
            processedContent: extraContent?.processedContent,
            segmentCoverAction: extraContent?.segmentCover || undefined,
          } 
        : msg
      );
      
      console.log('聊天历史中的更新消息:', updatedHistory.find(msg => msg.id === messageId));
      return updatedHistory;
    });
  };

  // 设置AI消息错误
  const setAIMessageError = (messageId: string, errorText: string) => {
    setChatHistory(prev => prev.map(msg =>
      msg.id === messageId ? { ...msg, error: errorText, isStreaming: false, content: msg.content || "接收响应时发生错误。" } : msg
    ));
  };

  // 组合上下文值
  const contextValue: MicroAppContextType = {
    // 数据
    originalDataSource: sharedData.originalDataSource,
    appliedFilters: sharedData.appliedFilters,
    currentProcessedCurve: sharedData.currentProcessedCurve,
    currentCurveImageDataURL,
    chatHistory,
    isLoadingLLM,
    userToken: userToken || null, // 传递userToken
    
    // 动作
    addUserMessage,
    addEmptyStreamingAIMessage,
    appendChunkToAIMessage,
    finalizeAIMessage,
    setAIMessageError,
    setLoadingLLM: setIsLoadingLLM,
    setCurrentCurveImageDataURL,
    
    // 主应用回调
    addFilterFromLLM: callbacks.addFilterFromLLM,
    editFilterFromLLM: callbacks.editFilterFromLLM,
    deleteFilterFromLLM: callbacks.deleteFilterFromLLM,
    coverSegmentFromLLM: callbacks.coverSegmentFromLLM,
  };

  return (
    <MicroAppContext.Provider value={contextValue}>
      {children}
    </MicroAppContext.Provider>
  );
};

// 创建自定义钩子以便于使用上下文
export const useMicroAppContext = () => {
  const context = useContext(MicroAppContext);
  if (!context) {
    throw new Error('useMicroAppContext必须在StoreProvider内部使用');
  }
  return context;
};
