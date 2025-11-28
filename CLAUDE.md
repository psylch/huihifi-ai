# HuiHiFi AI Tuning - 项目协作文档

> **状态**: 当前仅覆盖 `micro-app-ai` 微应用部分
> **其他模块**: 主应用、后端服务等将在后续补充

---

## 📌 项目概述

**HuiHiFi AI Tuning** 是一个基于 Qiankun 微前端架构的智能音频调音系统。

## 🤝 协作/交互约定（spec-driven）
- 任何改动前先查阅此文档和相关说明文档；新增规则请补充到 AGENTS 中。
- 与用户交互时：直接给出决策和下一步，不赘述；需要选择时用编号列出；默认用中文回复。
- 本地/联调/上线说明：
  - 本地测试速查：`docs/local-testing.md`（后端启动脚本、前端 dev / dev:remote、调音模式验证）。
  - 上线与部署：`docs/server-deployment-notes.md`（rsync+systemd 流程，env 仅用于本地 dev，生产构建不读取本地 env）。
  - API/配置取值：优先 runtime 注入 `window.__HUIHIFI_API_BASE_URL__`，否则读取 `.env.*` 的 Vite env（仅 dev）。

**micro-app-ai** 是 AI 调音助手微应用，提供：
- 基于多模态 AI 的频响曲线分析（视觉识别）
- 自然语言交互的滤波器调整建议
- 流式 AI 对话体验
- 滤波器操作可视化确认

---

## 🗂️ 文件结构索引

### 📦 micro-app-ai/

```
micro-app-ai/
├── src/
│   ├── App.tsx                          # [入口] 微前端集成主组件
│   ├── main.tsx                         # [入口] Vite 启动入口
│   ├── types.ts                         # [类型] 全局类型定义
│   │
│   ├── components/                      # UI 组件层
│   │   ├── AIAssistant.tsx              # [容器] AI助手主容器
│   │   ├── ChatHistoryDisplay.tsx       # [展示] 聊天历史列表
│   │   ├── ChatInputArea.tsx            # [输入] 用户输入框
│   │   ├── ChatMessageBubble.tsx        # [展示] 单条消息气泡
│   │   ├── AIManipulationCard.tsx       # [容器] 滤波器操作卡片容器
│   │   ├── ManipulationAction.tsx       # [交互] 单个滤波器操作
│   │   ├── FrequencyResponseChart.tsx   # [图表] Recharts 频响图
│   │   └── MentionChip.tsx              # [展示] 产品 mention 标签
│   │
│   ├── hooks/
│   │   └── useStreamingLLM.tsx          # [核心] LLM 流式调用逻辑
│   │
│   ├── store/
│   │   └── MicroAppContext.tsx          # [状态] 全局状态管理
│   │
│   ├── config/
│   │   ├── appConfig.ts                 # [配置] 调试/演示模式开关
│   │   ├── llmParser.ts                 # [工具] LLM 解析 & 上下文生成
│   │   └── promptTemplates.ts           # [资源] Demo Prompt 文案
│   │
│   ├── services/                       # 服务层
│   │   ├── aiService.ts                # [服务] AI 聊天流式封装
│   │   └── productService.ts           # [服务] 产品搜索代理
│   │
│   ├── utils/
│   │   └── curveImageGenerator.ts       # [工具] Canvas 曲线图生成
│   │
│   └── styles/
│       └── index.css                    # 全局样式
│
├── package.json                         # 依赖配置
└── vite.config.ts                       # Vite & Qiankun 配置
```

---

## 🔍 核心逻辑 & 代码映射

### 1. 微前端集成 - 主应用交互

#### 📄 `App.tsx`

**职责**: 微前端生命周期管理、主-微应用数据桥接

**关键逻辑**:

##### 1.1 Props 接口定义 (L23-37)
```typescript
interface AppProps {
  getSharedData?: () => SharedDataType;    // 主应用提供的数据获取函数
  callbacks?: {                             // 主应用提供的滤波器操作回调
    addFilterFromLLM: (filterParams) => void;
    editFilterFromLLM: (filterId, filterParams) => boolean;
    deleteFilterFromLLM: (filterId) => boolean;
  };
  debugSettings?: {...};                    // 调试配置
  userToken?: string;                       // 用户认证 Token
}
```

##### 1.2 运行模式检测 (L145-150)
```typescript
const isInQiankun = qiankunWindow.__POWERED_BY_QIANKUN__ === true;
// true: 作为微应用嵌入主应用
// false: 独立运行模式 (http://localhost:8081)
```

##### 1.3 数据轮询同步 (L82-142)
```typescript
// 每 1 秒从主应用获取共享数据
const timer = setInterval(() => {
  const data = props.getSharedData?.();
  if (data && JSON.stringify(prevData) !== JSON.stringify(data)) {
    setSharedData(data); // 仅在数据变化时更新
  }
}, 1000);
```

**数据结构**:
```typescript
SharedDataType = {
  originalDataSource: FrequencyResponseData | null;    // 原始频响数据
  appliedFilters: FilterParams[];                      // 已应用的滤波器
  currentProcessedCurve: FrequencyResponseData | null; // 处理后频响数据
}
```

##### 1.4 回调函数封装 (L153-190)
```typescript
const callbacks = {
  addFilterFromLLM: (params) => props.callbacks?.addFilterFromLLM(params),
  editFilterFromLLM: (id, params) => props.callbacks?.editFilterFromLLM(id, params),
  deleteFilterFromLLM: (id) => props.callbacks?.deleteFilterFromLLM(id),
};
// 传递给 StoreProvider，最终在 ManipulationAction 中调用
```

---

### 2. 状态管理 - 全局上下文

#### 📄 `store/MicroAppContext.tsx`

**职责**: 微应用内部状态管理，连接主应用数据和 UI 组件

**Context 提供的数据** (L6-34):
```typescript
MicroAppContextType = {
  // 来自主应用的数据（只读）
  originalDataSource: FrequencyResponseData | null;
  appliedFilters: FilterParams[];
  currentProcessedCurve: FrequencyResponseData | null;
  userToken: string | null;

  // 微应用内部状态
  chatHistory: ChatMessage[];              // 聊天记录
  isLoadingLLM: boolean;                   // AI 加载状态
  currentCurveImageDataURL: string | null; // 曲线图 Base64 (用于 AI 识别)

  // 聊天操作方法
  addUserMessage: (content: string) => void;
  addEmptyStreamingAIMessage: (messageId?: string) => string;
  appendChunkToAIMessage: (messageId: string, chunk: string) => void;
  finalizeAIMessage: (...) => void;
  setAIMessageError: (messageId: string, error: string) => void;
  setLoadingLLM: (isLoading: boolean) => void;
  setCurrentCurveImageDataURL: (dataURL: string | null) => void;

  // 主应用回调（透传）
  addFilterFromLLM: (...) => void;
  editFilterFromLLM: (...) => boolean;
  deleteFilterFromLLM: (...) => boolean;
}
```

**使用方式**:
```typescript
const { chatHistory, addUserMessage, userToken } = useMicroAppContext();
```

---

### 3. AI 交互核心 - 流式对话

#### 📄 `hooks/useStreamingLLM.tsx`

**职责**: 管理与后端 AI 服务的通信，处理流式响应

##### 3.1 对话 ID 管理 (L22-45)
```typescript
// 页面刷新时重置对话
useEffect(() => {
  localStorage.removeItem('ai_conversation_id');
}, []);

// 持久化存储对话 ID（支持多轮对话）
const getConversationId = () => localStorage.getItem('ai_conversation_id');
const setConversationId = (id) => localStorage.setItem('ai_conversation_id', id);
```

##### 3.2 后端 API 调用 (L48-184)

**API 端点**: `https://ai.huihifi.com/api/aituning/chat`

**请求数据结构** (L61-67):
```typescript
{
  userToken: string,              // 用户认证 Token
  message: string,                // 用户输入
  currentFilters: string,         // 滤波器上下文文本（通过 getFilterContext 生成）
  curveImageBase64: string | null,// 频响曲线图片（Base64）
  conversationId: string | null   // 对话 ID（支持多轮对话）
}
```

**SSE 事件处理** (L110-166):
```typescript
switch (eventData.event) {
  case 'message':         // LLM 返回文本块
    fullResponse += eventData.answer;
    onChunk(eventData.answer);  // 实时追加到 UI
    break;

  case 'message_end':     // 消息流结束
    newConversationId = eventData.conversation_id;
    break;

  case 'error':           // 错误处理
    throw new Error(eventData.message);

  // 其他事件: workflow_started, node_started, node_finished...
}
```

##### 3.3 发送消息主流程 (L251-334)

```typescript
sendMessageToLLM(userMessage, curveImageUrl)
  ↓
  1. addUserMessage(userMessage)                   // 添加用户消息
  ↓
  2. addEmptyStreamingAIMessage()                  // 创建空 AI 消息
  ↓
  3. aiService.sendChatMessage(...)                // 调用服务层封装的后端 API
     ├── 内部发起 SSE 请求
     └── onChunk → appendChunkToAIMessage()        // 实时更新 UI
  ↓
  4. parseAllManipulationTags(fullResponse)        // 解析滤波器操作
  ↓
  5. finalizeAIMessage(messageId, cleanContent, manipulations)
     // 完成消息，附加操作列表
```

**关键代码位置**:
- **解析操作标签**: L301 `parseAllManipulationTags(fullResponse)`
- **清理显示内容**: L305 移除 `<freq_manipulation>` 标签
- **完成消息**: L311-319 调用 `finalizeAIMessage`

---

### 4. 配置与服务层

#### 📄 `config/appConfig.ts`
- 管理调试面板和 Demo 模式的可配置项：
  - `debugInfo.enabled` / `defaultVisible` 控制调试区域展示。
  - `demoMode.enabled` / `responseDelay` 控制本地演示模式。
- 提供 `updateDebugSettings()`，允许主应用在挂载时覆写调试开关。

#### 📄 `config/llmParser.ts`
- `parseAllManipulationTags(content)`：解析 `<freq_manipulation>` 标签中的 JSON，并返回结构化的 `FilterManipulation[]`。
- `getFilterContext(filters)`：生成当前滤波器的文本上下文，兼容主应用与微应用字段命名差异。
- `parseManipulationTags` 保留旧导出名，兼容历史引用。

#### 📄 `config/promptTemplates.ts`
- 保留 Demo 场景下的预设回答文案。
- `getRandomDemoResponse()` 用于演示模式随机返回一条答案。
- System Prompt 与模型参数现已迁移到后端配置，这里仅存放前端需要的演示资源。

#### 📄 `services/aiService.ts`
- `AIService.sendChatMessage()` 封装与后端的 SSE 通信，负责处理流式读取、事件分发及对话 ID 更新。
- 默认指向 `https://ai.huihifi.com/api/aituning`，必要时可通过构造函数调整 baseUrl。
- 暴露的 `onChunk` 回调与 hook 中的 `appendChunkToAIMessage` 对接。

#### 📄 `services/productService.ts`
- `searchProducts({ keyword, pageSize })` 预留产品搜索代理实现。
- 调用 `/api/products/search`，在前端消费 HuiHiFi 主站的产品数据。

---

### 5. UI 组件层

#### 📄 `components/AIAssistant.tsx`

**职责**: AI 助手主容器，集成聊天、使用限制、曲线图生成

##### 5.1 使用限制显示 (L90-153, L156-253)

**API 端点**: `GET https://ai.huihifi.com/api/aituning/usage/{userToken}`

**响应结构**:
```typescript
UsageInfo = {
  used: number,      // 今日已用次数
  remaining: number, // 今日剩余次数
  limit: number,     // 每日限额
  date: string       // 日期
}
```

**触发刷新时机** (L142-153):
- 组件加载时
- AI 消息完成后（延迟 1 秒）

##### 5.2 隐藏的图片生成器 (L296-300)
```typescript
<div style={{ display: 'none' }}>
  <FrequencyResponseChart
    originalDataSource={originalDataSource}
    currentProcessedCurve={currentProcessedCurve}
  />
</div>
```
**作用**: 复用 FrequencyResponseChart 的数据生成逻辑，实时生成 Base64 曲线图供 AI 视觉识别使用

##### 5.3 核心渲染 (L304-318)
```typescript
<ChatHistoryDisplay
  chatHistory={chatHistory}
  addFilterFromLLM={addFilterFromLLM}
  editFilterFromLLM={editFilterFromLLM}
  deleteFilterFromLLM={deleteFilterFromLLM}
  appliedFilters={appliedFilters}
/>

<ChatInputArea
  onSendMessage={(userInput) => sendMessageToLLM(userInput, currentCurveImageDataURL)}
  isLoading={isLoadingLLM}
/>
```

---

#### 📄 `components/ManipulationAction.tsx`

**职责**: 单个滤波器操作的可视化卡片，提供"应用"按钮

##### 操作执行逻辑 (L57-87)

```typescript
handleAction() {
  switch(action.manipulationType) {
    case 'add':
      onAddFilter(action.filterParams);  // 调用主应用回调
      break;
    case 'edit':
      success = onEditFilter(action.filterId, action.filterParams);
      break;
    case 'delete':
      success = onDeleteFilter(action.filterId);
      break;
  }
  setActionResult(success ? 'success' : 'failed');
}
```

**UI 状态**:
- **未应用**: 显示"应用"按钮（绿色/黄色/红色）
- **已应用**: 显示"✓ 已应用"或"✗ 操作失败"

##### 参数对比显示 (L90-139)

编辑操作会高亮显示修改项:
```typescript
频率: 1200 Hz (原值: 1000 Hz)  // 黄色高亮
增益: -2.5 dB (原值: -3 dB)
```

---

#### 📄 `components/FrequencyResponseChart.tsx`

**职责**: 使用 Recharts 渲染交互式频响曲线图

**特性**:
- 对数频率轴 (20Hz-20kHz)
- 同时显示原始曲线和处理后曲线
- 响应式布局
- 网格线、刻度标签

**代码位置**: 需要查看文件（未在本次读取中）

---

#### 📄 `utils/curveImageGenerator.ts`

**职责**: 使用 Canvas 离线生成频响曲线图片（Base64）

##### 核心函数 (L12-276)

```typescript
generateCurveImage(
  originalData: Array<[string|number, string|number]>,
  processedData: Array<[string|number, string|number]> | null,
  options?: { width, height, backgroundColor, ... }
): string  // 返回 Base64 Data URL
```

**渲染步骤**:
1. 创建离屏 Canvas (L35-38)
2. 绘制背景和网格 (L49-129)
3. 绘制坐标轴和刻度 (L131-189)
4. 绘制原始曲线 (L192-215)
5. 绘制处理后曲线 (L218-245)
6. 添加图例 (L248-272)
7. 转为 Base64 (L275)

**关键算法**:
- **对数频率映射** (L91-96): `freqToX(freq)`
- **dB 线性映射** (L99-101): `dbToY(db)`

---

### 6. 类型定义

#### 📄 `types.ts`

```typescript
// 滤波器类型
FilterType = 'peaking' | 'low_shelf' | 'high_shelf' | 'lowpass' | 'highpass';

// 滤波器参数 (L5-11)
FilterParams = {
  id: string;
  type: FilterType;
  freq: number;
  gain?: number;
  qFactor?: number;
};

// AI 操作指令 (L14-23)
FilterManipulation = {
  manipulationType: 'add' | 'edit' | 'delete';
  filterId?: string;
  filterParams?: {
    filterType?: FilterType;
    freq?: number;
    gain?: number;
    qFactor?: number;
  };
};

// 聊天消息 (L26-36)
ChatMessage = {
  id: string;
  content: string;
  sender: 'user' | 'ai';
  manipulationActions?: FilterManipulation[];  // AI 建议的操作
  timestamp: number;
  isStreaming?: boolean;
  error?: string;
  rawContent?: string;       // 含 <freq_manipulation> 的原始内容
  processedContent?: string; // 替换为占位符的内容
};

// 频响数据 (L39-40)
FrequencyResponseDataPoint = [string, string];  // [频率, dB值]
FrequencyResponseData = FrequencyResponseDataPoint[];
```

---

## 🔄 完整数据流图

```
┌─────────────────────────────────────────────────────────────────┐
│                         主应用 (Main App)                        │
│  - 管理 originalDataSource, appliedFilters, currentProcessedCurve │
│  - 提供 addFilter/editFilter/deleteFilter 回调                   │
│  - 提供 userToken                                                │
└────────────────────────────┬────────────────────────────────────┘
                             │ Props 传递
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│                      App.tsx (微前端入口)                        │
│  - 每 1 秒轮询 getSharedData()                                   │
│  - 检测运行模式 (isInQiankun)                                    │
│  - 封装 callbacks                                                │
└────────────────────────────┬────────────────────────────────────┘
                             │ 传递给 Context
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│               StoreProvider (MicroAppContext)                   │
│  状态:                                                           │
│    - chatHistory (微应用内部)                                    │
│    - currentCurveImageDataURL (微应用内部)                       │
│    - originalDataSource (来自主应用)                             │
│    - appliedFilters (来自主应用)                                 │
│    - userToken (来自主应用)                                      │
└────────────────────────────┬────────────────────────────────────┘
                             │ useMicroAppContext()
              ┌──────────────┼──────────────┐
              ↓              ↓              ↓
    ┌─────────────┐  ┌──────────────┐  ┌──────────────┐
    │ AIAssistant │  │ useStreaming │  │ Manipulation │
    │             │  │     LLM      │  │   Action     │
    └─────────────┘  └──────────────┘  └──────────────┘
          │                 │                  │
          │                 │                  │
          ↓                 ↓                  ↓
    [用户输入]        [发送到后端]        [点击应用]
          │                 │                  │
          │                 ↓                  │
          │     https://ai.huihifi.com         │
          │     /api/aituning/chat             │
          │     (SSE 流式响应)                 │
          │                 │                  │
          │                 ↓                  │
          │     解析 <freq_manipulation>       │
          │     生成 manipulationActions       │
          │                                    │
          └────────────────┬───────────────────┘
                           │
                           ↓
              调用主应用 callbacks
                   (addFilter/editFilter/deleteFilter)
                           │
                           ↓
              主应用更新 appliedFilters
                           │
                           ↓
              下次轮询时微应用接收更新
```

---

## 🔑 关键交互场景

### 场景 1: 用户发送调音请求

```
1. 用户输入: "帮我增强低音，减少高音刺耳感"
   ↓ ChatInputArea.tsx → useStreamingLLM.sendMessageToLLM()

2. 准备数据:
   - userMessage: "帮我增强低音，减少高音刺耳感"
   - curveImageBase64: 从 currentCurveImageDataURL 获取
   - currentFilters: 从 getFilterContext(appliedFilters) 生成
   - conversationId: 从 localStorage 读取
   ↓

3. 发送 POST 请求到后端 API
   ↓ callBackendChat()

4. 后端返回 SSE 流:
   data: {"event":"message","answer":"好的，我来帮你调整一下..."}
   data: {"event":"message","answer":"<freq_manipulation>"}
   data: {"event":"message","answer":"{\"manipulationType\":\"add\",...}"}
   data: {"event":"message","answer":"</freq_manipulation>"}
   data: {"event":"message_end","conversation_id":"abc123"}
   ↓

5. 前端实时追加文本到 chatHistory
   ↓ appendChunkToAIMessage()

6. 流结束后解析:
   - fullResponse: "好的，我来帮你调整...<freq_manipulation>...</freq_manipulation>"
   - manipulations: parseAllManipulationTags() → [{ manipulationType: "add", ... }]
   ↓

7. 完成消息:
   - cleanContent: 移除 <freq_manipulation> 标签
   - 附加 manipulationActions
   ↓ finalizeAIMessage()

8. UI 显示:
   - ChatMessageBubble: 显示文本
   - AIManipulationCard: 显示滤波器操作卡片
```

### 场景 2: 用户应用 AI 建议的滤波器

```
1. 用户点击 ManipulationAction 中的"应用"按钮
   ↓ handleAction()

2. 根据 manipulationType 调用对应回调:
   - add: onAddFilter(filterParams)
   - edit: onEditFilter(filterId, filterParams)
   - delete: onDeleteFilter(filterId)
   ↓

3. 回调函数实际调用主应用的 callbacks
   ↓ props.callbacks.addFilterFromLLM(...)

4. 主应用更新 appliedFilters 状态
   ↓

5. 微应用下次轮询时 (1秒后) 接收到更新:
   ↓ props.getSharedData()

6. MicroAppContext 更新:
   - appliedFilters 更新
   - currentProcessedCurve 更新 (主应用重新计算)
   ↓

7. FrequencyResponseChart 自动重新渲染
   - 显示新的处理后曲线
```

---

## 🚧 待补充部分

### 主应用 (Main App)
- [ ] 主应用架构和路由
- [ ] Qiankun 配置和微应用注册
- [ ] 滤波器计算逻辑
- [ ] 主-微应用完整集成流程

### 后端服务
- [ ] Flask API 架构
- [ ] AI 模型调用逻辑（实际使用的多模态 AI）
- [ ] 用户认证和使用限制
- [ ] 对话历史管理

### 其他微应用
- [ ] 其他微应用（如果存在）

---

## 📝 开发注意事项

### 1. 依赖注意
- **vite-plugin-qiankun**: 微前端插件，配置见 `vite.config.ts`
- **openai**: 类型定义使用，实际 API 调用在后端
- **recharts**: 图表渲染
- **uuid**: 生成消息 ID

### 2. 调试技巧
- **独立运行**: `npm run dev` → http://localhost:8081
- **调试面板**: 调整 `appConfig.debugInfo` 或通过主应用注入 `debugSettings`
- **查看网络**: 观察 SSE 流 `https://ai.huihifi.com/api/aituning/chat`

### 3. 关键配置文件
- `config/appConfig.ts`: 调试面板 & Demo 模式开关
- `config/llmParser.ts`: LLM 操作解析 & 滤波器上下文
- `services/aiService.ts`: AI 聊天服务入口
- `App.tsx:82`: 轮询间隔 (1000ms)

---

## 🔖 快速定位

| 需求 | 文件 | 行号 |
|------|------|------|
| 调整调试配置 | `config/appConfig.ts` | - |
| 修改解析逻辑 | `config/llmParser.ts` | - |
| 调整轮询间隔 | `App.tsx` | L107 |
| 调整 API 封装 | `services/aiService.ts` | - |
| 修改滤波器类型 | `types.ts` | L1 |
| 调整图表样式 | `components/FrequencyResponseChart.tsx` | - |
| 修改操作卡片样式 | `components/ManipulationAction.tsx` | L23-54 |
| 调整曲线图生成参数 | `utils/curveImageGenerator.ts` | L12-23 |
