import React, { useState, useRef, useEffect } from 'react';

interface ChatInputAreaProps {
  onSendMessage: (message: string) => void;
  isLoading: boolean;
}

const ChatInputArea: React.FC<ChatInputAreaProps> = ({ onSendMessage, isLoading }) => {
  const [input, setInput] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 调整文本区域高度
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [input]);

  // 处理发送消息
  const handleSendMessage = () => {
    if (input.trim() && !isLoading) {
      onSendMessage(input.trim());
      setInput('');
    }
  };

  // 处理键盘事件（按Enter发送消息）
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // 常用问题快捷按钮 - 已注释，仅用于调试
  /*
  const quickQuestions = [
    '如何增强低音效果？',
    '声音太刺耳，如何改善？',
    '我想让人声更清晰'
  ];
  */

  return (
    <div className="chat-input-area" style={{ padding: '10px', backgroundColor: 'var(--surface-medium)', borderRadius: '8px' }}>
      {/* 常用问题快捷按钮 - 已注释，仅用于调试 */}
      {/*
      <div style={{ marginBottom: '10px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {quickQuestions.map((question, index) => (
          <button
            key={index}
            onClick={() => setInput(question)}
            disabled={isLoading}
            style={{ 
              fontSize: '12px', 
              padding: '4px 8px',
              backgroundColor: 'var(--surface-light)',
              border: '1px solid #666',
              borderRadius: '12px'
            }}
          >
            {question}
          </button>
        ))}
      </div>
      */}
      
      {/* 输入区域 */}
      <div style={{ display: 'flex', gap: '8px' }}>
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="请描述您想要的音效调整..."
          disabled={isLoading}
          style={{
            flex: 1,
            minHeight: '40px',
            maxHeight: '120px',
            resize: 'none',
            padding: '10px',
            backgroundColor: 'var(--surface-light)',
            color: 'white',
            border: '1px solid #666',
            borderRadius: '4px',
            fontFamily: 'inherit',
            fontSize: '14px'
          }}
        />
        
        {/* 发送按钮 */}
        <button 
          type="button"
          onClick={handleSendMessage}
          disabled={!input.trim() || isLoading}
          style={{
            padding: '10px 20px',
            borderRadius: '4px',
            backgroundColor: isLoading ? '#555' : 'var(--primary-color)',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            border: 'none',
            color: 'white',
            fontSize: '14px'
          }}
        >
          {isLoading ? '处理中...' : '发送'}
        </button>
      </div>
    </div>
  );
};

export default ChatInputArea;
