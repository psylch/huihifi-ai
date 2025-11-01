import React, { useRef, useEffect } from 'react';
import { ChatMessage, FilterManipulation, FilterParams } from '../types';
import ChatMessageBubble from './ChatMessageBubble';

interface ChatHistoryDisplayProps {
  chatHistory: ChatMessage[];
  isLoadingLLM: boolean;
  addFilterFromLLM: (params: FilterManipulation['filterParams']) => void;
  editFilterFromLLM: (id: string, params: FilterManipulation['filterParams']) => boolean;
  deleteFilterFromLLM: (id: string) => boolean;
  appliedFilters: FilterParams[];
}

const ChatHistoryDisplay: React.FC<ChatHistoryDisplayProps> = ({
  chatHistory,
  isLoadingLLM,
  addFilterFromLLM,
  editFilterFromLLM,
  deleteFilterFromLLM,
  appliedFilters
}) => {
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // 自动滚动到最新消息
  useEffect(() => {
    if (chatContainerRef.current) {
      const element = chatContainerRef.current;
      element.scrollTop = element.scrollHeight;
    }
  }, [chatHistory]);

  

  // 渲染单个消息
  const renderMessage = (message: ChatMessage) => {
    return (
      <ChatMessageBubble
        key={message.id}
        message={message}
        addFilterFromLLM={addFilterFromLLM}
        editFilterFromLLM={editFilterFromLLM}
        deleteFilterFromLLM={deleteFilterFromLLM}
        appliedFilters={appliedFilters}
      />
    );
  };

  return (
    <div
      ref={chatContainerRef}
      className="chat-history-container"
      style={{ 
        height: '60vh', 
        overflowY: 'auto', 
        padding: '10px',
        backgroundColor: 'var(--surface-medium)',
        borderRadius: '8px',
        marginBottom: '16px'
      }}
    >
      <div className="chat-container">
        {/* 欢迎消息 */}
        {chatHistory.length === 0 && (
          <div className="chat-message ai-message">
            <p>👋 您好！我是AI HiFi调音助手，可以帮助您：</p>
            <ul>
              <li>根据您的描述添加适当的滤波器</li>
              <li>修改现有滤波器的参数</li>
              <li>删除不需要的滤波器</li>
              <li>就音频调节提供建议</li>
            </ul>
            <p>请告诉我您希望调节的音频效果，比如"增强低音"或"减少4kHz的刺耳感"。</p>
          </div>
        )}

        {/* 渲染聊天历史 */}
        {chatHistory.map(renderMessage)}
        
        {/* 加载指示器 */}
        {isLoadingLLM && chatHistory.length > 0 && !chatHistory[chatHistory.length - 1].isStreaming && (
          <div className="chat-message ai-message streaming"></div>
        )}
      </div>
    </div>
  );
};

export default ChatHistoryDisplay;
