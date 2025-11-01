/**
 * qiankun微前端入口文件
 * 专门解决qiankun加载Vite开发服务器的模块问题
 */
(function(global) {
  // 检测是否在qiankun环境中运行
  global.__POWERED_BY_QIANKUN__ = global.__POWERED_BY_QIANKUN__ || false;

  // 设置生命周期函数
  const bootstrap = async () => {
    console.log('微应用启动中(qiankun-entry)...');
    return Promise.resolve();
  };

  const mount = async (props) => {
    console.log('微应用挂载(qiankun-entry)...', props);
    
    // 创建一个容器元素，如果需要的话
    const { container } = props;
    const appContainer = container.querySelector('#root') || document.createElement('div');
    if (!appContainer.id) appContainer.id = 'root';
    if (!appContainer.parentNode) container.appendChild(appContainer);
    
    // 手动创建script加载实际的微应用
    return new Promise((resolve) => {
      // 动态加载主应用脚本 (使用普通脚本而非ES模块脚本)
      const scriptElement = document.createElement('script');
      // 为防止缓存问题，添加时间戳
      scriptElement.src = '/main-standalone.js?t=' + Date.now();
      scriptElement.onload = () => {
        // 脚本加载后，运行微应用初始化函数
        if (typeof window.initMicroApp === 'function') {
          window.initMicroApp(props, appContainer);
          resolve();
        }
      };
      document.head.appendChild(scriptElement);
    });
  };

  const unmount = async (props) => {
    console.log('微应用卸载(qiankun-entry)...');
    if (typeof window.unmountMicroApp === 'function') {
      window.unmountMicroApp(props);
    }
    return Promise.resolve();
  };

  // 关键点: qiankun需要根据微应用的名称找到对应的生命周期函数
  // 在window上挂载微应用对象
  global['ai-assistant'] = {
    bootstrap,
    mount,
    unmount
  };

  // 同时也将生命周期函数导出到window对象，以兼容不同的加载方式
  global.bootstrap = bootstrap;
  global.mount = mount;
  global.unmount = unmount;
})(window);
