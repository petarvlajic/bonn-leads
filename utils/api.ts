import AsyncStorage from '@react-native-async-storage/async-storage';
import ENV from '@/config/env';
import { ApiResponse } from '@/types/api';

export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public response?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// Define overloaded function signatures
export async function fetchApi<T>(
  endpoint: string,
  options?: RequestInit,
  includeHeaders?: false
): Promise<{ result: T; ok: boolean; statusCode: number }>;

export async function fetchApi<T>(
  endpoint: string,
  options: RequestInit,
  includeHeaders: true
): Promise<{ result: T; ok: boolean; statusCode: number; headers: Headers }>;

export async function fetchApi<T>(
  endpoint: string,
  options: RequestInit = {},
  includeHeaders: boolean = false
): Promise<
  | { result: T; ok: boolean; statusCode: number }
  | { result: T; ok: boolean; statusCode: number; headers: Headers }
> {
  try {
    const token = await AsyncStorage.getItem('token');
    console.log('Kentoken: ', token);
    const url = endpoint.startsWith('http')
      ? endpoint
      : `${ENV.API_URL}${endpoint}`;

    console.log('URL: ', url);

    const response = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    const data: ApiResponse<T> = await response.json();

    console.log('Data: ', data);

    // Type-safe error checking
    if (Array.isArray(data.result?.data)) {
      // For paginated responses, check if errors exist
      const paginatedData = data.result.data as any;
      if (paginatedData?.errors) {
        console.log(paginatedData.errors);
      }
    }

    // Extract the actual data from the API response structure
    const extractedData = Array.isArray(data.result?.data)
      ? (data.result.data as any).data || data.result.data
      : data.result?.data || data.result;

    const baseResult = {
      result: extractedData as T,
      ok: data.ok,
      statusCode: data.statusCode,
    };

    if (includeHeaders) {
      return {
        ...baseResult,
        headers: response.headers,
      } as { result: T; ok: boolean; statusCode: number; headers: Headers };
    }

    return baseResult;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(
      error instanceof Error ? error.message : 'Network error'
    );
  }
}
