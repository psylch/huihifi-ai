import { apiConfig } from '../config/apiConfig';

export interface ChatRequestParams {
  userToken: string;
  message: string;
  currentFilters: string;
  curveImageBase64: string | null;
  conversationId: string | null;
}

export interface ChatResponse {
  fullResponse: string;
  conversationId: string | null;
}

export interface ChatStreamOptions {
  signal: AbortSignal;
  onChunk: (chunk: string) => void;
}

export class AIService {
  constructor(private readonly baseUrl = apiConfig.baseUrl) {}

  async sendChatMessage(
    request: ChatRequestParams,
    { signal, onChunk }: ChatStreamOptions
  ): Promise<ChatResponse> {
    const response = await fetch(`${this.baseUrl}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
      signal,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('无法获取响应流');
    }

    const decoder = new TextDecoder();
    let buffer = '';
    let fullResponse = '';
    let nextConversationId = request.conversationId;

    while (true) {
      if (signal.aborted) {
        throw new Error('请求被中止');
      }

      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;

        try {
          const payload = line.substring(6);
          if (!payload.trim()) continue;

          const eventData = JSON.parse(payload);

          switch (eventData.event) {
            case 'message':
              if (eventData.answer) {
                fullResponse += eventData.answer;
                onChunk(eventData.answer);
              }
              if (eventData.conversation_id) {
                nextConversationId = eventData.conversation_id;
              }
              break;

            case 'message_end':
              if (eventData.conversation_id) {
                nextConversationId = eventData.conversation_id;
              }
              break;

            case 'segment_cover':
              if (eventData.data) {
                const serialized = `<segment_cover>${JSON.stringify(eventData.data)}</segment_cover>`;
                fullResponse += serialized;
              }
              break;

            case 'error':
              throw new Error(eventData.message || '服务器返回错误');

            case 'workflow_started':
            case 'node_started':
            case 'node_finished':
            case 'workflow_finished':
            case 'ping':
              // 非关键事件仅记录日志，调用方根据需要处理
              break;

            default:
              console.warn('未知事件类型:', eventData.event);
          }
        } catch (error) {
          console.error('解析SSE数据失败:', error, '原始数据:', line);
        }
      }
    }

    return {
      fullResponse,
      conversationId: nextConversationId,
    };
  }
}

export const aiService = new AIService();
