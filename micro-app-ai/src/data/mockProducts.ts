import { ProductSearchResult } from '../types';

// 临时 Mock 数据，等待 HuiHiFi 产品搜索接口接入后替换
// 数据来自常见的热门耳机型号，字段与后端约定保持一致
export const mockProductDataset: ProductSearchResult[] = [
  {
    uuid: '4da5b430-74f2-4f7f-9f87-3d6d18f74e21',
    title: 'Sennheiser IE 800',
    brand: { title: 'Sennheiser', img: 'https://cdn.example.com/brands/sennheiser.png' },
    thumbnails: ['https://cdn.example.com/products/ie800-thumb.jpg'],
    categoryName: '入耳式耳机',
  },
  {
    uuid: 'cbeb0ba3-6338-4ec6-8dc1-725469e2ce5b',
    title: 'MoonDrop Blessing 3',
    brand: { title: 'MoonDrop', img: 'https://cdn.example.com/brands/moondrop.png' },
    thumbnails: ['https://cdn.example.com/products/blessing3-thumb.jpg'],
    categoryName: '入耳式耳机',
  },
  {
    uuid: 'b9776b76-8650-4220-9ae6-435c7d4fef52',
    title: 'FiiO FH9',
    brand: { title: 'FiiO', img: 'https://cdn.example.com/brands/fiio.png' },
    thumbnails: ['https://cdn.example.com/products/fh9-thumb.jpg'],
    categoryName: '入耳式耳机',
  },
  {
    uuid: '9f603fa0-6516-41a6-9987-0e0458da9e83',
    title: 'Sony MDR-Z1R',
    brand: { title: 'Sony', img: 'https://cdn.example.com/brands/sony.png' },
    thumbnails: ['https://cdn.example.com/products/mdr-z1r-thumb.jpg'],
    categoryName: '头戴式耳机',
  },
  {
    uuid: 'abf7b5df-2e7d-4337-b8c6-1c2357c6ff62',
    title: 'Campfire Audio Andromeda Emerald Sea',
    brand: { title: 'Campfire Audio', img: 'https://cdn.example.com/brands/campfire.png' },
    thumbnails: ['https://cdn.example.com/products/andromeda-thumb.jpg'],
    categoryName: '入耳式耳机',
  },
  {
    uuid: '33d0b357-53af-4c41-9309-06eddb684da6',
    title: 'HIFIMAN Arya Organic',
    brand: { title: 'HIFIMAN', img: 'https://cdn.example.com/brands/hifiman.png' },
    thumbnails: ['https://cdn.example.com/products/arya-thumb.jpg'],
    categoryName: '头戴式耳机',
  },
];

export const searchMockProducts = (keyword: string, pageSize = 20) => {
  const normalizedKeyword = keyword.trim().toLowerCase();
  if (!normalizedKeyword) {
    return mockProductDataset.slice(0, pageSize);
  }

  const matches = mockProductDataset.filter((item) => {
    const haystack = `${item.title} ${item.brand?.title ?? ''} ${item.categoryName ?? ''}`.toLowerCase();
    return haystack.includes(normalizedKeyword);
  });

  return matches.slice(0, pageSize);
};
