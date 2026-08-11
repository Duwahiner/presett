import axios, { type AxiosError, type AxiosInstance } from "axios";
import { t, getLocale } from "@/resources/resources";

export interface ApiError {
  message: string;
  status?: number;
}

export function extractApiError(error: unknown): ApiError {
  const axiosError = error as AxiosError | undefined;

  if (axiosError?.isAxiosError) {
    const response = axiosError.response;
    if (response) {
      const data = response.data as Record<string, unknown> | undefined;
      const nested = data?.error as Record<string, unknown> | undefined;
      const message =
        typeof nested?.message === "string"
          ? nested.message
          : response.statusText;

      return { message, status: response.status };
    }

    return { message: axiosError.message };
  }

  if (error instanceof Error) {
    return { message: error.message };
  }

  return { message: String(error) };
}

export function createApi(): AxiosInstance {
  const instance = axios.create({
    baseURL: "/api",
    headers: {
      "Content-Type": "application/json",
    },
  });

  instance.interceptors.request.use((config) => {
    config.headers.set("Accept-Language", getLocale());
    return config;
  });

  instance.interceptors.response.use(
    (response) => response.data,
    (error) => Promise.reject(extractApiError(error)),
  );

  return instance;
}

export const api = createApi();

export async function get<T>(url: string): Promise<T> {
  return api.get<T>(url) as Promise<T>;
}

export async function post<T>(url: string, data?: unknown): Promise<T> {
  return api.post<T>(url, data) as Promise<T>;
}

export async function put<T>(url: string, data?: unknown): Promise<T> {
  return api.put<T>(url, data) as Promise<T>;
}

export async function del<T>(url: string): Promise<T> {
  return api.delete<T>(url) as Promise<T>;
}
