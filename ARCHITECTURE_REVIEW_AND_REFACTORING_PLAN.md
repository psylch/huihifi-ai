# 架构审查与重构规划

> **目标**: 为 Product Mention 新功能实施做好架构准备
> **日期**: 2025-10-31
> **状态**: Draft for Review

---

## 📊 一、当前架构分析

### 1.1 前端架构现状

#### 目录结构
```
micro-app-ai/src/
├── components/           # UI 组件层
│   ├── AIAssistant.tsx              # 容器组件 (使用限制 + 聊天界面)
│   ├── ChatHistoryDisplay.tsx       # 历史消息列表
│   ├── ChatInputArea.tsx            # 用户输入框 (简单 textarea)
│   ├── ChatMessageBubble.tsx        # 消息气泡
│   ├── AIManipulationCard.tsx       # 滤波器操作容器
│   ├── ManipulationAction.tsx       # 单个操作卡片
│   ├── FrequencyResponseChart.tsx   # 频响图表
│   └── CurveImageDisplay.tsx        # 曲线图生成器 (隐藏)
├── hooks/
│   └── useStreamingLLM.tsx          # LLM 流式调用逻辑
├── store/
│   └── MicroAppContext.tsx          # 全局状态管理
├── config/
│   └── aiConfig.ts                  # 配置 + 解析工具 (需重构)
├── utils/
│   └── curveImageGenerator.ts       # Canvas 图片生成
└── types.ts                         # TypeScript 类型定义
```

#### 数据流架构
```
主应用 (Main App)
  ↓ Props (getSharedData, callbacks)
App.tsx (微前端入口)
  ↓ 轮询 (1秒) + Context Provider
MicroAppContext (全局状态)
  ├─→ AIAssistant (容器)
  │     ├─→ ChatHistoryDisplay (展示)
  │     └─→ ChatInputArea (输入)
  ├─→ useStreamingLLM (业务逻辑)
  │     └─→ Backend API (Flask)
  └─→ ManipulationAction (操作执行)
        └─→ 调用主应用 callbacks
```

### 1.2 后端架构现状

#### 目录结构
```
aituning-service/
├── app.py                # Flask 主应用
├── main.py               # 启动入口
├── usage.db              # SQLite 使用记录
└── requirements.txt      # 依赖管理
```

#### 当前 API 端点
```
POST /api/aituning/chat              # AI 聊天 (SSE 流式)
GET  /api/aituning/usage/<userToken> # 使用限制查询
GET  /health                          # 健康检查

计划新增：
POST /api/products/search             # 产品搜索 (代理 HuiHiFi API)
```

#### HuiHiFi API 集成现状
- ✅ 已配置 `HUIHIFI_APP_KEY` 和 `HUIHIFI_SECRET_KEY`
- ✅ 已实现签名算法 `generate_huihifi_sign()` (app.py:100)
- ❌ **缺失**: 产品搜索接口的转发逻辑

---

## 🔍 二、新功能影响分析

### 2.1 受影响的模块

#### **高影响** (需大幅改造)
1. **ChatInputArea.tsx** ⚠️
   - **当前**: 简单的 `<textarea>` 组件
   - **需求**: 富文本编辑器 + @ 触发 + Mention Chips
   - **改造工作量**: **大** (需引入 ContentEditable 或第三方库)

2. **useStreamingLLM.tsx** ⚠️
   - **当前**: 只处理 `<freq_manipulation>` 标签
   - **需求**: 新增 `<segment_cover>` 标签解析
   - **改造工作量**: **中** (新增解析函数 + 类型定义)

3. **aiConfig.ts** ⚠️
   - **当前**: 混合了配置 + 工具函数 + 已废弃的 Prompt
   - **需求**: 清晰的模块职责分离
   - **改造工作量**: **中** (重构 + 迁移引用)

#### **中影响** (需扩展)
4. **MicroAppContext.tsx**
   - 需新增状态: `mentionedProducts`, `segmentCoverActions`
   - 改造工作量: **小**

5. **types.ts**
   - 需新增类型: `MentionedProduct`, `SegmentCoverData`, `RichContent`
   - 改造工作量: **小**

6. **App.tsx**
   - 需新增回调: `coverSegmentFromLLM`
   - 改造工作量: **小**

#### **低影响** (新增组件)
7. **新组件** (待创建):
   - `ProductSearchDropdown.tsx` - 产品搜索下拉
   - `MentionChip.tsx` - 产品提及标签
   - `RichTextInput.tsx` - 富文本输入框
   - `SegmentCoverAction.tsx` - 频段覆盖操作卡片

8. **后端新接口**:
   - `/api/products/search` - 产品搜索代理

---

## 🛠️ 三、重构优先级规划

### 阶段 0: 架构清理 (Pre-work) 🔥 **优先级最高**

> **状态**: ✅ 已完成（基础清理工作就绪）

> **目标**: 在新功能开发前，清理技术债务，建立清晰的架构基础

#### 0.1 重构 `aiConfig.ts` ✅ 已完成

**问题**:
- 文件名不匹配内容 (已无 AI 配置)
- 职责混乱 (配置 + 工具函数 + 废弃 Prompt)

**方案**: 拆分成 3 个文件

```typescript
// 新文件结构
config/
  ├── appConfig.ts          # 应用配置
  │   ├── debugInfo
  │   └── demoMode
  │
  ├── llmParser.ts          # LLM 解析工具
  │   ├── parseAllManipulationTags()
  │   ├── parseSegmentCoverTag()  // 新增
  │   └── getFilterContext()
  │
  └── promptTemplates.ts    # Prompt 模板 (未来扩展)
      └── demoResponses
```

**改造步骤**:
1. 创建新文件并迁移代码
2. 更新所有引用 (App.tsx, useStreamingLLM.tsx)
3. 删除旧文件
4. 测试验证

**结果**:
- 创建 `config/appConfig.ts`、`config/llmParser.ts`、`config/promptTemplates.ts` 并迁移对应职责（`parseSegmentCoverTag()` 留作后续新增）。
- 更新 `App.tsx`、`useStreamingLLM.tsx` 等引用，删除旧的 `config/aiConfig.ts`。
- `appConfig` 负责调试/演示配置，`llmParser` 提供滤波器上下文与标签解析，`promptTemplates` 保留 Demo 文案。


---

#### 0.2 规范化类型定义 ✅ 已完成

**问题**:
- `types.ts` 和 `types.d.ts` 并存 (混乱)
- 缺少新功能所需类型

**方案**: 统一到 `types.ts`，按模块组织

```typescript
// types.ts (重新组织)

// ============ 滤波器相关 ============
export type FilterType = ...;
export interface FilterParams { ... }
export interface FilterManipulation { ... }

// ============ 产品提及 (新增) ============
export interface MentionedProduct {
  id: string;
  name: string;
  uuid: string;
}

export interface RichContentSegment {
  type: 'text' | 'mention';
  content?: string;
  data?: MentionedProduct;
}

// ============ 频段覆盖 (新增) ============
export interface SegmentCoverItem {
  frequency_range: [number, number];
  name: string;
  uuid: string;
  dataGroup: string;
}

export interface SegmentCoverData {
  data_list: SegmentCoverItem[];
}

// ============ 聊天消息 ============
export interface ChatMessage {
  id: string;
  content: string;
  sender: 'user' | 'ai';
  manipulationActions?: FilterManipulation[];
  segmentCoverAction?: SegmentCoverData;  // 新增
  richContent?: RichContentSegment[];     // 新增
  timestamp: number;
  isStreaming?: boolean;
  error?: string;
}

// ============ API 相关 ============
export interface ProductSearchResult {
  uuid: string;
  title: string;
  brand: { title: string; img: string };
  article: { thumbnails: string[] };
}
```

**结果**:
- `types.ts` 重新分区整理，补充 Mention、Segment Cover、产品搜索等领域类型。
- 原 `types.d.ts` 更名为 `global.d.ts`，专职存放样式与 JSON 模块声明，避免命名冲突。
- 所有引用已对齐新的类型命名。

---

#### 0.3 建立服务层 (Service Layer) ✅ 已完成

**问题**:
- API 调用逻辑直接写在 hooks 中，难以复用和测试

**方案**: 创建 `services/` 目录

```typescript
// services/aiService.ts
export class AIService {
  async sendChatMessage(params: ChatRequestParams): Promise<Response> {
    // 原 useStreamingLLM.tsx 中的 callBackendChat 逻辑
  }
}

// services/productService.ts
export class ProductService {
  async searchProducts(keyword: string): Promise<ProductSearchResult[]> {
    const response = await fetch('/api/products/search', {
      method: 'POST',
      body: JSON.stringify({ keyword, pageSize: 20 })
    });
    return response.json();
  }
}

// services/index.ts
export const aiService = new AIService();
export const productService = new ProductService();
```

**改造步骤**:
1. 创建 `services/` 目录
2. 提取 API 调用逻辑
3. 在 hooks 中使用 services
4. 添加错误处理和重试逻辑

**结果**:
- 新建 `services/aiService.ts` 负责流式聊天请求，hook 通过服务层调用并统一管理对话 ID。
- 新建 `services/productService.ts` 及 `services/index.ts`，预留产品搜索代理与集中导出入口。
- `useStreamingLLM.tsx` 已迁移至服务层封装并保持 Demo 模式逻辑不变。

---

### 阶段 1: 后端基础设施 (Backend Foundation)

> **依赖**: 阶段 0 完成后开始

#### 1.1 实现产品搜索 API 代理

**位置**: `aituning-service/app.py`

**新增代码**:
```python
@app.route('/api/products/search', methods=['POST'])
def search_products():
    """
    产品搜索接口 - 代理 HuiHiFi API
    """
    try:
        data = request.get_json()
        keyword = data.get('keyword', '')
        page_size = min(data.get('pageSize', 20), Config.HUIHIFI_MAX_PAGE_SIZE)

        # 生成签名
        sign, timestamp = generate_huihifi_sign(
            Config.HUIHIFI_APP_KEY,
            Config.HUIHIFI_SECRET_KEY
        )

        # 调用 HuiHiFi API
        response = requests.post(
            f"{Config.HUIHIFI_API_BASE_URL}/v1/openapi/evaluations",
            json={
                "orderBy": "createTime",
                "direction": "DESC",
                "pageSize": page_size,
                "keyword": keyword
            },
            headers={
                "appKey": Config.HUIHIFI_APP_KEY,
                "timestamp": str(timestamp),
                "sign": sign,
                "Content-Type": "application/json"
            },
            timeout=Config.HUIHIFI_API_TIMEOUT
        )

        if response.status_code != 200:
            logger.error(f"HuiHiFi API 错误: {response.text}")
            return jsonify({"error": "搜索失败"}), response.status_code

        # 提取并格式化数据
        result = response.json()
        products = []
        for item in result.get('data', {}).get('list', []):
            products.append({
                "uuid": item.get("uuid"),
                "title": item.get("title"),
                "brand": item.get("brand", {}),
                "thumbnails": item.get("article", {}).get("thumbnails", [])
            })

        return jsonify({"products": products})

    except requests.Timeout:
        logger.error("HuiHiFi API 超时")
        return jsonify({"error": "搜索超时，请重试"}), 504
    except Exception as e:
        logger.error(f"产品搜索失败: {str(e)}")
        return jsonify({"error": str(e)}), 500
```

**测试**:
```bash
curl -X POST http://localhost:5000/api/products/search \
  -H "Content-Type: application/json" \
  -d '{"keyword": "IE800", "pageSize": 10}'
```

**预计工时**: 2 小时

---

#### 1.2 扩展 Dify Prompt (Segment Cover 能力)

**位置**: 后端 AI 服务配置 (可能需要在 Dify 平台配置，或通过 API 动态注入)

**新增 Prompt 片段**:
```markdown
## 新能力：频段覆盖 (Segment Cover)

当用户使用 @ 提及产品时，消息中会包含隐藏的元数据：
<user_selected_item>{"name":"产品名","uuid":"产品UUID"}</user_selected_item>

如果用户表达了混合多个产品的频响需求（如"我想要A的高频，B的低频"），
你需要输出以下格式的指令：

<segment_cover>
{
  "data_list": [
    {
      "frequency_range": [20, 500],
      "name": "榭兰图",
      "uuid": "xxx-xxx-xxx",
      "dataGroup": ""
    },
    {
      "frequency_range": [5000, 20000],
      "name": "IE800",
      "uuid": "yyy-yyy-yyy",
      "dataGroup": ""
    }
  ]
}
</segment_cover>

频段范围参考：
- 极低频: 20-60 Hz
- 低频: 60-250 Hz
- 中低频: 250-500 Hz
- 中频: 500-2000 Hz
- 中高频: 2000-4000 Hz
- 高频: 4000-8000 Hz
- 超高频: 8000-20000 Hz

用户描述 "低音" 通常指 60-250 Hz
用户描述 "人声" 通常指 500-3000 Hz
用户描述 "高音" 通常指 4000-12000 Hz

注意：
1. 必须从 <user_selected_item> 中提取 UUID，不得猜测
2. 如果用户没有使用 @ 提及产品，回复"请使用 @ 选择具体产品"
```

**预计工时**: 1 小时

---

### 阶段 2: 前端基础组件 (UI Foundation)

> **依赖**: 阶段 0 完成后可并行开始

#### 2.1 产品搜索下拉组件

**文件**: `components/ProductSearchDropdown.tsx`

**功能**:
- 搜索框 + 产品列表
- 实时搜索 (debounce 300ms)
- 键盘导航 (↑↓ Enter Esc)
- 加载状态 + 错误处理

**技术选型**:
- **推荐**: Headless UI (无样式组件库)
  - `@headlessui/react` 的 `Combobox` 组件
  - 优点: 处理好了可访问性和键盘导航
  - 缺点: 需要学习新 API

- **备选**: 自己实现
  - 优点: 完全可控
  - 缺点: 需要处理边界情况 (焦点、滚动、定位)

**预计工时**: 6 小时

---

#### 2.2 Mention Chip 组件

**文件**: `components/MentionChip.tsx`

**功能**:
- 高亮显示产品名
- 不可编辑 (`contentEditable={false}`)
- 整体删除
- 关联元数据 (`data-mention-id`)

**示例**:
```tsx
<span
  className="mention-chip"
  contentEditable={false}
  data-mention-id={product.id}
  data-mention-uuid={product.uuid}
  style={{
    backgroundColor: 'var(--primary-color)',
    color: 'white',
    padding: '2px 8px',
    borderRadius: '12px',
    margin: '0 2px',
    display: 'inline-block',
    userSelect: 'none'
  }}
>
  {product.name}
</span>
```

**预计工时**: 2 小时

---

#### 2.3 富文本输入框 (核心难点)

**文件**: `components/RichTextInput.tsx`

**技术选型决策**:

| 方案 | 优点 | 缺点 | 推荐度 |
|------|------|------|--------|
| **ContentEditable** | 原生支持、光标处理简单 | 跨浏览器兼容性、需要手动解析 DOM | ⭐⭐⭐⭐ |
| **Draft.js** | 成熟的富文本框架 | 学习曲线陡、bundle 大、不再维护 | ⭐⭐ |
| **Slate.js** | 现代化、可定制性强 | 复杂度高、文档不够友好 | ⭐⭐⭐ |
| **Lexical** (Meta) | 性能好、插件系统 | 较新、社区小 | ⭐⭐⭐⭐ |

**推荐方案**: **ContentEditable + 自定义实现**

**理由**:
1. 需求相对简单 (只需支持 @ mention)
2. 避免引入重型依赖
3. 完全可控，便于后续扩展

**核心实现逻辑**:
```tsx
interface RichTextInputProps {
  value: RichContentSegment[];
  onChange: (segments: RichContentSegment[]) => void;
  onTriggerMention: (cursorPosition: number) => void;
}

const RichTextInput: React.FC<RichTextInputProps> = ({
  value,
  onChange,
  onTriggerMention
}) => {
  const editorRef = useRef<HTMLDivElement>(null);

  const handleInput = (e: React.FormEvent) => {
    // 1. 获取当前 DOM 结构
    const html = editorRef.current?.innerHTML;

    // 2. 解析成 RichContentSegment[]
    const segments = parseDOMToSegments(editorRef.current);

    // 3. 检测 @ 输入
    const cursorPos = getCursorPosition();
    const lastChar = getLastTypedChar();
    if (lastChar === '@') {
      onTriggerMention(cursorPos);
    }

    // 4. 触发 onChange
    onChange(segments);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // 处理 Backspace 删除 Chip
    if (e.key === 'Backspace') {
      const selection = window.getSelection();
      const node = selection?.anchorNode;

      // 如果光标前是 Chip，删除整个 Chip
      if (isBeforeMentionChip(node)) {
        e.preventDefault();
        deleteChip(node);
      }
    }
  };

  return (
    <div
      ref={editorRef}
      contentEditable
      onInput={handleInput}
      onKeyDown={handleKeyDown}
      suppressContentEditableWarning
      className="rich-text-input"
    >
      {renderSegments(value)}
    </div>
  );
};
```

**关键工具函数**:
```typescript
// 将 DOM 解析成数据结构
function parseDOMToSegments(element: HTMLElement): RichContentSegment[] {
  const segments: RichContentSegment[] = [];

  element.childNodes.forEach(node => {
    if (node.nodeType === Node.TEXT_NODE) {
      segments.push({ type: 'text', content: node.textContent || '' });
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as HTMLElement;
      if (el.classList.contains('mention-chip')) {
        const id = el.dataset.mentionId;
        const uuid = el.dataset.mentionUuid;
        const name = el.textContent || '';
        segments.push({
          type: 'mention',
          data: { id, uuid, name }
        });
      }
    }
  });

  return segments;
}

// 生成发给 LLM 的文本
function segmentsToLLMPayload(segments: RichContentSegment[]): string {
  return segments.map(seg => {
    if (seg.type === 'text') {
      return seg.content;
    } else {
      const { name, uuid } = seg.data!;
      return `<user_selected_item>{"name":"${name}","uuid":"${uuid}"}</user_selected_item>`;
    }
  }).join('');
}

// 生成用户可见的纯文本
function segmentsToPlainText(segments: RichContentSegment[]): string {
  return segments.map(seg =>
    seg.type === 'text' ? seg.content : seg.data!.name
  ).join('');
}
```

**预计工时**: 10 小时 (难点)

---

### 阶段 3: LLM 集成 (AI Integration)

> **依赖**: 阶段 1、2 部分完成后开始

#### 3.1 扩展 useStreamingLLM Hook

**修改位置**: `hooks/useStreamingLLM.tsx`

**新增功能**:
1. 解析 `<segment_cover>` 标签
2. 发送消息时包含 richContent 的元数据
3. 处理新的 SSE 事件类型

**代码示例**:
```typescript
// llmParser.ts 中新增
export function parseSegmentCoverTag(content: string): SegmentCoverData | null {
  const regex = /<segment_cover>([\s\S]*?)<\/segment_cover>/;
  const match = content.match(regex);
  if (!match) return null;

  try {
    const data = JSON.parse(match[1].trim());
    // 验证数据结构
    if (!data.data_list || !Array.isArray(data.data_list)) {
      throw new Error('Invalid segment_cover data structure');
    }
    return data;
  } catch (e) {
    console.error('解析 segment_cover 失败:', e);
    return null;
  }
}

// useStreamingLLM.tsx 中修改
const sendMessageToLLM = useCallback(
  async (
    userMessage: string,
    richContent: RichContentSegment[], // 新增参数
    curveImageUrl: string | null
  ) => {
    // ...

    // 生成 LLM payload (含元数据)
    const llmPayload = segmentsToLLMPayload(richContent);

    const requestData = {
      userToken: userToken || 'anonymous',
      message: llmPayload,  // 使用带元数据的文本
      currentFilters: getFilterContext(currentFilters),
      curveImageBase64: curveImageUrl,
      conversationId: conversationId
    };

    // ...

    // 解析响应
    const manipulations = parseAllManipulationTags(fullResponse);
    const segmentCover = parseSegmentCoverTag(fullResponse); // 新增

    finalizeAIMessage(
      messageId,
      cleanContent,
      manipulations,
      segmentCover  // 新增
    );
  },
  [/* deps */]
);
```

**预计工时**: 4 小时

---

#### 3.2 新增 SegmentCoverAction 组件

**文件**: `components/SegmentCoverAction.tsx`

**功能**:
- 展示频段覆盖操作列表
- 显示每个产品的频率范围
- "应用"按钮调用父应用回调

**示例 UI**:
```
┌─────────────────────────────────────┐
│ 🎚️ 频段覆盖操作                     │
├─────────────────────────────────────┤
│ • 榭兰图 (20 Hz - 500 Hz)           │
│ • IE800 (5000 Hz - 20000 Hz)        │
├─────────────────────────────────────┤
│             [应用] [取消]            │
└─────────────────────────────────────┘
```

**预计工时**: 3 小时

---

### 阶段 4: 集成测试 (Integration)

> **依赖**: 所有阶段完成

#### 4.1 端到端测试场景

1. **基础流程**:
   - 用户输入 `@` → 弹出搜索 → 选择产品 → 显示 Chip → 发送消息

2. **LLM 解析**:
   - 消息含元数据 → LLM 返回 segment_cover → 前端解析 → 显示操作卡片

3. **操作执行**:
   - 点击"应用" → 调用 `coverSegmentFromLLM` → 主应用更新状态

4. **错误处理**:
   - 无效 UUID → 显示错误
   - API 超时 → 重试
   - LLM 解析失败 → 提示用户

**预计工时**: 6 小时

---

## 📅 四、实施时间线

### 总工时估算: **40 小时** (约 1 周全职工作)

```
阶段 0: 架构清理 (6 小时)
  ├─ 0.1 重构 aiConfig.ts (2h)
  ├─ 0.2 规范化类型定义 (1h)
  └─ 0.3 建立服务层 (3h)

阶段 1: 后端基础设施 (3 小时)
  ├─ 1.1 产品搜索 API (2h)
  └─ 1.2 扩展 Dify Prompt (1h)

阶段 2: 前端基础组件 (18 小时)
  ├─ 2.1 产品搜索下拉 (6h)
  ├─ 2.2 Mention Chip (2h)
  └─ 2.3 富文本输入框 (10h) ⚠️ 核心难点

阶段 3: LLM 集成 (7 小时)
  ├─ 3.1 扩展 useStreamingLLM (4h)
  └─ 3.2 SegmentCoverAction 组件 (3h)

阶段 4: 集成测试 (6 小时)
  └─ 4.1 端到端测试 (6h)
```

### 建议排期

**周一-周二**: 阶段 0 (架构清理)
**周三**: 阶段 1 (后端) + 阶段 2.1-2.2 (简单组件)
**周四-周五**: 阶段 2.3 (富文本输入框)
**周六**: 阶段 3 (LLM 集成)
**周日**: 阶段 4 (集成测试) + Bug 修复

---

## ⚠️ 五、风险点与缓解措施

### 5.1 技术风险

| 风险 | 影响 | 概率 | 缓解措施 |
|------|------|------|----------|
| **ContentEditable 跨浏览器兼容性** | 高 | 中 | 在 Chrome/Safari/Firefox 充分测试，准备 Polyfill |
| **富文本光标处理复杂** | 高 | 高 | 提前做技术验证，准备降级方案 (简化为普通输入框 + 按钮选择) |
| **HuiHiFi API 稳定性** | 中 | 低 | 后端添加缓存、重试、降级策略 |
| **LLM 解析 UUID 错误** | 中 | 中 | 前后端双重验证，清晰的错误提示 |

### 5.2 降级方案

如果富文本输入开发受阻，**降级方案**:
```
普通 <textarea> + 独立的"选择产品"按钮
  ↓
点击按钮 → 弹出产品列表
  ↓
选择后 → 在输入框插入特殊标记 `[Product:uuid:name]`
  ↓
提交时解析标记 → 转换为元数据
```

优点: 实现简单，100% 可控
缺点: 用户体验略差

---

## ✅ 六、验收标准

### 6.1 功能验收
- [ ] 用户输入 `@` 触发产品搜索
- [ ] 搜索响应时间 < 500ms
- [ ] 产品显示为不可编辑的 Chip
- [ ] Chip 删除时整体删除
- [ ] LLM 正确解析元数据并返回 `segment_cover`
- [ ] 前端正确调用 `coverSegmentFromLLM`
- [ ] 所有错误场景有友好提示

### 6.2 代码质量
- [ ] TypeScript 无错误
- [ ] 组件职责清晰，单一职责原则
- [ ] 无循环依赖
- [ ] 关键函数有单元测试
- [ ] 代码有充分注释

### 6.3 性能指标
- [ ] 搜索 API < 500ms (P95)
- [ ] LLM 首字节响应 < 2s
- [ ] 输入框响应流畅 (无卡顿)
- [ ] Bundle 增量 < 100KB (gzip)

---

## 🎯 七、行动建议

### 立即开始 (本周)
1. ✅ **Review 本文档** - 确认技术方案
2. 🔥 **执行阶段 0** - 清理架构债务 (优先级最高)
3. 🔥 **技术验证** - ContentEditable Demo (降低风险)

### 暂缓开发 (等待确认)
- ⏸️ 暂缓后端 API 开发，等待前端 API 契约确定

### 需要决策
- ❓ **富文本方案确认**: ContentEditable vs 降级方案？
- ❓ **工期确认**: 1 周全职 or 2 周兼职？
- ❓ **优先级确认**: 是否先完成阶段 0-1，再评估是否继续？