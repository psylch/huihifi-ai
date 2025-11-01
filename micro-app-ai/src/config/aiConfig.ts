// src/config/aiConfig.ts
import { Models } from 'openai/resources.mjs';
import { FilterParams } from '../types';

// 默认配置值
const defaultConfig = {
  // 调试信息显示控制
  debugInfo: {
    // 是否启用调试信息区域
    enabled: true,
    // 是否默认显示调试信息 (当enabled为true时生效)
    defaultVisible: true,
  },
};

// 创建可更新的配置对象
export const aiConfig = {
  ...defaultConfig,
  
  // 更新调试信息配置的方法
  updateDebugSettings(settings: { enabled?: boolean; defaultVisible?: boolean }) {
    if (settings.enabled !== undefined) {
      this.debugInfo.enabled = settings.enabled;
    }
    if (settings.defaultVisible !== undefined) {
      this.debugInfo.defaultVisible = settings.defaultVisible;
    }
  },
  
  // 调试信息显示控制
  debugInfo: {
    // 是否启用调试信息区域
    enabled: defaultConfig.debugInfo.enabled,
    // 是否默认显示调试信息 (当enabled为true时生效)
    defaultVisible: defaultConfig.debugInfo.defaultVisible,
  },
  
  // API 配置已移至后端，前端不再需要 apiKey 和 apiUrl
  
  prompts: {
    // systemPrompt 已移至后端配置，前端不再需要
    // 为保持向后兼容，保留空字符串
    systemPrompt: '',  // Prompt 已移至后端，前端不再需要
    // Demo responses (ensure they match the new structure if used heavily)
    demoResponses: { /* ... keep as is or update for new multi-tag parsing test ... */
      addBassAndReduceHarshness: `好的，我来帮你调整一下低音和高音！

对于低音，我们可以这样：
<freq_manipulation>
{
  "manipulationType": "add",
  "filterParams": {
    "filterType": "low_shelf",
    "freq": 100,
    "gain": 3,
    "qFactor": 0.7
  }
}
</freq_manipulation>

然后，为了让高音不那么刺耳：
<freq_manipulation>
{
  "manipulationType": "add",
  "filterParams": {
    "filterType": "peaking",
    "freq": 4000,
    "gain": -2.5,
    "qFactor": 1.5
  }
}
</freq_manipulation>

这样调整后，低音会更饱满一些，高频的刺激感也会降低，听起来应该会更舒服哦！😊 你试试看喜不喜欢！`
    },
  },
  
  demoMode: {
    enabled: false, // Set to true to test demo mode without API key
    responseDelay: 100, // Initial delay for demo response
  },
  
  parsing: {
    // This regex is used by parseAllManipulationTags, 's' flag handled by how JS regex exec works with multiline
    manipulationTagRegex: /<freq_manipulation>([\s\S]*?)<\/freq_manipulation>/g
  }
};

// Export parsing functions and utilities for filter manipulations
export const parseAllManipulationTags = (content: string): any[] => {
  const regex = aiConfig.parsing.manipulationTagRegex;
  const manipulations = [];
  let match;
  
  // Reset regex state
  regex.lastIndex = 0;
  
  // Find all matches in the content
  while ((match = regex.exec(content)) !== null) {
    try {
      const jsonContent = match[1].trim();
      const parsedManipulation = JSON.parse(jsonContent);
      manipulations.push(parsedManipulation);
    } catch (e) {
      console.error('Error parsing manipulation tag JSON:', e);
    }
  }
  
  return manipulations;
};

// Maintain backward compatibility with the old parser name if needed
export const parseManipulationTags = parseAllManipulationTags;

/**
 * Get filter context for the LLM based on current filters
 */
export const getFilterContext = (filters: FilterParams[]): string => { // Use FilterParams type
  if (filters.length === 0) {
    return '当前没有应用任何滤波器。';
  }
  
  // 兼容主应用传入的字段命名（filterType/frequency/q），并与微应用内部命名（type/freq/qFactor）做归一化
  // 不修改主-微应用交互，仅在生成上下文字符串时本地映射，避免出现 undefined
  return `当前已应用的滤波器 (Current active filters):
${filters.map((filter: any) => {
  const id = filter.id ?? '';
  const type = filter.type ?? filter.filterType ?? 'unknown';
  const freq = filter.freq ?? filter.frequency;
  const gain = filter.gain;
  const qFactor = filter.qFactor ?? filter.q;
  const parts: string[] = [
    `- id: "${id}", type: "${type}"`,
    `freq: ${freq !== undefined ? freq : 'N/A'}`
  ];
  if (gain !== undefined) parts.push(`gain: ${gain}`);
  if (qFactor !== undefined) parts.push(`qFactor: ${qFactor}`);
  return parts.join(', ');
}).join('\n')}
(当你建议删除或编辑滤波器时，请使用上面列出的 'id'。)`;
};

// Simple function to get a random demo response (or a specific one for testing)
export const getRandomDemoResponse = (): string => {
  const responses = Object.values(aiConfig.prompts.demoResponses);
  if (responses.length === 0) return "抱歉，我今天好像没什么灵感呢...";
  const randomIndex = Math.floor(Math.random() * responses.length);
  return responses[randomIndex];
};