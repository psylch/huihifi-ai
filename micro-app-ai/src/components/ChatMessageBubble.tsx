

import React from 'react';
import { ChatMessage, FilterManipulation, FilterParams, SegmentCoverData } from '../types';
import AIManipulationCard from './AIManipulationCard';
import MentionChip from './MentionChip';
import SegmentCoverAction from './SegmentCoverAction';

interface ChatMessageBubbleProps {
  message: ChatMessage;
  addFilterFromLLM: (filterParams: FilterParams) => void;
  editFilterFromLLM: (filterId: string, filterParams: Partial<FilterParams>) => void;
  deleteFilterFromLLM: (filterId: string) => void;
  appliedFilters: FilterParams[];
  coverSegmentFromLLM?: (dataList: SegmentCoverData['data_list']) => void;
}

const ChatMessageBubble: React.FC<ChatMessageBubbleProps> = ({
  message,
  addFilterFromLLM,
  editFilterFromLLM,
  deleteFilterFromLLM,
  appliedFilters,
  coverSegmentFromLLM,
}) => {
  const { sender, content, manipulationActions, isStreaming, timestamp, error, richContent, segmentCoverAction } = message;
  
  // 添加日志记录，帮助诊断操作标签问题
  console.log(`渲染消息 ${message.id}:`, {
    hasManipulations: !!manipulationActions,
    manipulationCount: manipulationActions?.length,
    manipulations: manipulationActions
  });
  
  // 转换时间戳为可读格式
  const formattedTime = timestamp 
    ? new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : '';

  const renderUserRichContent = () => {
    if (!richContent || richContent.length === 0) {
      return content;
    }

    return richContent.map((segment, index) => {
      if (segment.type === 'mention' && segment.data) {
        return <MentionChip key={`${segment.data.id}-${index}`} product={segment.data} />;
      }
      return <React.Fragment key={`text-${index}`}>{segment.content}</React.Fragment>;
    });
  };
  
  return (
    <div 
      key={message.id} 
      style={{ 
        display: 'flex', 
        flexDirection: 'column',
        alignItems: sender === 'user' ? 'flex-end' : 'flex-start',
        marginBottom: '8px'
      }}
    >
      <div 
        className={`chat-message ${sender === 'user' ? 'user-message' : 'ai-message'} ${isStreaming ? 'streaming' : ''}`}
      >
        <style>
          {`
            .ai-manipulation-placeholder {
              display: inline-block;
              background: #eaf6ff;
              border: 1.5px dashed #2196f3;
              color: #1976d2;
              padding: 2px 8px;
              margin: 0 2px;
              border-radius: 5px;
              font-size: 0.95em;
              font-weight: 500;
              cursor: pointer;
            }
          `}
        </style>
        {sender === 'user' ? (
          <span className="user-message-content">{renderUserRichContent()}</span>
        ) : message.processedContent ? (
          <span
            className="ai-message-content"
            dangerouslySetInnerHTML={{ __html: message.processedContent }}
          />
        ) : (
          content
        )}
        
        {/* 显示错误信息（如果有） */}
        {error && (
          <div style={{ 
            marginTop: '8px', 
            color: '#d9534f', 
            backgroundColor: 'rgba(217, 83, 79, 0.1)',
            padding: '5px',
            borderRadius: '4px'
          }}>
            错误: {error}
          </div>
        )}
        
        {/* 显示时间戳 */}
        <div style={{ 
          fontSize: '10px', 
          opacity: 0.7, 
          textAlign: sender === 'user' ? 'right' : 'left',
          marginTop: '4px'
        }}>
          {formattedTime}
        </div>
      </div>
      
      {/* 渲染操作卡片（如果有） */}
      {manipulationActions && manipulationActions.length > 0 && (
        <div style={{ 
          alignSelf: sender === 'user' ? 'flex-end' : 'flex-start',
          width: '100%',
          maxWidth: '400px',
          marginTop: '4px'
        }}>
          {manipulationActions.map((manipulation: FilterManipulation, index: number) => (
            <AIManipulationCard
              key={`${message.id}-manip-${index}`}
              cardIndex={`${message.id}-manip-${index}`}
              manipulation={manipulation}
              addFilterFromLLM={addFilterFromLLM}
              editFilterFromLLM={editFilterFromLLM}
              deleteFilterFromLLM={deleteFilterFromLLM}
              appliedFilters={appliedFilters}
            />
          ))}
        </div>
      )}

      {segmentCoverAction && (
        <div
          style={{
            alignSelf: sender === 'user' ? 'flex-end' : 'flex-start',
            width: '100%',
            maxWidth: '420px',
            marginTop: '8px',
          }}
        >
          <SegmentCoverAction
            segmentData={segmentCoverAction}
            onApply={coverSegmentFromLLM ? (dataList) => coverSegmentFromLLM(dataList) : undefined}
          />
        </div>
      )}
    </div>
  );
};

export default ChatMessageBubble;
