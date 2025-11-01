// import React from 'react';
// import { useMicroAppContext } from '../store/MicroAppContext';
// import useStreamingLLM from '../hooks/useStreamingLLM';
// import ChatHistoryDisplay from './ChatHistoryDisplay';
// import ChatInputArea from './ChatInputArea';

// const AIAssistant: React.FC = () => {
//   // 从上下文中获取所需数据和方法
//   const { 
//     chatHistory,
//     appliedFilters,
//     isLoadingLLM,
//     addFilterFromLLM,
//     editFilterFromLLM,
//     deleteFilterFromLLM,
//     currentCurveImageDataURL
//   } = useMicroAppContext();
  
//   const { sendMessageToLLM } = useStreamingLLM();

//   // 添加流式输出的样式
//   React.useEffect(() => {
//     if (!document.getElementById('streaming-style')) {
//       const style = document.createElement('style');
//       style.id = 'streaming-style';
//       style.textContent = `
//         @keyframes blink {
//           0% { opacity: 0.3; }
//           50% { opacity: 1; }
//           100% { opacity: 0.3; }
//         }
//         .chat-message.streaming {
//           position: relative;
//         }
//         .chat-message.streaming:empty::after {
//           content: "AI思考中...";
//           animation: blink 1.5s infinite;
//           color: #888;
//         }
//         .chat-message.streaming:not(:empty)::after {
//           content: "_";
//           display: inline-block;
//           animation: blink 1s infinite;
//           margin-left: 2px;
//         }
//       `;
//       document.head.appendChild(style);
//     }
    
//     return () => {
//       const styleElement = document.getElementById('streaming-style');
//       if (styleElement) {
//         styleElement.remove();
//       }
//     };
//   }, []);

//   return (
//     <div className="micro-app-ai-container">
//       {/* <h2>AI助手</h2> */}
      
//       {/* 聊天历史显示组件 */}
//       <ChatHistoryDisplay 
//         chatHistory={chatHistory}
//         isLoadingLLM={isLoadingLLM}
//         addFilterFromLLM={addFilterFromLLM}
//         editFilterFromLLM={editFilterFromLLM}
//         deleteFilterFromLLM={deleteFilterFromLLM}
//         appliedFilters={appliedFilters}
//       />
      
//       {/* 聊天输入区域组件 */}
//       <ChatInputArea 
//         onSendMessage={(userInput) => sendMessageToLLM(userInput, currentCurveImageDataURL)}
//         isLoading={isLoadingLLM}
//       />
//     </div>
//   );
// };

// export default AIAssistant;

import React, { useState, useEffect } from 'react';
import { useMicroAppContext } from '../store/MicroAppContext';
import useStreamingLLM from '../hooks/useStreamingLLM';
import ChatHistoryDisplay from './ChatHistoryDisplay';
import ChatInputArea from './ChatInputArea';
import CurveImageDisplay from './CurveImageDisplay';

interface UsageInfo {
  used: number;
  remaining: number;
  limit: number;
  date: string;
}

const AIAssistant: React.FC = () => {
  // 从上下文中获取所需数据和方法
  const { 
    chatHistory,
    appliedFilters,
    isLoadingLLM,
    addFilterFromLLM,
    editFilterFromLLM,
    deleteFilterFromLLM,
    currentCurveImageDataURL,
    userToken
  } = useMicroAppContext();
  
  const { sendMessageToLLM } = useStreamingLLM();
  
  // 使用次数状态
  const [usageInfo, setUsageInfo] = useState<UsageInfo | null>(null);
  const [usageLoading, setUsageLoading] = useState(false);
  const [usageError, setUsageError] = useState<string | null>(null);

  // 获取用户使用情况
  const fetchUsageInfo = async () => {
    if (!userToken) return;
    
    setUsageLoading(true);
    setUsageError(null);
    
    try {
      const response = await fetch(`https://ai.huihifi.com/api/aituning/usage/${encodeURIComponent(userToken)}`);
      if (response.ok) {
        const data = await response.json();
        setUsageInfo(data);
      } else {
        const errorData = await response.json().catch(() => ({}));
        setUsageError(errorData.error || '获取使用信息失败');
      }
    } catch (error) {
      console.error('获取使用信息失败:', error);
      setUsageError('网络错误');
    } finally {
      setUsageLoading(false);
    }
  };

  // 组件加载时获取使用情况
  useEffect(() => {
    fetchUsageInfo();
  }, [userToken]);

  // 监听聊天历史变化，当有新的AI消息时刷新使用情况
  useEffect(() => {
    const lastMessage = chatHistory[chatHistory.length - 1];
    if (lastMessage && lastMessage.sender === 'ai' && !lastMessage.isStreaming) {
      // AI消息完成后，延迟一点刷新使用情况
      setTimeout(fetchUsageInfo, 1000);
    }
  }, [chatHistory]);

  // 渲染使用次数显示
  const renderUsageDisplay = () => {
    if (!userToken) {
      return (
        <div style={{
          padding: '8px 12px',
          backgroundColor: 'var(--surface-light)',
          borderRadius: '6px',
          marginBottom: '12px',
          fontSize: '14px',
          color: '#666',
          textAlign: 'center'
        }}>
          演示模式 - 无使用限制
        </div>
      );
    }

    if (usageLoading) {
      return (
        <div style={{
          padding: '8px 12px',
          backgroundColor: 'var(--surface-light)',
          borderRadius: '6px',
          marginBottom: '12px',
          fontSize: '14px',
          color: '#666',
          textAlign: 'center'
        }}>
          加载使用信息...
        </div>
      );
    }

    if (usageError) {
      return (
        <div style={{
          padding: '8px 12px',
          backgroundColor: '#ffebee',
          borderRadius: '6px',
          marginBottom: '12px',
          fontSize: '14px',
          color: '#c62828',
          textAlign: 'center',
          cursor: 'pointer'
        }}
        onClick={fetchUsageInfo}
        title="点击重新获取"
        >
          {usageError} (点击重试)
        </div>
      );
    }

    if (usageInfo) {
      const isLimitReached = usageInfo.remaining <= 0;
      const isWarning = usageInfo.remaining <= 2;
      
      return (
        <div style={{
          padding: '8px 12px',
          backgroundColor: isLimitReached ? '#ffebee' : isWarning ? '#fff3e0' : '#e8f5e8',
          borderRadius: '6px',
          marginBottom: '12px',
          fontSize: '14px',
          textAlign: 'center',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span style={{ 
            color: isLimitReached ? '#c62828' : isWarning ? '#ef6c00' : '#2e7d32',
            fontWeight: '500'
          }}>
            今日剩余: {usageInfo.remaining}/{usageInfo.limit}
          </span>
          <button
            type="button"
            onClick={fetchUsageInfo}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '2px 6px',
              borderRadius: '3px',
              fontSize: '12px',
              color: '#666',
              opacity: 0.7
            }}
            title="刷新使用情况"
          >
            🔄
          </button>
        </div>
      );
    }

    return null;
  };

  // 添加流式输出的样式
  React.useEffect(() => {
    if (!document.getElementById('streaming-style')) {
      const style = document.createElement('style');
      style.id = 'streaming-style';
      style.textContent = `
        @keyframes blink {
          0% { opacity: 0.3; }
          50% { opacity: 1; }
          100% { opacity: 0.3; }
        }
        .chat-message.streaming {
          position: relative;
        }
        .chat-message.streaming:empty::after {
          content: "AI思考中...";
          animation: blink 1.5s infinite;
          color: #888;
        }
        .chat-message.streaming:not(:empty)::after {
          content: "_";
          display: inline-block;
          animation: blink 1s infinite;
          margin-left: 2px;
        }
      `;
      document.head.appendChild(style);
    }
    
    return () => {
      const styleElement = document.getElementById('streaming-style');
      if (styleElement) {
        styleElement.remove();
      }
    };
  }, []);

  return (
    <div className="micro-app-ai-container">
      {/* <h2>AI助手</h2> */}

      {/* 隐藏的图片生成器 - 确保AI始终有图片数据 */}
      <div style={{ display: 'none' }}>
        <CurveImageDisplay />
      </div>
      
      {/* 使用次数显示 */}
      {renderUsageDisplay()}
      
      {/* 聊天历史显示组件 */}
      <ChatHistoryDisplay 
        chatHistory={chatHistory}
        isLoadingLLM={isLoadingLLM}
        addFilterFromLLM={addFilterFromLLM}
        editFilterFromLLM={editFilterFromLLM}
        deleteFilterFromLLM={deleteFilterFromLLM}
        appliedFilters={appliedFilters}
      />
      
      {/* 聊天输入区域组件 */}
      <ChatInputArea 
        onSendMessage={(userInput) => sendMessageToLLM(userInput, currentCurveImageDataURL)}
        isLoading={isLoadingLLM}
      />
    </div>
  );
};

export default AIAssistant;