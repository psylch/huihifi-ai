import { ProductSearchResponse } from '../types';
import { apiConfig } from '../config/apiConfig';

export interface ProductSearchParams {
  keyword: string;
  pageSize?: number;
}

export class ProductService {
  constructor(private readonly searchUrl = apiConfig.productSearchUrl) {}

  async searchProducts({ keyword, pageSize = 20 }: ProductSearchParams): Promise<ProductSearchResponse> {
    const trimmedKeyword = keyword.trim();

    const response = await fetch(this.searchUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ keyword: trimmedKeyword, pageSize }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      throw new Error(errorText || `HTTP ${response.status}`);
    }

    const payload = await response.json().catch(() => ({}));
    const products = Array.isArray(payload?.data?.products) ? payload.data.products : [];
    const total =
      typeof payload?.data?.total === 'number'
        ? payload.data.total
        : products.length;

    return { products, total };
  }
}

export const productService = new ProductService();
