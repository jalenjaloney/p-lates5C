import { Platform } from 'react-native';

export const proxyEnabled = Platform.OS === 'web';

type QueryValue = string | number | boolean | null | undefined;

const buildQuery = (params?: Record<string, QueryValue>) => {
  if (!params) return '';
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === null || value === undefined) return;
    query.set(key, String(value));
  });
  const serialized = query.toString();
  return serialized ? `?${serialized}` : '';
};

export const proxyGet = async <T>(path: string, params?: Record<string, QueryValue>): Promise<T> => {
  const url = `${path}${buildQuery(params)}`;
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    const error = new Error(`Proxy request failed (${res.status})`);
    (error as any).statusCode = res.status;
    (error as any).body = text;
    throw error;
  }
  return (await res.json()) as T;
};
