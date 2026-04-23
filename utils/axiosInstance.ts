// utils/axiosInstance.ts
import { BASE_URL } from "@/data/constants";
import { Paths } from "@/data/paths";
import { unwrapNestPayload } from "@/utils/unwrapNestPayload";
import axios, { AxiosError, AxiosRequestConfig, AxiosResponse } from "axios";
import { router } from "expo-router";
import * as SecureStore from "expo-secure-store";

const defaultHeaders: Record<string, string> = {
  // Some mobile stacks send no UA; a few edge/WAF rules reject empty UAs
  "User-Agent": "FieldFlicks/1.0 (React Native; FieldFlicks Mobile)",
  ...(BASE_URL.includes("ngrok")
    ? { "ngrok-skip-browser-warning": "true" as const }
    : {}),
};

const axiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 20000,
  headers: defaultHeaders,
});

// Inject token before request
axiosInstance.interceptors.request.use(
  async (config: AxiosRequestConfig): Promise<AxiosRequestConfig> => {
    const token = await SecureStore.getItemAsync("token");
    if (token) {
      config.headers = {
        ...config.headers,
        Authorization: `Bearer ${token}`,
      };
    }
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

// Unwrap Nest success envelope for every call (so callers use `response.data` as the API payload)
axiosInstance.interceptors.response.use(
  (response: AxiosResponse) => {
    if (response.data !== undefined) {
      response.data = unwrapNestPayload(response.data);
    }
    return response;
  },
  (err) => Promise.reject(err)
);

// Handle 401 errors globally
axiosInstance.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: AxiosError) => {
    if (error.response?.status === 401) {
      console.log("🔐 401 Unauthorized – redirecting to login");

      // Remove stored token
      await SecureStore.deleteItemAsync("token");
      await SecureStore.deleteItemAsync("fcmToken");
      router.replace(Paths.login);

      return Promise.reject(new Error("Unauthorized"));
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;
