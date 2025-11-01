// 确保公共路径在最前面设置
// 已经在HTML中通过public-path.js设置了，这里不需要再导入

// // 使用vite-plugin-qiankun提供的renderWithQiankun处理微应用生命周期
// renderWithQiankun(lifecycles);

// // 如果不是在qiankun环境下运行，则进行独立渲染
// if (!qiankunWindow.__POWERED_BY_QIANKUN__) {
//   console.log('[ai-assistant] 独立运行中...');
//   render({});
// }

// 确保公共路径在最前面设置
// 已经在HTML中通过public-path.js设置了，这里不需要再导入

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/index.css';
// 引入vite-plugin-qiankun提供的工具
import { renderWithQiankun, qiankunWindow } from 'vite-plugin-qiankun/dist/helper';

let root: ReactDOM.Root | null = null;

/**
 * 渲染函数
 * 两种情况：1) 作为微应用运行时会提供相应的props；2) 独立运行时不会提供props
 */
function render(props: any = {}) {
  const { container } = props;
  // 确定挂载容器
  const targetNode = container ? container.querySelector('#root') : document.getElementById('root');

  if (!targetNode) {
    console.error('未找到渲染容器');
    return;
  }
  
  // 如果已有root实例，先卸载
  if (root) {
    root.unmount();
  }
  
  console.log('[ai-assistant] 渲染微应用，环境:', qiankunWindow.__POWERED_BY_QIANKUN__ ? 'qiankun' : '独立');
  console.log('[ai-assistant] 传递给微应用的props:', props);
  
  root = ReactDOM.createRoot(targetNode);
  root.render(
    <React.StrictMode>
      <App {...props} />
    </React.StrictMode>
  );
}

// 定义生命周期方法
const lifecycles = {
  // bootstrap - 微应用初始化时调用一次
  bootstrap() {
    console.log('[ai-assistant] 微应用启动中...');
    return Promise.resolve();
  },
  // mount - 每次进入微应用时调用
  mount(props: any) {
    console.log('[ai-assistant] 微应用挂载...', props);
    // 监听全局状态变更（如果存在）
    if (props.onGlobalStateChange) {
      props.onGlobalStateChange((state: any, prev: any) => {
        console.log('[ai-assistant] 全局状态变更:', state, prev);
      });
    }
    render(props);
    return Promise.resolve();
  },
  // unmount - 每次离开微应用时调用
  unmount() {
    console.log('[ai-assistant] 微应用卸载...');
    if (root) {
      root.unmount();
      root = null;
    }
    return Promise.resolve();
  },
  // update - 可选的update生命周期
  update(props: any) {
    console.log('[ai-assistant] 微应用更新...', props);
    return Promise.resolve();
  }
};

// 确保生命周期函数在所有环境下都能被正确导出
// 直接挂载到window对象，确保qiankun能找到
(window as any).bootstrap = lifecycles.bootstrap;
(window as any).mount = lifecycles.mount;
(window as any).unmount = lifecycles.unmount;
(window as any).update = lifecycles.update;

// 同时也挂载微应用对象，支持不同的加载方式
(window as any)['ai-assistant'] = {
  bootstrap: lifecycles.bootstrap,
  mount: lifecycles.mount,
  unmount: lifecycles.unmount,
  update: lifecycles.update
};

// 使用vite-plugin-qiankun提供的renderWithQiankun处理微应用生命周期
renderWithQiankun(lifecycles);

// 如果不是在qiankun环境下运行，则进行独立渲染
if (!qiankunWindow.__POWERED_BY_QIANKUN__) {
  console.log('[ai-assistant] 独立运行中...');
  render({});
}