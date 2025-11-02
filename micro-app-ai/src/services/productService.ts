import { ProductSearchResponse } from '../types';

export interface ProductSearchParams {
  keyword: string;
  pageSize?: number;
}

export class ProductService {
  constructor(private readonly baseUrl = '/api/products') {}

  async searchProducts({ keyword, pageSize = 20 }: ProductSearchParams): Promise<ProductSearchResponse> {
    const response = await fetch(`${this.baseUrl}/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ keyword, pageSize }),
    });

    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      const message = payload?.message || payload?.error || response.statusText;
      throw new Error(`产品搜索失败: ${message}`);
    }

    if (payload?.code !== 0 || !payload?.data) {
      const message = payload?.message || '产品搜索失败';
      throw new Error(message);
    }

    const data = payload.data as ProductSearchResponse;
    return {
      products: Array.isArray(data?.products) ? data.products : [],
      total: typeof data?.total === 'number' ? data.total : 0,
    };
  }
}

export const productService = new ProductService();
