// import React from 'react';
// import ReactDOM from 'react-dom/client';
// import { registerMicroApps, start } from 'qiankun';
// import App from './App';
// import './styles/index.css';
// import { useStore } from './store/useStore';

// // 注册微应用
// registerMicroApps([
//   {
//     name: 'ai-assistant', // 微应用的名称
//     entry: 'https://ai.huihifi.com/aituning/',
//     //entry: '//localhost:8081/', // 直接使用Vite开发服务器地址，
//     //entry: 'http://49.232.175.67:8080/',
//     container: '#micro-app-container', // 微应用的容器节点
//     activeRule: '/ai-assistant', // 微应用的激活规则
//     props: { // 传递给微应用的属性
//       getSharedData: () => {
//         // 从 store 中获取需要共享的数据
//         const state = useStore.getState();
//         const { originalDataSource, appliedFilters, currentProcessedCurve } = state;
//         return {
//           originalDataSource,
//           appliedFilters,
//           currentProcessedCurve
//         };
//       },
//       // 提供回调函数，用于微应用调用
//       callbacks: {
//         addFilterFromLLM: (filterParams: any) => {
//           const { addFilterFromLLM } = useStore.getState();
//           return addFilterFromLLM(filterParams);
//         },
//         editFilterFromLLM: (filterId: string, filterParams: any) => {
//           const { editFilterFromLLM } = useStore.getState();
//           return editFilterFromLLM(filterId, filterParams);
//         },
//         deleteFilterFromLLM: (filterId: string) => {
//           const { deleteFilterFromLLM } = useStore.getState();
//           return deleteFilterFromLLM(filterId);
//         }
//       },
//       // 传递调试设置，控制微应用的调试信息显示
//       debugSettings: {
//         // 设为true启用调试功能，false关闭调试功能
//         enabled: false,
//         // 设为true默认显示调试信息，false默认隐藏
//         defaultVisible: false
//       }
//     }
//   }
// ]);

// // 启动 qiankun
// start();

// ReactDOM.createRoot(document.getElementById('root')!).render(
//   <React.StrictMode>
//     <App />
//   </React.StrictMode>
// );

import React from 'react';
import ReactDOM from 'react-dom/client';
import { registerMicroApps, start } from 'qiankun';
import App from './App';
import './styles/index.css';
import { useStore } from './store/useStore';

// 生成一个mock userToken用于测试
const generateMockUserToken = () => {
  // 简单的mock token，实际使用时应该是主站提供的真实token
  const timestamp = Date.now();
  const randomStr = Math.random().toString(36).substring(18, 24);
  return `mock_token_${timestamp}_${randomStr}`;
};

// 获取或生成mock token（在sessionStorage中持久化，方便测试）
const getMockUserToken = () => {
  let token = sessionStorage.getItem('mock_user_token');
  if (!token) {
    token = generateMockUserToken();
    sessionStorage.setItem('mock_user_token', token);
    console.log('生成新的mock userToken:', token);
  }
  return token;
};

// 注册微应用
registerMicroApps([
  {
    name: 'ai-assistant', // 微应用的名称
    //entry: 'https://ai.huihifi.com/aituning/',
    entry: '//localhost:8081/', // 直接使用Vite开发服务器地址，
    //entry: 'http://49.232.175.67:8080/',
    container: '#micro-app-container', // 微应用的容器节点
    activeRule: '/ai-assistant', // 微应用的激活规则
    props: { // 传递给微应用的属性
      getSharedData: () => {
        // 从 store 中获取需要共享的数据
        const state = useStore.getState();
        const { originalDataSource, appliedFilters, currentProcessedCurve } = state;
        return {
          originalDataSource,
          appliedFilters,
          currentProcessedCurve
        };
      },
      // 提供回调函数，用于微应用调用
      callbacks: {
        addFilterFromLLM: (filterParams: any) => {
          const { addFilterFromLLM } = useStore.getState();
          return addFilterFromLLM(filterParams);
        },
        editFilterFromLLM: (filterId: string, filterParams: any) => {
          const { editFilterFromLLM } = useStore.getState();
          return editFilterFromLLM(filterId, filterParams);
        },
        deleteFilterFromLLM: (filterId: string) => {
          const { deleteFilterFromLLM } = useStore.getState();
          return deleteFilterFromLLM(filterId);
        }
      },
      // 传递调试设置，控制微应用的调试信息显示
      debugSettings: {
        // 设为true启用调试功能，false关闭调试功能
        enabled: true,  // 改为true，方便测试时查看状态
        // 设为true默认显示调试信息，false默认隐藏
        defaultVisible: true
      },
      // 添加mock userToken用于测试使用次数管理
      userToken: getMockUserToken()
    }
  }
]);

// 启动 qiankun
start();

// 添加一个开发工具，方便测试时重置token
if (process.env.NODE_ENV === 'development') {
  (window as any).resetMockToken = () => {
    sessionStorage.removeItem('mock_user_token');
    const newToken = getMockUserToken();
    console.log('重置mock userToken:', newToken);
    // 刷新页面使新token生效
    window.location.reload();
  };
  console.log('开发模式：可以使用 resetMockToken() 重置用户token');
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);