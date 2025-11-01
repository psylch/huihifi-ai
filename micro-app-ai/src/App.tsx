import React, { useEffect, useState } from 'react';
import AIAssistant from './components/AIAssistant';
import { StoreProvider } from './store/MicroAppContext';
import { FilterParams, FilterManipulation, FrequencyResponseData } from './types';
import { aiConfig } from './config/aiConfig';
import CurveImageDisplay from './components/CurveImageDisplay';
import { qiankunWindow } from 'vite-plugin-qiankun/dist/helper';

// 定义默认的共享数据类型 - 只包含与主应用交互的必要数据
type SharedDataType = {
  originalDataSource: FrequencyResponseData | null;
  appliedFilters: FilterParams[];
  currentProcessedCurve: FrequencyResponseData | null;
  // currentCurveImageDataURL 移除，由微应用内部管理
};

const defaultSharedData: SharedDataType = {
  originalDataSource: null,
  appliedFilters: [],
  currentProcessedCurve: null
};

interface AppProps {
  getSharedData?: () => SharedDataType;
  callbacks?: {
    addFilterFromLLM: (filterParams: FilterManipulation['filterParams']) => void;
    editFilterFromLLM: (filterId: string, filterParams: FilterManipulation['filterParams']) => boolean;
    deleteFilterFromLLM: (filterId: string) => boolean;
  };
  // 调试信息设置，由主应用传入
  debugSettings?: {
    enabled?: boolean;
    defaultVisible?: boolean;
  };
  // 用户认证token，由主应用传入
  userToken?: string;
}

// 错误边界组件
class ErrorFallback extends React.Component<{children: React.ReactNode}> {
  state = { hasError: false, error: null };
  
  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }
  
  componentDidCatch(error: any, info: any) {
    console.error("AI助手微应用错误:", error, info);
  }
  
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '20px', color: '#ff6b6b', backgroundColor: '#fff0f0', borderRadius: '4px', border: '1px solid #ffcccc' }}>
          <h3>助手加载出错</h3>
          <p>请刷新页面或联系开发人员</p>
        </div>
      );
    }
    
    return this.props.children;
  }
}

const App: React.FC<AppProps> = (props) => {
  // 安全地初始化状态，避免使用props直接初始化
  const [sharedData, setSharedData] = useState<SharedDataType>(defaultSharedData);
  
  // 应用调试设置（如果由主应用传入）
  useEffect(() => {
    // 检查是否有调试设置传入
    if (props.debugSettings) {
      // 使用aiConfig的updateDebugSettings方法更新设置
      aiConfig.updateDebugSettings(props.debugSettings);
    }
  }, [props.debugSettings]);
  
  // 调试信息显示状态
  const [showDebugInfo, setShowDebugInfo] = useState<boolean>(aiConfig.debugInfo.defaultVisible);

  // 定时从主应用获取共享数据
  useEffect(() => {
    // 安全地获取数据
    const safeGetData = () => {
      try {
        if (props.getSharedData) {
          const data = props.getSharedData();
          // 检查返回的数据是否合法
          if (data && typeof data === 'object') {
            return data;
          }
        }
        return null;
      } catch (error) {
        console.error('获取共享数据错误:', error);
        return null;
      }
    };
    
    // 首次尝试获取数据
    const initialData = safeGetData();
    if (initialData) {
      setSharedData(initialData);
    }

    // 设置定时获取数据的定时器
    const timer = setInterval(() => {
      try {
        const data = safeGetData();
        if (data) {
          setSharedData(prevData => {
            // 仅在数据变化时更新，防止不必要的渲染
            try {
              if (
                JSON.stringify(prevData.appliedFilters) !== JSON.stringify(data.appliedFilters) ||
                JSON.stringify(prevData.originalDataSource) !== JSON.stringify(data.originalDataSource) ||
                JSON.stringify(prevData.currentProcessedCurve) !== JSON.stringify(data.currentProcessedCurve)
              ) {
                return data;
              }
              return prevData;
            } catch (error) {
              // JSON序列化可能失败，此时直接返回新数据
              console.error('数据比较错误:', error);
              return data;
            }
          });
        }
      } catch (error) {
        console.error('定时更新数据失败:', error);
      }
    }, 1000);

    // 清理定时器
    return () => {
      try {
        clearInterval(timer);
      } catch (error) {
        console.error('清理定时器失败:', error);
      }
    };
  }, [props.getSharedData]);

  // 使用vite-plugin-qiankun提供的qiankunWindow来检测微应用环境
  const isInQiankun = qiankunWindow.__POWERED_BY_QIANKUN__ === true;
  
  console.log("微应用模式检测(修正后):", { 
    isPoweredByQiankun: qiankunWindow.__POWERED_BY_QIANKUN__, 
    isInQiankun: isInQiankun
  });

  // 准备回调函数
  const callbacks = {
    addFilterFromLLM: (params: any) => {
      try {
        if (props.callbacks?.addFilterFromLLM) {
          return props.callbacks.addFilterFromLLM(params);
        }
        console.log('模拟添加滤波器:', params);
        return undefined;
      } catch (error) {
        console.error('添加滤波器失败:', error);
        return undefined;
      }
    },
    editFilterFromLLM: (id: string, params: any) => {
      try {
        if (props.callbacks?.editFilterFromLLM) {
          return props.callbacks.editFilterFromLLM(id, params);
        }
        console.log('模拟编辑滤波器:', id, params);
        return true;
      } catch (error) {
        console.error('编辑滤波器失败:', error);
        return false;
      }
    },
    deleteFilterFromLLM: (id: string) => {
      try {
        if (props.callbacks?.deleteFilterFromLLM) {
          return props.callbacks.deleteFilterFromLLM(id);
        }
        console.log('模拟删除滤波器:', id);
        return true;
      } catch (error) {
        console.error('删除滤波器失败:', error);
        return false;
      }
    },
  };

  // 返回JSX元素，使用错误边界包装
  // return (
  //   <div className="micro-app-ai-container">
  //     <StoreProvider sharedData={sharedData} callbacks={callbacks}>
  //       {isInQiankun ? (
  //         <ErrorFallback>
  //           <div style={{ padding: '0px', height: '100%', display: 'flex', flexDirection: 'column' }}> {/* Use 100% height instead of 100vh for better embedding */}
  //             <h1 style={{ marginBottom: '20px', fontSize: '1.5rem', paddingLeft: '20px', paddingTop: '20px' }}>千歌AI助手</h1>
  //             <div style={{ 
  //               flexGrow: 1, // Allow content to take available space
  //               display: 'grid',
  //               gridTemplateColumns: aiConfig.debugInfo.enabled && showDebugInfo ? '1fr 1fr' : '1fr',
  //               gap: '20px',
  //               padding: '0 20px 20px 20px', // Add padding around the grid
  //               overflowY: 'auto' // Add scroll for content if it overflows
  //             }}>
  //               <AIAssistant />
                
  //               {/* Debug information panel for micro-app mode */}
  //               {aiConfig.debugInfo.enabled && showDebugInfo && (
  //                 <div style={{overflowY: 'auto'}}> {/* Allow scrolling within the debug panel */}
  //                   <div className="card">
  //                     <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
  //                       <h2>当前数据状态</h2>
  //                       <button 
  //                         onClick={() => setShowDebugInfo(!showDebugInfo)}
  //                         style={{
  //                           padding: '4px 8px',
  //                           backgroundColor: showDebugInfo ? '#dc3545' : '#28a745',
  //                           color: '#fff',
  //                           border: 'none',
  //                           borderRadius: '4px',
  //                           cursor: 'pointer'
  //                         }}
  //                       >
  //                         {showDebugInfo ? '隐藏' : '显示'}调试信息
  //                       </button>
  //                     </div>
  //                     <>
  //                       <div style={{ marginBottom: '10px' }}>
  //                         <h3>原始数据</h3>
  //                         <pre style={{ 
  //                           overflowX: 'auto', 
  //                           padding: '8px', 
  //                           backgroundColor: 'var(--surface-light)',
  //                           borderRadius: '4px',
  //                           fontSize: '12px'
  //                         }}>
  //                           {JSON.stringify(sharedData.originalDataSource?.slice(0, 5), null, 2)} {sharedData.originalDataSource?.length ? `...共${sharedData.originalDataSource.length}条数据` : '无数据'}
  //                         </pre>
  //                       </div>
  //                       <div>
  //                         <h3>已应用滤波器</h3>
  //                         <pre style={{ 
  //                           overflowX: 'auto', 
  //                           padding: '8px', 
  //                           backgroundColor: 'var(--surface-light)',
  //                           borderRadius: '4px',
  //                           fontSize: '12px'
  //                         }}>
  //                           {JSON.stringify(sharedData.appliedFilters, null, 2) || '无应用的滤波器'}
  //                         </pre>
  //                       </div>
  //                       <div style={{ marginTop: '15px' }}>
  //                         <h3>频率响应曲线</h3>
  //                         <CurveImageDisplay />
  //                       </div>
  //                     </>
  //                   </div>
  //                 </div>
  //               )}
  //             </div>
  //           </div>
  //         </ErrorFallback>
  //       ) : (
  //         <div style={{ padding: '20px', height: '100%', margin: '0 auto', boxSizing: 'border-box' }}>
  //           <h1 style={{ marginBottom: '20px' }}>AI HiFi Tuning - AI助手 (独立运行模式)</h1>
  //           <div style={{ 
  //             display: 'grid',
  //             gridTemplateColumns: aiConfig.debugInfo.enabled && showDebugInfo ? '1fr 1fr' : '1fr',
  //             gap: '20px'
  //           }}>
  //             <AIAssistant />
              
  //             {/* 只有在aiConfig中启用调试信息时才显示调试区域 */}
  //             {aiConfig.debugInfo.enabled && showDebugInfo && (
  //               <div>
  //                 <div className="card">
  //                   <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
  //                     <h2>当前数据状态</h2>
  //                     <button 
  //                       onClick={() => setShowDebugInfo(!showDebugInfo)}
  //                       style={{
  //                         padding: '4px 8px',
  //                         backgroundColor: showDebugInfo ? '#dc3545' : '#28a745',
  //                         color: '#fff',
  //                         border: 'none',
  //                         borderRadius: '4px',
  //                         cursor: 'pointer'
  //                       }}
  //                     >
  //                       {showDebugInfo ? '隐藏' : '显示'}调试信息
  //                     </button>
  //                   </div>
                    
  //                   {showDebugInfo && (
  //                     <>
  //                       <div style={{ marginBottom: '10px' }}>
  //                         <h3>原始数据</h3>
  //                         <pre style={{ 
  //                           overflowX: 'auto', 
  //                           padding: '8px', 
  //                           backgroundColor: 'var(--surface-light)',
  //                           borderRadius: '4px',
  //                           fontSize: '12px'
  //                         }}>
  //                           {JSON.stringify(sharedData.originalDataSource?.slice(0, 5), null, 2)} {sharedData.originalDataSource?.length ? `...共${sharedData.originalDataSource.length}条数据` : '无数据'}
  //                         </pre>
  //                       </div>
  //                       <div>
  //                         <h3>已应用滤波器</h3>
  //                         <pre style={{ 
  //                           overflowX: 'auto', 
  //                           padding: '8px', 
  //                           backgroundColor: 'var(--surface-light)',
  //                           borderRadius: '4px',
  //                           fontSize: '12px'
  //                         }}>
  //                           {JSON.stringify(sharedData.appliedFilters, null, 2) || '无应用的滤波器'}
  //                         </pre>
  //                       </div>
  //                       <div style={{ marginTop: '15px' }}>
  //                         <h3>频率响应曲线</h3>
  //                         {/* 使用专门的曲线图显示组件，快事实现 */}
  //                         <CurveImageDisplay />
  //                       </div>
  //                     </>
  //                   )}
  //                 </div>
  //               </div>
  //             )}
  //           </div>
  //         </div>
  //       )}
  //     </StoreProvider>
  //   </div>
  // );

  // 返回JSX元素，使用错误边界包装
  return (
    <div className="micro-app-ai-container">
      <StoreProvider 
        sharedData={sharedData} 
        callbacks={callbacks}
        userToken={props.userToken} // 传递userToken给StoreProvider
      >
        {isInQiankun ? (
          <ErrorFallback>
            <div style={{ padding: '0px', height: '100%', display: 'flex', flexDirection: 'column' }}> {/* Use 100% height instead of 100vh for better embedding */}
              <h1 style={{ marginBottom: '20px', fontSize: '1.5rem', paddingLeft: '20px', paddingTop: '20px' }}>千歌AI助手</h1>
              <div style={{ 
                flexGrow: 1, // Allow content to take available space
                display: 'grid',
                gridTemplateColumns: aiConfig.debugInfo.enabled && showDebugInfo ? '1fr 1fr' : '1fr',
                gap: '20px',
                padding: '0 20px 20px 20px', // Add padding around the grid
                overflowY: 'auto' // Add scroll for content if it overflows
              }}>
                <AIAssistant />
                
                {/* Debug information panel for micro-app mode */}
                {aiConfig.debugInfo.enabled && showDebugInfo && (
                  <div style={{overflowY: 'auto'}}> {/* Allow scrolling within the debug panel */}
                    <div className="card">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                        <h2>当前数据状态</h2>
                        <button 
                          type="button"
                          onClick={() => setShowDebugInfo(!showDebugInfo)}
                          style={{
                            padding: '4px 8px',
                            backgroundColor: showDebugInfo ? '#dc3545' : '#28a745',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer'
                          }}
                        >
                          {showDebugInfo ? '隐藏' : '显示'}调试信息
                        </button>
                      </div>
                      <>
                        <div style={{ marginBottom: '10px' }}>
                          <h3>原始数据</h3>
                          <pre style={{ 
                            overflowX: 'auto', 
                            padding: '8px', 
                            backgroundColor: 'var(--surface-light)',
                            borderRadius: '4px',
                            fontSize: '12px'
                          }}>
                            {JSON.stringify(sharedData.originalDataSource?.slice(0, 5), null, 2)} {sharedData.originalDataSource?.length ? `...共${sharedData.originalDataSource.length}条数据` : '无数据'}
                          </pre>
                        </div>
                        <div>
                          <h3>已应用滤波器</h3>
                          <pre style={{ 
                            overflowX: 'auto', 
                            padding: '8px', 
                            backgroundColor: 'var(--surface-light)',
                            borderRadius: '4px',
                            fontSize: '12px'
                          }}>
                            {JSON.stringify(sharedData.appliedFilters, null, 2) || '无应用的滤波器'}
                          </pre>
                        </div>
                        <div style={{ marginTop: '15px' }}>
                          <h3>频率响应曲线</h3>
                          <CurveImageDisplay />
                        </div>
                        {props.userToken && (
                          <div style={{ marginTop: '15px' }}>
                            <h3>用户Token</h3>
                            <pre style={{ 
                              overflowX: 'auto', 
                              padding: '8px', 
                              backgroundColor: 'var(--surface-light)',
                              borderRadius: '4px',
                              fontSize: '12px'
                            }}>
                              {props.userToken.substring(0, 20)}...
                            </pre>
                          </div>
                        )}
                      </>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </ErrorFallback>
        ) : (
          <div style={{ padding: '20px', height: '100%', margin: '0 auto', boxSizing: 'border-box' }}>
            <h1 style={{ marginBottom: '20px' }}>千歌AI助手</h1>
            <div style={{ 
              display: 'grid',
              gridTemplateColumns: aiConfig.debugInfo.enabled && showDebugInfo ? '1fr 1fr' : '1fr',
              gap: '20px'
            }}>
              <AIAssistant />
              
              {/* 只有在aiConfig中启用调试信息时才显示调试区域 */}
              {aiConfig.debugInfo.enabled && showDebugInfo && (
                <div>
                  <div className="card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <h2>当前数据状态</h2>
                      <button
                        type="button"
                        onClick={() => setShowDebugInfo(!showDebugInfo)}
                        style={{
                          padding: '4px 8px',
                          backgroundColor: showDebugInfo ? '#dc3545' : '#28a745',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer'
                        }}
                      >
                        {showDebugInfo ? '隐藏' : '显示'}调试信息
                      </button>
                    </div>
                    
                    {showDebugInfo && (
                      <>
                        <div style={{ marginBottom: '10px' }}>
                          <h3>原始数据</h3>
                          <pre style={{ 
                            overflowX: 'auto', 
                            padding: '8px', 
                            backgroundColor: 'var(--surface-light)',
                            borderRadius: '4px',
                            fontSize: '12px'
                          }}>
                            {JSON.stringify(sharedData.originalDataSource?.slice(0, 5), null, 2)} {sharedData.originalDataSource?.length ? `...共${sharedData.originalDataSource.length}条数据` : '无数据'}
                          </pre>
                        </div>
                        <div>
                          <h3>已应用滤波器</h3>
                          <pre style={{ 
                            overflowX: 'auto', 
                            padding: '8px', 
                            backgroundColor: 'var(--surface-light)',
                            borderRadius: '4px',
                            fontSize: '12px'
                          }}>
                            {JSON.stringify(sharedData.appliedFilters, null, 2) || '无应用的滤波器'}
                          </pre>
                        </div>
                        <div style={{ marginTop: '15px' }}>
                          <h3>频率响应曲线</h3>
                          {/* 使用专门的曲线图显示组件，快事实现 */}
                          <CurveImageDisplay />
                        </div>
                        {props.userToken && (
                          <div style={{ marginTop: '15px' }}>
                            <h3>用户Token</h3>
                            <pre style={{ 
                              overflowX: 'auto', 
                              padding: '8px', 
                              backgroundColor: 'var(--surface-light)',
                              borderRadius: '4px',
                              fontSize: '12px'
                            }}>
                              {props.userToken.substring(0, 20)}...
                            </pre>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </StoreProvider>
    </div>
  );
};

export default App;
