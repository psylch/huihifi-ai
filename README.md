# AI HiFi Tuning 微前端架构

本项目使用乾坤（qiankun）微前端框架，将AI HiFi Tuning分为主应用和微应用两部分：
- 主应用（main-app）：负责手动模式和频率响应曲线显示
- 微应用（micro-app-ai）：负责AI辅助功能

## 项目结构

```
huihifi_ai/
├── main-app/                # 主应用
│   ├── src/
│   │   ├── components/      # 核心组件
│   │   │   ├── FileUploader.tsx         # 文件上传组件
│   │   │   ├── FilterManager.tsx        # 滤波器管理组件
│   │   │   └── FrequencyResponseChart.tsx  # 频率响应曲线组件
│   │   ├── store/           # 状态管理
│   │   │   └── useStore.ts  # Zustand状态管理
│   │   ├── utils/           # 工具函数
│   │   │   └── filterCalculations.ts  # 滤波器计算
│   │   ├── App.tsx          # 主应用入口组件
│   │   └── main.tsx         # 主应用入口文件，注册微应用
│   ├── index.html           # 主应用HTML入口
│   └── vite.config.ts       # Vite配置
│
├── micro-app-ai/            # AI助手微应用
│   ├── src/
│   │   ├── components/      # 微应用组件
│   │   │   ├── AIAssistant.tsx          # AI助手主组件
│   │   │   ├── ChatHistoryDisplay.tsx   # 聊天历史显示
│   │   │   ├── ChatInputArea.tsx        # 聊天输入区域
│   │   │   └── ManipulationAction.tsx   # 滤波器操作组件
│   │   ├── hooks/           # 自定义钩子
│   │   │   └── useStreamingLLM.tsx      # LLM流式处理
│   │   ├── store/           # 状态管理
│   │   │   └── MicroAppContext.tsx      # 微应用上下文
│   │   ├── App.tsx          # 微应用入口组件
│   │   └── main.tsx         # 微应用入口文件，导出生命周期钩子
│   ├── index.html           # 微应用HTML入口
│   └── vite.config.ts       # Vite配置
│
└── aihifi/                  # 原始项目代码（参考）
```

## 技术栈

- React + TypeScript
- Zustand（状态管理）
- Recharts（图表绘制）
- 乾坤（qiankun - 微前端框架）
- Vite（构建工具）

## 启动项目

### 安装依赖

```bash
# 安装主应用依赖
cd main-app
npm install

# 安装微应用依赖
cd ../micro-app-ai
npm install
```

### 启动项目

需要同时启动主应用和微应用：

```bash
# 启动主应用（端口8080）
cd main-app
npm run dev

# 新开终端窗口，启动微应用（端口8081）
cd micro-app-ai
npm run dev
```

访问 http://localhost:8080 即可打开应用。

## 应用功能

### 主应用

- 文件上传：支持上传TXT或CSV格式的频率响应数据
- 频率响应曲线显示：显示原始和处理后的频率响应曲线
- 滤波器管理：添加、编辑、删除滤波器
- 模式切换：在手动模式和AI辅助模式之间切换

### 微应用（AI助手）

- AI聊天界面：与AI助手交流，获取调音建议
- 滤波器操作：通过AI推荐添加、编辑或删除滤波器
- 操作确认：查看AI推荐的滤波器操作并确认应用

## 微前端集成

- 主应用通过qiankun框架注册并加载微应用
- 主应用向微应用传递曲线数据、已应用的滤波器列表和回调函数
- 微应用使用主应用提供的回调函数来操作滤波器
- 主应用和微应用可以独立开发和部署
