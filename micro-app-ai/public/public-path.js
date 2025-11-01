// public-path.js
// 这个文件用于处理qiankun微应用的公共路径设置
// 它需要在入口HTML中尽早加载

// (function() {
//   if (window.__POWERED_BY_QIANKUN__) {
//     // 如果是在qiankun环境下运行，使用qiankun注入的publicPath
//     // 这是qiankun提供的标准机制
//     __webpack_public_path__ = window.__INJECTED_PUBLIC_PATH_BY_QIANKUN__;
//     console.log('[micro-app] Running in qiankun environment, using injected public path:', __webpack_public_path__);
//   } else {
//     // 如果是独立运行，使用完整URL作为publicPath
//     // 判断是否是生产环境（根据URL判断）
//     const isProduction = window.location.href.includes('windsurf.build');
//     if (isProduction) {
//       __webpack_public_path__ = 'https://huihifi-ai-assistant.windsurf.build/';
//       console.log('[micro-app] Running standalone in production, using absolute public path');
//     } else {
//       // 本地开发环境，使用相对路径
//       __webpack_public_path__ = './';
//       console.log('[micro-app] Running standalone in development, using relative public path');
//     }
//   }
// })();

// public-path.js
// 智能处理微应用的公共路径设置

(function() {
  console.log('[micro-app] 初始化公共路径设置...');
  
  // 生产环境的基础URL
  //const PRODUCTION_BASE_URL = 'http://49.232.175.67:8080/';
  const PRODUCTION_BASE_URL = 'https://ai.huihifi.com/aituning/';
  
  // 判断是否在生产环境
  const isProduction = window.location.hostname !== 'localhost' && 
                      window.location.hostname !== '127.0.0.1';
  
  let publicPath;
  
  if (window.__POWERED_BY_QIANKUN__) {
    console.log('[micro-app] 在qiankun环境中运行');
    
    // 在qiankun环境中，优先使用注入的路径
    if (window.__INJECTED_PUBLIC_PATH_BY_QIANKUN__) {
      publicPath = window.__INJECTED_PUBLIC_PATH_BY_QIANKUN__;
      console.log('[micro-app] 使用qiankun注入的路径:', publicPath);
    } else {
      // 如果qiankun没有注入路径，使用我们的服务器地址
      publicPath = PRODUCTION_BASE_URL;
      console.log('[micro-app] qiankun未注入路径，使用服务器地址:', publicPath);
    }
  } else {
    console.log('[micro-app] 独立运行模式');
    
    if (isProduction) {
      publicPath = PRODUCTION_BASE_URL;
      console.log('[micro-app] 生产环境独立运行，使用服务器地址:', publicPath);
    } else {
      publicPath = '/';
      console.log('[micro-app] 开发环境独立运行，使用相对路径');
    }
  }
  
  // 设置全局公共路径
  if (typeof __webpack_public_path__ !== 'undefined') {
    __webpack_public_path__ = publicPath;
  }
  
  // 为其他脚本提供公共路径
  window.__MICRO_APP_PUBLIC_PATH__ = publicPath;
  
  console.log('[micro-app] 最终设置的公共路径:', publicPath);
})();