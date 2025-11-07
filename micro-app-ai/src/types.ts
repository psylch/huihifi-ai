// ============ filters related ============

export type FilterType = 'peaking' | 'low_shelf' | 'high_shelf' | 'lowpass' | 'highpass';

export interface FilterParams {
  id: string;
  type: FilterType;
  freq: number;
  gain?: number;
  qFactor?: number;
}

export interface FilterManipulation {
  manipulationType: 'add' | 'edit' | 'delete';
  filterId?: string;
  filterParams?: {
    filterType?: FilterType;
    freq?: number;
    gain?: number;
    qFactor?: number;
  };
}

// ============ products mentioned (new) ============

export interface MentionedProduct {
  id: string;
  name: string;
  uuid: string;
}

export interface RichContentSegment {
  type: 'text' | 'mention';
  content?: string;
  data?: MentionedProduct;
}

// ============ 频段覆盖 (新增) ============

export interface SegmentCoverItem {
  frequency_range: [number, number];
  name: string;
  uuid: string;
  dataGroup: string;
}

export interface SegmentCoverData {
  data_list: SegmentCoverItem[];
}

// ============ chat messages ============

export interface ChatMessage {
  id: string;
  content: string;
  sender: 'user' | 'ai';
  manipulationActions?: FilterManipulation[];
  segmentCoverAction?: SegmentCoverData;
  richContent?: RichContentSegment[];
  mentions?: MentionedProduct[];
  timestamp: number;
  isStreaming?: boolean;
  error?: string;
  rawContent?: string;
  processedContent?: string;
}

export interface UserMessagePayload {
  displayContent: string;
  llmPayload: string;
  richContent?: RichContentSegment[];
  mentions?: MentionedProduct[];
}

// ============ Frequency Response Data ============

export type FrequencyResponseDataPoint = [string, string];
export type FrequencyResponseData = FrequencyResponseDataPoint[];

// ============ API related ============

export interface ProductSearchResult {
  uuid: string;
  title: string;
  brand: { title?: string; img?: string };
  thumbnails: string[];
  categoryName: string;
}

export interface ProductSearchResponse {
  products: ProductSearchResult[];
  total: number;
}

// ============ global window & env extension ============

declare global {
  interface Window {
    __POWERED_BY_QIANKUN__?: boolean;
    __HUIHIFI_API_BASE_URL__?: string;
  }

  interface ImportMetaEnv {
    readonly VITE_API_BASE_URL?: string;
  }

  interface ImportMeta {
    readonly env: ImportMetaEnv;
  }
}
