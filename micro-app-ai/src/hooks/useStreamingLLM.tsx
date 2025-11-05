import { useCallback, useState, useEffect } from 'react';
import { useMicroAppContext } from '../store/MicroAppContext';
import { parseAllManipulationTags, getFilterContext, parseSegmentCoverTag } from '../config/llmParser';
import { appConfig } from '../config/appConfig';
import { aiService } from '../services';
import { SegmentCoverData, UserMessagePayload } from '../types';

export default function useStreamingLLM() {
  const {
    appliedFilters,
    addUserMessage,
    addEmptyStreamingAIMessage,
    appendChunkToAIMessage,
    finalizeAIMessage,
    setAIMessageError,
    setLoadingLLM,
    currentCurveImageDataURL,
    userToken // 从context获取userToken
  } = useMicroAppContext();
  
  const [abortController, setAbortController] = useState<AbortController | null>(null);

  // 页面刷新时重置对话ID（确保每次刷新都是新对话）
  useEffect(() => {
    localStorage.removeItem('ai_conversation_id');
    console.log('页面刷新，重置对话ID');
  }, []); // 空依赖数组，只在组件初始化时执行一次

  // 管理conversation_id
  const getConversationId = (): string | null => {
    return localStorage.getItem('ai_conversation_id');
  };

  const setConversationId = (conversationId: string | null) => {
    if (conversationId) {
      localStorage.setItem('ai_conversation_id', conversationId);
      console.log('保存conversation_id:', conversationId);
    } else {
      localStorage.removeItem('ai_conversation_id');
    }
  };

  // 重置对话（开始新的对话session）
  const resetConversation = () => {
    setConversationId(null);
    console.log('手动重置对话');
  };

  // Demo模式的模拟响应（保持兼容）
  const simulateDemoResponse = useCallback(async (
    userPayload: UserMessagePayload,
    curveImageUrl: string | null,
    appliedFilters: any[],
    signal: AbortSignal,
    onChunk: (chunk: string) => void
  ): Promise<string> => {
    const userMessage = userPayload.displayContent;
    // 获取滤波器上下文
    const filterContext = getFilterContext(appliedFilters);
    
    let response = '';
    
    // 基于用户输入生成demo响应
    if (userMessage.toLowerCase().includes('低音') || userMessage.toLowerCase().includes('bass')) {
      response = '我了解您想要增强低音效果。根据您的频率响应曲线，我建议添加一个低频搁架滤波器来提升低频响应。\n\n'
        + '<freq_manipulation>\n'
        + '{\n'
        + '  "manipulationType": "add",\n'
        + '  "filterParams": {\n'
        + '    "filterType": "low_shelf",\n'
        + '    "freq": 100,\n'
        + '    "gain": 3,\n'
        + '    "qFactor": 0.7\n'
        + '  }\n'
        + '}\n'
        + '</freq_manipulation>\n\n'
        + '这个滤波器会在100Hz处提升3dB，给您的音频增加温暖的低音。Q值设为0.7可以确保平滑的过渡，不会听起来太突兀。';
    } else if (userMessage.toLowerCase().includes('刺耳') || userMessage.toLowerCase().includes('尖锐')) {
      response = '刺耳的声音通常来自于中高频段的过度增强。我分析了您的频率响应曲线，建议在2-4kHz区域降低一些增益。\n\n'
        + '<freq_manipulation>\n'
        + '{\n'
        + '  "manipulationType": "add",\n'
        + '  "filterParams": {\n'
        + '    "filterType": "peaking",\n'
        + '    "freq": 3000,\n'
        + '    "gain": -2.5,\n'
        + '    "qFactor": 1.2\n'
        + '  }\n'
        + '}\n'
        + '</freq_manipulation>\n\n'
        + '这个峰值滤波器会在3kHz处降低2.5dB，减少刺耳感。';
    } else {
      response = `感谢您的消息！我需要了解更多关于您想要的音频效果。您是希望增强低音、减少刺耳感、提升人声清晰度，还是有其他特定需求？请告诉我更多细节，我可以给您提供更精确的调音建议。\n\n当前滤波器状态:\n${filterContext}`;
    }
    
    let streamedText = '';
    const words = response.split(/(?<=\s)/);
    
    const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
    
    for (const chunk of words) {
      if (signal.aborted) {
        throw new Error('流式响应已被终止');
      }
      
      streamedText += chunk;
      onChunk(chunk);
      await delay(10 + Math.random() * 40);
    }
    
    return streamedText;
  }, []);

  // 发送消息到LLM
  const sendMessageToLLM = async (userPayload: UserMessagePayload, curveImageUrl: string | null = null) => {
    // 添加用户消息
    addUserMessage(userPayload);
    
    // 设置加载状态
    setLoadingLLM(true);
    
    // 创建消息ID和终止控制器
    const messageId = addEmptyStreamingAIMessage();
    const controller = new AbortController();
    setAbortController(controller);
    
    console.log('图像数据可用:', !!curveImageUrl);
    if (curveImageUrl) {
      console.log('频响曲线图像:', curveImageUrl.substring(0, 50) + '...');
    }
    
    try {
      let fullResponse = '';
      let resultConversationId = null;

      // 根据配置决定使用真实API还是演示模式
      if (appConfig.demoMode.enabled) {
        console.log('使用演示模式');
        fullResponse = await simulateDemoResponse(
          userPayload, 
          curveImageUrl, 
          appliedFilters, 
          controller.signal, 
          (chunk) => {
            appendChunkToAIMessage(messageId, chunk);
          }
        );
      } else {
        console.log('调用后端API');
        const conversationId = getConversationId();
        const result = await aiService.sendChatMessage(
          {
            userToken: userToken || 'anonymous',
            message: userPayload.llmPayload,
            currentFilters: getFilterContext(appliedFilters),
            curveImageBase64: curveImageUrl,
            conversationId,
          },
          {
            signal: controller.signal,
            onChunk: (chunk) => {
              appendChunkToAIMessage(messageId, chunk);
            },
          }
        );
        fullResponse = result.fullResponse;
        resultConversationId = result.conversationId;
        if (resultConversationId) {
          setConversationId(resultConversationId);
        }
      }
      
      // 解析滤波器操作
      const manipulations = parseAllManipulationTags(fullResponse);
      console.log('解析到的滤波器操作:', manipulations);

      // 解析频段覆盖操作
      const segmentCover: SegmentCoverData | null = parseSegmentCoverTag(fullResponse);
      if (segmentCover) {
        console.log('解析到的频段覆盖操作:', segmentCover);
      }
      
      // 清理显示内容（移除操作标签）
      const cleanContent = fullResponse
        .replace(/<freq_manipulation>[\s\S]*?<\/freq_manipulation>/gs, '')
        .replace(/<segment_cover>[\s\S]*?<\/segment_cover>/gs, '')
        .trim();
      
      // 生成带占位符的内容（用于UI高亮）
      const processedContent = fullResponse
        .replace(/<freq_manipulation>[\s\S]*?<\/freq_manipulation>/gs, '<span class="ai-manipulation-placeholder">滤波器操作</span>')
        .replace(/<segment_cover>[\s\S]*?<\/segment_cover>/gs, '<span class="ai-manipulation-placeholder">频段覆盖</span>');
      
      // 完成消息
      finalizeAIMessage(
        messageId, 
        cleanContent, 
        manipulations,
        { 
          rawContent: fullResponse,
          processedContent: processedContent,
          segmentCover: segmentCover
        }
      );

      console.log('对话完成，conversation_id:', resultConversationId);
      
    } catch (error: any) {
      if (error.message?.includes('中止') || error.name === 'AbortError') {
        console.log('用户中止了请求');
      } else {
        console.error('LLM响应错误:', error);
        setAIMessageError(messageId, error?.message || '生成AI响应时出错');
      }
    } finally {
      setLoadingLLM(false);
      setAbortController(null);
    }
  };
  
  // 终止流式响应
  const abortStream = () => {
    if (abortController) {
      abortController.abort();
      setAbortController(null);
      setLoadingLLM(false);
    }
  };

  // 暴露conversation管理方法
  const conversationUtils = {
    reset: resetConversation,
    getCurrentId: getConversationId,
    setId: setConversationId
  };
  
  return {
    sendMessageToLLM,
    abortStream,
    conversation: conversationUtils
  };
}
