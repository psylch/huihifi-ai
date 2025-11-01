// (function() {
//   // 修复import语句问题的临时方案
//   if (window.__POWERED_BY_QIANKUN__) {
//     // 当作为子应用被qiankun加载时，劫持动态import
//     window.__ORIGINAL_IMPORT__ = window.import;
//     window.import = function(url) {
//       return window.__ORIGINAL_IMPORT__(url.replace('/@fs/', '/'));
//     };
//   }
// })();

(function() {
  console.log('[qiankun-helper] 初始化...');
  
  // 确保qiankun环境变量正确设置
  if (typeof window.__POWERED_BY_QIANKUN__ === 'undefined') {
    window.__POWERED_BY_QIANKUN__ = false;
  }
  
  // 修复import语句问题的临时方案
  if (window.__POWERED_BY_QIANKUN__) {
    console.log('[qiankun-helper] 检测到qiankun环境，应用修复...');
    
    // 当作为子应用被qiankun加载时，处理可能的路径问题
    if (window.__ORIGINAL_IMPORT__) {
      // 避免重复劫持
      return;
    }
    
    window.__ORIGINAL_IMPORT__ = window.import;
    window.import = function(url) {
      // 修复可能的文件系统路径问题
      const fixedUrl = url.replace('/@fs/', '/');
      console.log('[qiankun-helper] 修复导入路径:', url, '->', fixedUrl);
      return window.__ORIGINAL_IMPORT__(fixedUrl);
    };
  } else {
    console.log('[qiankun-helper] 独立运行模式，跳过路径修复');
  }
  
  // 确保生命周期函数导出兼容性
  window.ensureLifecycleExport = function(appName, lifecycles) {
    // 多种方式确保生命周期函数能被找到
    window[appName] = lifecycles;
    window.bootstrap = lifecycles.bootstrap;
    window.mount = lifecycles.mount;  
    window.unmount = lifecycles.unmount;
    window.update = lifecycles.update;
    
    console.log('[qiankun-helper] 生命周期函数已导出:', appName);
  };
})();