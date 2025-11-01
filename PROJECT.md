# AI HiFi Tuning 项目说明

## 项目概述

AI HiFi Tuning 是一个音频均衡器调谐应用，旨在通过直观的界面和AI辅助功能，帮助用户优化音频设备的频率响应。项目采用微前端架构，分为两个主要模块：主应用和AI助手微应用。

## 项目结构

```
.
├── main-app/          # 主应用 - 频率响应和滤波器管理
├── micro-app-ai/      # AI助手微应用 - 提供AI辅助调谐功能
```

## 功能模块

### 主应用 (main-app)

主应用负责核心的频率响应数据处理和滤波器管理功能：

- **文件上传功能**：支持多种格式的频率响应数据文件上传（CSV、TXT、JSON格式）
- **频率响应可视化**：通过图表直观显示频率响应曲线
- **滤波器管理**：创建、编辑、删除均衡器滤波器
- **实时滤波效果预览**：应用滤波器后的频率响应实时预览
- **微前端容器**：集成AI助手微应用的容器

主要文件：
- `FileUploader.tsx`: 处理文件上传和数据解析
- `FrequencyResponseChart.tsx`: 频率响应曲线可视化
- `FilterManager.tsx`: 滤波器管理界面
- `useStore.ts`: 状态管理
- `filterCalculations.ts`: 滤波算法实现

### AI助手微应用 (micro-app-ai)

AI助手微应用提供智能化的滤波器调谐建议：

- **AI对话界面**：用户可以通过自然语言与AI助手交流
- **自动滤波器推荐**：基于频率响应数据和用户描述自动推荐滤波器参数
- **滤波器操作**：支持添加、编辑和删除滤波器操作
- **音频描述理解**：理解用户对音频特性的描述（如"低音太弱"、"高音刺耳"等）

主要文件：
- `AIAssistant.tsx`: AI助手主界面
- `useStreamingLLM.tsx`: 与LLM API的交互逻辑
- `MicroAppContext.tsx`: 微应用状态管理和与主应用通信

## 技术栈

- **前端框架**：React + TypeScript
- **构建工具**：Vite
- **微前端框架**：qiankun
- **状态管理**：自定义hooks (useStore)
- **图表可视化**：自定义图表组件
- **AI集成**：LLM API集成

## 当前技术卡点

### 微前端集成问题

目前面临的主要卡点是qiankun微前端框架加载Vite开发服务器的微应用时出现的模块加载错误：

```
qiankun] lifecycle not found from ai-assistant entry exports, fallback to get from window['ai-assistant']
```

```
Uncaught QiankunError2: application 'ai-assistant' died in status LOADING_SOURCE_CODE: [qiankun]: You need to export lifecycle functions in ai-assistant entry
```

**问题分析**：

1. **核心问题**：qiankun无法识别和加载Vite开发服务器提供的ESM模块格式的微应用生命周期函数
   
2. **已尝试解决方案**：
   - 已创建非模块化入口脚本 (`qiankun-entry.js`)
   - 已在window对象上正确挂载生命周期函数
   - 修改了微应用的渲染逻辑以支持qiankun的加载方式

3. **可能的解决方向**：
   - 进一步调整qiankun的加载配置
   - 考虑使用专用的qiankun-vite插件
   - 修改微应用的构建配置，确保兼容qiankun的加载机制
   - 在生产环境打包部署，避免开发环境的模块兼容问题

### JSON文件格式支持

已完成对JSON格式频率响应数据的支持，包括：
- 支持多种JSON数据结构 (二维数组、对象数组)
- 处理带/不带标题行的数据格式
- 数据验证和错误处理优化
- 图表组件中的数据解析优化

## 下一步计划

1. 解决qiankun微前端集成问题，确保AI助手微应用可以在主应用中正常加载和运行
2. 完善AI助手的滤波器操作功能，特别是对编辑操作的支持
3. 优化用户界面和交互体验
4. 增强数据处理和验证的稳定性

## 寻求帮助

当前需要解决的核心技术问题是qiankun微前端框架与Vite开发服务器的兼容性问题，特别是关于ES模块在qiankun环境中的加载机制。如果您有相关经验，特别是在qiankun + Vite技术栈的集成方面，希望能提供一些解决思路。
