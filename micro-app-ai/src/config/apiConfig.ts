const trimTrailingSlash = (url: string): string =>
  url.endsWith('/') ? url.slice(0, -1) : url;

const resolveBaseUrl = (): string => {
  const runtimeOverride =
    typeof window !== 'undefined' ? window.__HUIHIFI_API_BASE_URL__ : undefined;
  const envValue =
    typeof import.meta !== 'undefined' ? import.meta.env?.VITE_API_BASE_URL : undefined;

  const fallback = 'http://127.0.0.1:5005/api';
  const base = runtimeOverride || envValue || fallback;

  return trimTrailingSlash(base);
};

const resolveChatUrl = (baseUrl: string): string => {
  const runtimeOverride =
    typeof window !== 'undefined' ? window.__HUIHIFI_CHAT_API_URL__ : undefined;
  const envValue =
    typeof import.meta !== 'undefined' ? import.meta.env?.VITE_CHAT_API_URL : undefined;

  const override = runtimeOverride || envValue;
  if (override) {
    return trimTrailingSlash(override);
  }

  if (baseUrl.toLowerCase().endsWith('/chat')) {
    return baseUrl;
  }

  return `${baseUrl}/chat`;
};

const API_BASE_URL = resolveBaseUrl();
const CHAT_URL = resolveChatUrl(API_BASE_URL);

export const apiConfig = {
  baseUrl: API_BASE_URL,
  chatUrl: CHAT_URL,
  productSearchUrl: `${API_BASE_URL}/products/search`,
  getUsageUrl(userToken: string) {
    return `${API_BASE_URL}/usage/${encodeURIComponent(userToken)}`;
  },
};
