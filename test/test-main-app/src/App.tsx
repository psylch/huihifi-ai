import React from 'react';
import { useStore } from './store/useStore';
import FileUploader from './components/FileUploader';
import FrequencyResponseChart from './components/FrequencyResponseChart';
import FilterManager from './components/FilterManager';

const App: React.FC = () => {
  const { uiState, originalDataSource, setUIMode } = useStore();
  const { currentMode, globalError } = uiState;
  const [microAppVisible, setMicroAppVisible] = React.useState(false);
  
  // 切换到AI辅助模式时显示微应用
  React.useEffect(() => {
    if (currentMode === 'ai_assisted') {
      // 先确保容器可见
      setMicroAppVisible(true);
      // 使用setTimeout确保DOM已更新
      setTimeout(() => {
        // 再触发路由变化加载微应用
        window.history.pushState({}, '', '/ai-assistant');
        console.log('AI助手微应用容器已准备就绪，正在加载微应用...');
      }, 100);
    } else {
      // 切换回主应用模式
      window.history.pushState({}, '', '/');
      setMicroAppVisible(false);
    }
  }, [currentMode]);
  
  // 切换AI辅助模式和手动模式
  const toggleAIMode = () => {
    setUIMode(currentMode === 'ai_assisted' ? 'manual' : 'ai_assisted');
  };
  
  return (
    <div className="container">
      {/* 顶部区域 - 标题和模式切换按钮 */}
      <header style={{ 
        padding: '1rem 0',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <h1>AI HiFi Tuning</h1>
        
        {originalDataSource && (
          <button 
            onClick={toggleAIMode}
            style={{
              backgroundColor: currentMode === 'ai_assisted' ? 'var(--surface-dark)' : 'var(--primary-color)',
              border: currentMode === 'ai_assisted' ? '1px solid var(--primary-color)' : 'none',
              color: currentMode === 'ai_assisted' ? 'var(--primary-color)' : 'white'
            }}
          >
            {currentMode === 'ai_assisted' ? '手动模式' : 'AI辅助模式'}
          </button>
        )}
      </header>
      
      {/* 错误信息显示 */}
      {globalError && (
        <div className="error card">
          {globalError}
        </div>
      )}
      
      {/* 主要内容区域 */}
      <main>
        {/* 文件上传区域 */}
        {(currentMode === 'upload' || uiState.isUploadMinimized) && (
          <FileUploader />
        )}
        
        {/* 上传后显示图表和滤波器 */}
        {originalDataSource && (
          <>
            {currentMode === 'manual' ? (
              <div>
                <FrequencyResponseChart />
                <FilterManager />
              </div>
            ) : (
              <div className="ai-mode-layout">
                {/* AI辅助模式下，显示微应用容器 */}
                <div id="micro-app-container" className="card" style={{ 
                  minHeight: '800px', 
                  height: 'auto', 
                  display: microAppVisible ? 'flex' : 'none',
                  flexDirection: 'column',
                  overflow: 'visible'
                }}>
                  <p>加载AI助手中...</p>
                </div>
                <div>
                  <FrequencyResponseChart />
                  <FilterManager />
                </div>
              </div>
            )}
          </>
        )}
      </main>
      
      {/* 页脚 */}
      <footer style={{ 
        marginTop: '2rem', 
        textAlign: 'center',
        padding: '1rem',
        borderTop: '1px solid #333',
        color: '#999',
        fontSize: '0.9rem'
      }}>
        <p>AI HiFi Tuning - v1.0 - 耳机频率响应分析与AI调节工具</p>
      </footer>
    </div>
  );
};

export default App;
