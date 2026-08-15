import axios, { type AxiosError, type AxiosInstance } from "axios";
import { t, getLocale } from "@/resources/resources";

export interface ApiError {
  message: string;
  status: number;
}

const GENERIC_REQUEST_ERROR = "Request failed. Please try again.";
const NETWORK_ERROR =
  "Network request failed. Please check the local service and try again.";
const TIMEOUT_ERROR = "Request timed out. Please try again.";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function extractSafeResponseMessage(data: unknown): string | null {
  if (!isRecord(data)) return null;

  const nested = data.error;
  if (isRecord(nested) && typeof nested.message === "string") {
    return nested.message;
  }

  return null;
}

export function extractApiError(error: unknown): ApiError {
  const axiosError = error as AxiosError | undefined;

  if (axiosError?.isAxiosError) {
    const response = axiosError.response;
    if (response) {
      const message = extractSafeResponseMessage(response.data) ?? GENERIC_REQUEST_ERROR;
      return { message, status: response.status };
    }

    if (
      axiosError.code === "ECONNABORTED" ||
      axiosError.code === "ETIMEDOUT" ||
      axiosError.name === "AbortError"
    ) {
      return { message: TIMEOUT_ERROR, status: 408 };
    }

    return { message: NETWORK_ERROR, status: 0 };
  }

  if (error instanceof DOMException && error.name === "AbortError") {
    return { message: TIMEOUT_ERROR, status: 408 };
  }

  return { message: GENERIC_REQUEST_ERROR, status: 0 };
}

function getBaseUrl(): string {
  if (typeof window === "undefined") {
    // Server-side: need absolute URL
    const port = process.env.PORT ?? "3000";
    return `http://localhost:${port}/api`;
  }
  return "/api";
}

export function createApi(): AxiosInstance {
  const instance = axios.create({
    baseURL: getBaseUrl(),
    headers: {
      "Content-Type": "application/json",
    },
  });

  instance.interceptors.request.use(
    (config) => {
      config.headers.set("Accept-Language", getLocale());
      return config;
    },
    (error) => Promise.reject(extractApiError(error)),
  );

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
export async function patch<T>(url: string, data?: unknown): Promise<T> { return api.patch<T>(url, data) as Promise<T>; }

export async function del<T>(url: string): Promise<T> {
  return api.delete<T>(url) as Promise<T>;
}
