const resolveBaseUrl = (): string => {
  const runtimeOverride =
    typeof window !== 'undefined' ? window.__HUIHIFI_API_BASE_URL__ : undefined;
  const envValue =
    typeof import.meta !== 'undefined' ? import.meta.env?.VITE_API_BASE_URL : undefined;

  const fallback = 'http://127.0.0.1:5005/api';
  const base = runtimeOverride || envValue || fallback;

  return base.endsWith('/') ? base.slice(0, -1) : base;
};

const API_BASE_URL = resolveBaseUrl();

export const apiConfig = {
  baseUrl: API_BASE_URL,
  chatUrl: `${API_BASE_URL}/chat`,
  productSearchUrl: `${API_BASE_URL}/products/search`,
  getUsageUrl(userToken: string) {
    return `${API_BASE_URL}/usage/${encodeURIComponent(userToken)}`;
  },
};
