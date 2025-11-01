import { ProductSearchResult } from '../types';

export interface ProductSearchParams {
  keyword: string;
  pageSize?: number;
}

export class ProductService {
  constructor(private readonly baseUrl = '/api/products') {}

  async searchProducts({ keyword, pageSize = 20 }: ProductSearchParams): Promise<ProductSearchResult[]> {
    const response = await fetch(`${this.baseUrl}/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ keyword, pageSize }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const message = errorData.error || `产品搜索失败: ${response.statusText}`;
      throw new Error(message);
    }

    const data = await response.json();
    return data?.data ?? data ?? [];
  }
}

export const productService = new ProductService();

