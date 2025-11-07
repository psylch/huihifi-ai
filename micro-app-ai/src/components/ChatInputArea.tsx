import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { v4 as uuidv4 } from 'uuid';
import {
  MentionedProduct,
  ProductSearchResult,
  RichContentSegment,
  UserMessagePayload,
} from '../types';
import { productService } from '../services';

interface ChatInputAreaProps {
  onSendMessage: (message: UserMessagePayload) => void;
  isLoading: boolean;
}

const DROPDOWN_ESTIMATED_HEIGHT = 220;

interface MentionDropdownPosition {
  left: number;
  downTop: number;
  upTop: number;
}

interface MentionState {
  active: boolean;
  query: string;
  position: MentionDropdownPosition;
  direction: 'up' | 'down';
}

const ZERO_WIDTH_SPACE = '\u200b';

const stripInvisibleChars = (value: string) => value.replace(/\u200b/g, '').replace(/\n/g, '');

const isMentionSegment = (
  segment: RichContentSegment,
): segment is RichContentSegment & { data: MentionedProduct } => segment.type === 'mention' && !!segment.data;

const ChatInputArea: React.FC<ChatInputAreaProps> = ({ onSendMessage, isLoading }) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const mentionRangeRef = useRef<Range | null>(null);
  const [segments, setSegments] = useState<RichContentSegment[]>([{ type: 'text', content: '' }]);
  const [mentionState, setMentionState] = useState<MentionState>({
    active: false,
    query: '',
    position: { left: 0, downTop: 0, upTop: 0 },
    direction: 'down',
  });
  const [suggestions, setSuggestions] = useState<ProductSearchResult[]>([]);
  const [highlightIndex, setHighlightIndex] = useState(0);
  const [isSearching, setIsSearching] = useState(false);
  const searchTimerRef = useRef<number | null>(null);
  const isComposingRef = useRef(false);

  const focusEditor = useCallback(() => {
    if (!editorRef.current) return;
    editorRef.current.focus();
  }, []);

  const resetEditor = useCallback(() => {
    setSegments([{ type: 'text', content: '' }]);
    mentionRangeRef.current = null;
    setMentionState({ active: false, query: '', position: { left: 0, downTop: 0, upTop: 0 }, direction: 'down' });
    setSuggestions([]);
    setHighlightIndex(0);
    if (editorRef.current) {
      editorRef.current.innerHTML = '';
      focusEditor();
    }
  }, [focusEditor]);

  const displayContent = useMemo(() => {
    return segments
      .map((segment) => {
        if (segment.type === 'mention') {
          return segment.data?.name ?? '';
        }
        return stripInvisibleChars(segment.content ?? '');
      })
      .join('');
  }, [segments]);

  const llmPayload = useMemo(() => {
    return segments
      .map((segment) => {
        if (segment.type === 'mention' && segment.data) {
          return `<user_selected_item>${JSON.stringify({
            name: segment.data.name,
            uuid: segment.data.uuid,
          })}</user_selected_item>`;
        }
        return stripInvisibleChars(segment.content ?? '');
      })
      .join('');
  }, [segments]);

  const mentions = useMemo(() => {
    return segments.filter(isMentionSegment).map((segment) => segment.data);
  }, [segments]);

  const hasContent = displayContent.trim().length > 0 || mentions.length > 0;

  const stopSearchTimer = () => {
    if (searchTimerRef.current) {
      window.clearTimeout(searchTimerRef.current);
      searchTimerRef.current = null;
    }
  };

  const runProductSearch = useCallback(
    (keyword: string) => {
      stopSearchTimer();
      searchTimerRef.current = window.setTimeout(async () => {
        setIsSearching(true);
        try {
          const result = await productService.searchProducts({ keyword, pageSize: 10 });
          setSuggestions(result.products);
          setHighlightIndex(0);
        } catch (error) {
          console.error('产品搜索失败，使用空列表：', error);
          setSuggestions([]);
        } finally {
          setIsSearching(false);
        }
      }, keyword ? 200 : 0);
    },
    [],
  );

  const traverseNodes = useCallback((nodes: NodeListOf<ChildNode>, collector: RichContentSegment[]) => {
    nodes.forEach((node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        const textContent = stripInvisibleChars(node.textContent ?? '');
        if (!textContent) {
          return;
        }
        const previous = collector[collector.length - 1];
        if (previous && previous.type === 'text') {
          previous.content = (previous.content ?? '') + textContent;
        } else {
          collector.push({ type: 'text', content: textContent });
        }
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        const element = node as HTMLElement;
        if (element.dataset?.mentionUuid && element.dataset?.mentionName) {
          const data: MentionedProduct = {
            id: element.dataset.mentionId || uuidv4(),
            name: element.dataset.mentionName,
            uuid: element.dataset.mentionUuid,
          };
          collector.push({ type: 'mention', data });
        } else if (element.tagName === 'BR') {
          const previous = collector[collector.length - 1];
          if (previous && previous.type === 'text') {
            previous.content = `${previous.content}\n`;
          } else {
            collector.push({ type: 'text', content: '\n' });
          }
        } else {
          traverseNodes(element.childNodes, collector);
        }
      }
    });
  }, []);

  const updateSegmentsFromEditor = useCallback(() => {
    if (!editorRef.current) return;
    const nextSegments: RichContentSegment[] = [];
    traverseNodes(editorRef.current.childNodes, nextSegments);
    if (nextSegments.length === 0) {
      setSegments([{ type: 'text', content: '' }]);
    } else {
      setSegments(nextSegments);
    }
  }, [traverseNodes]);

  const calculateMentionPosition = useCallback(
    (range: Range | null): { position: MentionDropdownPosition; direction: 'up' | 'down' } => {
      if (!range || !editorRef.current) {
        return {
          position: { left: 0, downTop: 0, upTop: 0 },
          direction: 'down',
        };
      }

      const rect = range.getBoundingClientRect();
      const editorRect = editorRef.current.getBoundingClientRect();
      const position: MentionDropdownPosition = {
        left: rect.left - editorRect.left,
        downTop: rect.bottom - editorRect.top + 6,
        upTop: Math.max(rect.top - editorRect.top - 6, 0),
      };

      const availableBelowViewport = Math.max(window.innerHeight - rect.bottom, 0);
      const availableAboveViewport = Math.max(rect.top, 0);
      const availableBelowInput = Math.max(editorRect.bottom - rect.bottom, 0);
      const availableAboveInput = Math.max(rect.top - editorRect.top, 0);

      const spaceBelow = Math.min(availableBelowViewport, availableBelowInput);
      const spaceAbove = Math.min(availableAboveViewport, availableAboveInput);

      let direction: 'up' | 'down' = 'down';
      if (spaceBelow < DROPDOWN_ESTIMATED_HEIGHT) {
        if (spaceAbove > spaceBelow || spaceBelow < 120) {
          direction = 'up';
        }
      }

      return {
        position,
        direction,
      };
    },
    [],
  );

  const resetMentionState = useCallback(() => {
    mentionRangeRef.current = null;
    setMentionState({
      active: false,
      query: '',
      position: { left: 0, downTop: 0, upTop: 0 },
      direction: 'down',
    });
    setSuggestions([]);
    setHighlightIndex(0);
  }, []);

  const detectMentionTrigger = useCallback(() => {
    if (isComposingRef.current) return;

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      resetMentionState();
      return;
    }

    const range = selection.getRangeAt(0);
    const focusNode = selection.focusNode;
    const focusOffset = selection.focusOffset;

    if (!focusNode) {
      resetMentionState();
      return;
    }

    if (focusNode.nodeType === Node.TEXT_NODE) {
      const text = focusNode.textContent ?? '';
      const uptoCursor = text.slice(0, focusOffset);
      const atIndex = uptoCursor.lastIndexOf('@');
      if (atIndex >= 0) {
        const charBefore = uptoCursor.charAt(atIndex - 1);
        if (atIndex === 0 || /\s/.test(charBefore)) {
          const query = uptoCursor.slice(atIndex + 1);
          const mentionRange = range.cloneRange();
          mentionRange.setStart(focusNode, atIndex);
          mentionRangeRef.current = mentionRange;
          const { position, direction } = calculateMentionPosition(mentionRange);
          setMentionState({ active: true, query, position, direction });
          runProductSearch(query);
          return;
        }
      }
    } else if (focusNode.nodeType === Node.ELEMENT_NODE) {
      // 如果光标恰好位于 mention span 后的文本节点开头
      const element = focusNode as HTMLElement;
      const childBefore = element.childNodes[focusOffset - 1];
      if (childBefore && childBefore.nodeType === Node.TEXT_NODE) {
        const textNode = childBefore as Text;
        const text = textNode.textContent ?? '';
        const atIndex = text.lastIndexOf('@');
        if (atIndex >= 0) {
          const mentionRange = range.cloneRange();
          mentionRange.setStart(textNode, atIndex);
          mentionRangeRef.current = mentionRange;
          const { position, direction } = calculateMentionPosition(mentionRange);
          setMentionState({ active: true, query: text.slice(atIndex + 1), position, direction });
          runProductSearch(text.slice(atIndex + 1));
          return;
        }
      }
    }

    resetMentionState();
  }, [calculateMentionPosition, resetMentionState, runProductSearch]);

  const insertMention = useCallback(
    (product: ProductSearchResult) => {
      const range = mentionRangeRef.current;
      if (!editorRef.current || !range) {
        return;
      }

      range.deleteContents();

      const mentionId = uuidv4();
      const span = document.createElement('span');
      span.className = 'mention-chip';
      span.textContent = product.title;
      span.contentEditable = 'false';
      span.dataset.mentionId = mentionId;
      span.dataset.mentionName = product.title;
      span.dataset.mentionUuid = product.uuid;

      const spacer = document.createTextNode(ZERO_WIDTH_SPACE);

      range.insertNode(span);
      if (span.parentNode) {
        span.parentNode.insertBefore(spacer, span.nextSibling);
      }

      const selection = window.getSelection();
      if (selection) {
        selection.removeAllRanges();
        const newRange = document.createRange();
        newRange.setStart(spacer, spacer.textContent?.length ?? 0);
        newRange.collapse(true);
        selection.addRange(newRange);
      }

      resetMentionState();
      updateSegmentsFromEditor();
    },
    [resetMentionState, updateSegmentsFromEditor],
  );

  const handleSendMessage = useCallback(() => {
    if (!hasContent || isLoading) {
      return;
    }

    const payload: UserMessagePayload = {
      displayContent,
      llmPayload,
      richContent: segments,
      mentions,
    };

    onSendMessage(payload);
    resetEditor();
  }, [displayContent, hasContent, isLoading, llmPayload, mentions, onSendMessage, resetEditor, segments]);

  const tryRemovePreviousMention = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || !selection.isCollapsed) {
      return false;
    }

    let focusNode = selection.focusNode;
    let focusOffset = selection.focusOffset;

    if (!focusNode) {
      return false;
    }

    if (focusNode.nodeType === Node.TEXT_NODE) {
      const textNode = focusNode as Text;
      if (focusOffset > 0) {
        const charBefore = textNode.textContent?.charAt(focusOffset - 1);
        if (charBefore === ZERO_WIDTH_SPACE) {
          textNode.deleteData(focusOffset - 1, 1);
          focusOffset -= 1;
        } else {
          return false;
        }
      }

      let previousNode: Node | null = textNode.previousSibling;
      while (previousNode && previousNode.nodeType === Node.TEXT_NODE && !(previousNode.textContent ?? '').trim()) {
        previousNode = previousNode.previousSibling;
      }

      if (previousNode instanceof HTMLElement && previousNode.dataset.mentionUuid) {
        previousNode.remove();
        updateSegmentsFromEditor();
        return true;
      }

      return false;
    }

    if (focusNode.nodeType === Node.ELEMENT_NODE) {
      const element = focusNode as HTMLElement;
      const previousNode = element.childNodes[focusOffset - 1];
      if (previousNode instanceof HTMLElement && previousNode.dataset.mentionUuid) {
        previousNode.remove();
        updateSegmentsFromEditor();
        return true;
      }
    }

    return false;
  }, [updateSegmentsFromEditor]);

  const handleInput = useCallback(() => {
    updateSegmentsFromEditor();
    detectMentionTrigger();
  }, [detectMentionTrigger, updateSegmentsFromEditor]);

  const handlePaste = useCallback((event: React.ClipboardEvent<HTMLDivElement>) => {
    event.preventDefault();
    const text = event.clipboardData.getData('text/plain');
    document.execCommand('insertText', false, text);
  }, []);

  useEffect(() => {
    return () => {
      stopSearchTimer();
    };
  }, []);

  const selectCurrentSuggestion = useCallback(() => {
    if (!mentionState.active || suggestions.length === 0) return;
    const target = suggestions[Math.max(0, Math.min(highlightIndex, suggestions.length - 1))];
    insertMention(target);
  }, [highlightIndex, insertMention, mentionState.active, suggestions]);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (mentionState.active) {
        if (event.key === 'ArrowDown') {
          event.preventDefault();
          setHighlightIndex((prev) => Math.min(prev + 1, Math.max(0, suggestions.length - 1)));
          return;
        }
        if (event.key === 'ArrowUp') {
          event.preventDefault();
          setHighlightIndex((prev) => Math.max(prev - 1, 0));
          return;
        }
        if (event.key === 'Enter') {
          event.preventDefault();
          selectCurrentSuggestion();
          return;
        }
        if (event.key === 'Escape') {
          event.preventDefault();
          resetMentionState();
          return;
        }
      }

      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        handleSendMessage();
        return;
      }

      if (event.key === 'Backspace') {
        const removed = tryRemovePreviousMention();
        if (removed) {
          event.preventDefault();
        }
      }
    },
    [
      handleSendMessage,
      mentionState.active,
      resetMentionState,
      selectCurrentSuggestion,
      suggestions.length,
      tryRemovePreviousMention,
    ],
  );

  const renderMentionDropdown = () => {
    if (!mentionState.active) {
      return null;
    }

    return (
      <div
        className="mention-dropdown"
        style={{
          position: 'absolute',
          left: mentionState.position.left,
          top: mentionState.direction === 'up' ? mentionState.position.upTop : mentionState.position.downTop,
          transform: mentionState.direction === 'up' ? 'translateY(calc(-100% - 8px))' : undefined,
          backgroundColor: 'var(--surface-light)',
          border: '1px solid rgba(255,255,255,0.15)',
          borderRadius: 8,
          boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
          width: 260,
          zIndex: 20,
          color: '#fff',
          padding: '8px 0',
          maxHeight: 280,
          overflowY: 'auto',
        }}
      >
        {isSearching && (
          <div style={{ padding: '6px 12px', fontSize: 12, opacity: 0.7 }}>搜索中...</div>
        )}
        {!isSearching && suggestions.length === 0 && (
          <div style={{ padding: '6px 12px', fontSize: 12, opacity: 0.7 }}>未找到匹配的产品</div>
        )}
        {suggestions.map((product, index) => {
          const isActive = index === highlightIndex;
          return (
            <div
              key={product.uuid}
              onMouseEnter={() => setHighlightIndex(index)}
              onMouseDown={(e) => {
                e.preventDefault();
                insertMention(product);
              }}
              style={{
                padding: '8px 12px',
                backgroundColor: isActive ? 'rgba(59,130,246,0.25)' : 'transparent',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                gap: 2,
              }}
            >
              <span style={{ fontSize: 14, fontWeight: 500 }}>{product.title}</span>
              <span style={{ fontSize: 12, opacity: 0.75 }}>
                {product.brand?.title ?? '未知品牌'} · {product.categoryName ?? '未分类'}
              </span>
            </div>
          );
        })}
      </div>
    );
  };

  const handleCompositionStart = () => {
    isComposingRef.current = true;
  };

  const handleCompositionEnd = () => {
    isComposingRef.current = false;
    handleInput();
  };

  return (
    <div
      className="chat-input-area"
      style={{ padding: '10px', backgroundColor: 'var(--surface-medium)', borderRadius: '8px', position: 'relative' }}
    >
      <div
        style={{
          display: 'flex',
          gap: '8px',
          alignItems: 'flex-end',
        }}
      >
        <div
          className="rich-text-input-wrapper"
          style={{
            flex: 1,
            position: 'relative',
            backgroundColor: 'var(--surface-light)',
            borderRadius: 6,
            border: '1px solid rgba(255,255,255,0.1)',
            minHeight: 44,
            padding: '10px 12px',
            fontSize: 14,
            lineHeight: 1.5,
          }}
          onClick={focusEditor}
        >
          <div
            ref={editorRef}
            className="rich-text-editor"
            contentEditable={!isLoading}
            role="textbox"
            aria-multiline="true"
            data-placeholder="请描述您想要的音效调整，使用 @ 精准选择耳机产品"
            onInput={handleInput}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            onCompositionStart={handleCompositionStart}
            onCompositionEnd={handleCompositionEnd}
            style={{
              whiteSpace: 'pre-wrap',
              outline: 'none',
              minHeight: 24,
            }}
          />
          {!hasContent && (
            <span
              style={{
                position: 'absolute',
                left: 12,
                top: 10,
                fontSize: 14,
                color: 'rgba(255,255,255,0.35)',
                pointerEvents: 'none',
              }}
            >
              请描述您想要的音效调整，使用 @ 精准选择耳机产品
            </span>
          )}
          <style>
            {`
              .mention-chip {
                display: inline-flex;
                align-items: center;
                background: rgba(59, 130, 246, 0.25);
                border: 1px solid rgba(59, 130, 246, 0.45);
                color: #9cc9ff;
                border-radius: 12px;
                padding: 0 8px;
                margin: 0 2px;
                font-size: 13px;
                line-height: 20px;
              }
            `}
          </style>
          {renderMentionDropdown()}
        </div>
        <button
          type="button"
          onClick={handleSendMessage}
          disabled={!hasContent || isLoading}
          style={{
            padding: '10px 20px',
            borderRadius: '6px',
            backgroundColor: !hasContent || isLoading ? '#555' : 'var(--primary-color)',
            cursor: !hasContent || isLoading ? 'not-allowed' : 'pointer',
            border: 'none',
            color: 'white',
            fontSize: '14px',
            transition: 'background-color 0.2s ease',
          }}
        >
          {isLoading ? '处理中...' : '发送'}
        </button>
      </div>
    </div>
  );
};

export default ChatInputArea;
