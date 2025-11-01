/**
 * 微应用独立启动脚本
 * 用于在qiankun环境中初始化应用
 */
(function() {
  // 全局状态存储
  let root = null;
  let microAppProps = null;
  
  // 初始化微应用
  window.initMicroApp = function(props, container) {
    console.log('初始化微应用...', props);
    microAppProps = props;
    
    // 如果没有React或ReactDOM，从CDN加载它们
    const loadReactFromCDN = () => {
      return new Promise((resolve) => {
        if (window.React && window.ReactDOM) {
          resolve();
          return;
        }
        
        // 加载React
        const reactScript = document.createElement('script');
        reactScript.src = 'https://unpkg.com/react@18/umd/react.production.min.js';
        reactScript.crossOrigin = '';
        
        // 加载ReactDOM
        const reactDomScript = document.createElement('script');
        reactDomScript.src = 'https://unpkg.com/react-dom@18/umd/react-dom.production.min.js';
        reactDomScript.crossOrigin = '';
        
        reactScript.onload = () => {
          document.head.appendChild(reactDomScript);
        };
        
        reactDomScript.onload = () => {
          resolve();
        };
        
        document.head.appendChild(reactScript);
      });
    };
    
    // 渲染应用
    const renderApp = () => {
      // 创建React根元素
      root = window.ReactDOM.createRoot(container);
      
      // 渲染一个简单的React组件
      const App = window.React.createElement('div', {
        style: {
          padding: '20px',
          fontFamily: 'Arial, sans-serif'
        }
      }, [
        window.React.createElement('h2', {
          key: 'title',
          style: { color: '#333' }
        }, 'AI助手微应用 (qiankun模式)'),
        window.React.createElement('p', {
          key: 'desc',
          style: { marginBottom: '15px' }
        }, '微应用已成功加载。这是临时UI，完整功能正在开发中。'),
        window.React.createElement('button', {
          key: 'btn',
          style: {
            padding: '8px 16px',
            backgroundColor: '#4CAF50',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          },
          onClick: () => {
            alert('共享数据：' + JSON.stringify(props.getSharedData ? props.getSharedData() : {}));
          }
        }, '查看共享数据')
      ]);
      
      root.render(App);
    };
    
    // 加载React后渲染应用
    loadReactFromCDN().then(renderApp);
  };
  
  // 卸载微应用
  window.unmountMicroApp = function() {
    console.log('卸载微应用...');
    if (root) {
      root.unmount();
      root = null;
    }
    microAppProps = null;
  };
})();
