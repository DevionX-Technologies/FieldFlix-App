import { BASE_URL } from "@/data/constants";
import { unwrapNestPayload } from "@/utils/unwrapNestPayload";
import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig, AxiosResponse } from "axios";
import { MMKV } from "react-native-mmkv";

export const storage = new MMKV({ id: "app_storage" });
const TOKEN_KEY = "userToken";

export function setAuthToken(token: string): void {
  storage.set(TOKEN_KEY, token);
}

export function getAuthToken(): string | undefined {
  return storage.getString(TOKEN_KEY) ?? undefined;
}

export function clearAuthToken(): void {
  storage.delete(TOKEN_KEY);
}

const apiClient: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
    "User-Agent": "FieldFlicks/1.0 (React Native; FieldFlicks Mobile)",
    ...(BASE_URL.includes("ngrok")
      ? { "ngrok-skip-browser-warning": "true" }
      : {}),
  },
  timeout: 15000,
});

apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = getAuthToken();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    if (response.data !== undefined) {
      response.data = unwrapNestPayload(response.data);
    }
    return response;
  },
  (err) => Promise.reject(err)
);

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    let message = `HTTP ${error.response?.status || "UNKNOWN"}`;
    if (error.response?.data) {
      try {
        const data = error.response.data as any;
        if (typeof data === "object" && data.message) {
          message = data.message;
        }
      } catch {}
    }
    const customError = new Error(message);
    return Promise.reject(customError);
  }
);

export interface ApiFetchOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  data?: any;
  params?: Record<string, string | number>;
  headers?: Record<string, string>;
}

export async function apiFetch<T = any>(
  endpoint: string,
  options: ApiFetchOptions = {}
): Promise<T> {
  const { method = "GET", data, params, headers } = options;

  try {
    const response = await apiClient.request<T>({
      url: endpoint,
      method,
      data: data instanceof FormData ? data : data ?? undefined,
      params: params ?? undefined,
      headers: headers ?? undefined,
    });

    return response.data as T;
  } catch (err) {
    if (err instanceof Error) throw err;
    throw new Error("Unknown network error");
  }
}
