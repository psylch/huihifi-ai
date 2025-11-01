// src/store/useStore.ts
import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { applyFiltersToData, validateFrequencyData } from '../utils/filterCalculations';

// 导出FilterParams类型以便在其他组件中使用
export type FilterType = 'peaking' | 'low_shelf' | 'high_shelf' | 'lowpass' | 'highpass';

export interface FilterParams {
  id: string;
  type: FilterType;
  freq: number;
  gain?: number;
  qFactor?: number;
};

// 来自LLM的滤波器操作
export interface FilterManipulation {
  manipulationType: 'add' | 'edit' | 'delete';
  filterId?: string; // 用于编辑和删除操作
  filterParams?: {
    filterType?: FilterType;
    freq?: number;
    gain?: number;
    qFactor?: number;
  }; // 用于添加和编辑操作
}

// 定义UI模式类型
export type UIMode = 'upload' | 'manual' | 'ai_assisted';

// Store状态类型
interface StoreState {
  // 数据
  originalDataSource: [string, string][] | null;
  appliedFilters: FilterParams[];
  currentProcessedCurve: [string, string][] | null;
  
  // UI状态
  currentCurveImageDataURL: string | null;
  uiState: {
    currentMode: UIMode;
    isUploadMinimized: boolean;
    globalError: string | null;
  };
  
  // 动作
  setOriginalData: (data: [string, string][]) => void;
  addFilter: (params: Omit<FilterParams, 'id'>) => string | undefined;
  deleteFilter: (id: string) => void;
  editFilter: (id: string, paramsToUpdate: Partial<Omit<FilterParams, 'id' | 'type'>>) => boolean;

  // LLM相关动作 - 供微应用使用
  addFilterFromLLM: (params: FilterManipulation['filterParams']) => void;
  editFilterFromLLM: (id: string, params: FilterManipulation['filterParams']) => boolean;
  deleteFilterFromLLM: (id: string) => boolean;
  
  setUIMode: (mode: UIMode) => void;
  setGlobalError: (error: string | null) => void;
  minimizeUpload: () => void;
  resetState: () => void;
  setCurrentCurveImageDataURL: (dataURL: string | null) => void;
}

// 初始状态
const initialState = {
  originalDataSource: null,
  appliedFilters: [],
  currentProcessedCurve: null,
  currentCurveImageDataURL: null,
  uiState: {
    currentMode: 'upload' as UIMode,
    isUploadMinimized: false,
    globalError: null,
  }
};

// 创建store
export const useStore = create<StoreState>((set, get): StoreState => ({
  ...initialState,
  
  setOriginalData: (data) => {
    const validation = validateFrequencyData(data);
    if (!validation.valid) {
      set(state => ({ uiState: { ...state.uiState, globalError: validation.error || '无效的数据格式' } }));
      return;
    }
    set(state => ({ 
      originalDataSource: data,
      currentProcessedCurve: data, // 初始时，处理后的曲线等于原始曲线
      uiState: { 
        ...state.uiState,
        currentMode: 'manual', // 成功加载数据后切换到手动模式
        globalError: null 
      } 
    }));
  },
  
  addFilter: (params) => {
    const { originalDataSource } = get();
    if (!originalDataSource) return;
    
    const newFilter = { ...params, id: uuidv4() };
    const updatedFilters = [...get().appliedFilters, newFilter];
    
    const processedCurve = applyFiltersToData(originalDataSource, updatedFilters);
    set({ appliedFilters: updatedFilters, currentProcessedCurve: processedCurve });
    
    return newFilter.id;
  },
  
  deleteFilter: (id) => {
    const { originalDataSource, appliedFilters } = get();
    const updatedFilters = appliedFilters.filter(filter => filter.id !== id);
    
    const processedCurve = originalDataSource 
      ? applyFiltersToData(originalDataSource, updatedFilters)
      : null;
      
    set({ appliedFilters: updatedFilters, currentProcessedCurve: processedCurve });
  },
  
  editFilter: (id, paramsToUpdate) => {
    const { originalDataSource, appliedFilters } = get();
    if (!originalDataSource) return false;
    
    const targetFilterIndex = appliedFilters.findIndex(f => f.id === id);
    if (targetFilterIndex === -1) return false;
    
    const updatedFilters = [...appliedFilters];
    updatedFilters[targetFilterIndex] = {
      ...updatedFilters[targetFilterIndex],
      ...paramsToUpdate
    };
    
    const processedCurve = applyFiltersToData(originalDataSource, updatedFilters);
    set({ appliedFilters: updatedFilters, currentProcessedCurve: processedCurve });
    return true;
  },
  
  // LLM相关动作实现
  addFilterFromLLM: (params) => {
    if (!params || !params.filterType || params.freq === undefined) {
      console.error("来自LLM的添加滤波器参数无效:", params);
      return;
    }
    get().addFilter({
      type: params.filterType,
      freq: params.freq,
      gain: params.gain,
      qFactor: params.qFactor
    });
  },
  
  editFilterFromLLM: (id, params) => {
    if (!id || !params) return false;
    // 确保不传递filterType给editFilter
    const { filterType, ...editableParams } = params;
    return get().editFilter(id, editableParams);
  },
  
  deleteFilterFromLLM: (id) => {
    if (!id) return false;
    const filterExists = get().appliedFilters.some(filter => filter.id === id);
    if (!filterExists) {
      console.warn(`AI尝试删除不存在的滤波器ID: ${id}`);
      return false;
    }
    get().deleteFilter(id);
    return true;
  },
  
  setUIMode: (mode) => {
    set(state => ({ uiState: { ...state.uiState, currentMode: mode } }));
  },
  
  setGlobalError: (error) => set(state => ({ uiState: { ...state.uiState, globalError: error } })),
  minimizeUpload: () => set(state => ({ uiState: { ...state.uiState, isUploadMinimized: true } })),
  resetState: () => set({ ...initialState, currentCurveImageDataURL: null, uiState: { ...initialState.uiState } }),
  setCurrentCurveImageDataURL: (dataURL) => set({ currentCurveImageDataURL: dataURL })
}));
