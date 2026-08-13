import { describe, expect, it, vi } from "vitest";
import { AxiosError, AxiosHeaders, type AxiosResponse, type InternalAxiosRequestConfig } from "axios";
import { createApi, del, extractApiError, get, post, put, api } from "@/services/api";
import { setLocale } from "@/resources/resources";

const GENERIC_REQUEST_ERROR = "Request failed. Please try again.";
const NETWORK_ERROR =
  "Network request failed. Please check the local service and try again.";
const TIMEOUT_ERROR = "Request timed out. Please try again.";

function responseError(data: unknown, status: number): AxiosError {
  return new AxiosError("Request failed", "ERR_BAD_RESPONSE", undefined, undefined, {
    data,
    status,
    statusText: "Error",
    headers: {},
    config: { headers: new AxiosHeaders() },
  });
}

function interceptorHandlers(instance: ReturnType<typeof createApi>) {
  return instance.interceptors as unknown as {
    request: {
      handlers: Array<{
        fulfilled: (config: InternalAxiosRequestConfig) => InternalAxiosRequestConfig;
        rejected: (error: unknown) => Promise<never>;
      }>;
    };
    response: {
      handlers: Array<{
        fulfilled: (response: AxiosResponse) => unknown;
        rejected: (error: unknown) => Promise<never>;
      }>;
    };
  };
}

describe("extractApiError", () => {
  it("extracts a safe message and status from a JSON error response", () => {
    const error = responseError({ error: { message: "Backup not found" } }, 404);

    expect(extractApiError(error)).toEqual({
      message: "Backup not found",
      status: 404,
    });
  });

  it("uses a generic safe fallback for non-JSON failure responses", () => {
    const error = responseError(
      "Error: /Users/me/.gentle-ai/backups/backup-1 stack trace",
      500,
    );

    expect(extractApiError(error)).toEqual({
      message: GENERIC_REQUEST_ERROR,
      status: 500,
    });
  });

  it.each([
    ["empty response", undefined],
    ["string nested error", { error: "Backup failed with /Users/me/.config" }],
    ["missing nested message", { error: { detail: "internal path leak" } }],
    ["non-string nested message", { error: { message: { text: "private" } } }],
  ])("uses a generic safe fallback for malformed JSON bodies: %s", (_case, data) => {
    const error = responseError(data, 502);

    expect(extractApiError(error)).toEqual({
      message: GENERIC_REQUEST_ERROR,
      status: 502,
    });
  });

  it("uses a neutral transport error for network failures", () => {
    const error = new AxiosError("connect ECONNREFUSED 127.0.0.1:3000", "ERR_NETWORK");

    expect(extractApiError(error)).toEqual({
      message: NETWORK_ERROR,
      status: 0,
    });
  });

  it.each([
    ["ECONNABORTED", new AxiosError("timeout of 1000ms exceeded", "ECONNABORTED")],
    ["ETIMEDOUT", new AxiosError("request timed out", "ETIMEDOUT")],
    ["Axios AbortError", new AxiosError("canceled", undefined, undefined, undefined, undefined)],
  ])("uses a timeout-safe message and actionable status for %s", (_case, error) => {
    if (_case === "Axios AbortError") {
      error.name = "AbortError";
    }

    expect(extractApiError(error)).toEqual({
      message: TIMEOUT_ERROR,
      status: 408,
    });
  });

  it("classifies native AbortError DOMExceptions without leaking the native type", () => {
    const error = new DOMException("The operation was aborted.", "AbortError");

    expect(extractApiError(error)).toEqual({
      message: TIMEOUT_ERROR,
      status: 408,
    });
  });

  it("uses an unknown-safe message and neutral status for generic non-Axios failures", () => {
    const error = new Error("Unexpected /Users/me/.config/presett failure");

    expect(extractApiError(error)).toEqual({
      message: GENERIC_REQUEST_ERROR,
      status: 0,
    });
  });
});

describe("createApi interceptors", () => {
  it("sets Accept-Language from the current locale on requests", () => {
    setLocale("es");
    const instance = createApi();
    const config = { headers: new AxiosHeaders() } as InternalAxiosRequestConfig;

    const result = interceptorHandlers(instance).request.handlers[0].fulfilled(config);

    expect(result.headers.get("Accept-Language")).toBe("es");
    setLocale("en");
  });

  it("returns response data from fulfilled responses", () => {
    const instance = createApi();
    const response = {
      data: { ok: true, source: "api" },
      status: 200,
      statusText: "OK",
      headers: {},
      config: { headers: new AxiosHeaders() },
    } as AxiosResponse;

    const result = interceptorHandlers(instance).response.handlers[0].fulfilled(response);

    expect(result).toEqual({ ok: true, source: "api" });
  });

  it("rejects response failures as classified safe API errors", async () => {
    const instance = createApi();
    const error = responseError({ error: { detail: "private" } }, 503);

    await expect(
      interceptorHandlers(instance).response.handlers[0].rejected(error),
    ).rejects.toEqual({
      message: GENERIC_REQUEST_ERROR,
      status: 503,
    });
  });

  it("rejects request interceptor failures as classified safe API errors", async () => {
    const instance = createApi();
    const error = new Error("Locale lookup failed at C:/Users/me/.config/presett");

    await expect(
      interceptorHandlers(instance).request.handlers[0].rejected(error),
    ).rejects.toEqual({
      message: GENERIC_REQUEST_ERROR,
      status: 0,
    });
  });
});

describe("HTTP helper delegates", () => {
  it("delegates GET requests to the shared API instance", async () => {
    const spy = vi.spyOn(api, "get").mockResolvedValueOnce({ ok: true });

    await expect(get("/status")).resolves.toEqual({ ok: true });

    expect(spy).toHaveBeenCalledWith("/status");
  });

  it("delegates POST requests to the shared API instance with data", async () => {
    const payload = { name: "profile-a" };
    const spy = vi.spyOn(api, "post").mockResolvedValueOnce({ ok: true });

    await expect(post("/profiles", payload)).resolves.toEqual({ ok: true });

    expect(spy).toHaveBeenCalledWith("/profiles", payload);
  });

  it("delegates PUT requests to the shared API instance with data", async () => {
    const payload = { provider: "google" };
    const spy = vi.spyOn(api, "put").mockResolvedValueOnce({ ok: true });

    await expect(put("/config", payload)).resolves.toEqual({ ok: true });

    expect(spy).toHaveBeenCalledWith("/config", payload);
  });

  it("delegates DELETE requests to the shared API instance", async () => {
    const spy = vi.spyOn(api, "delete").mockResolvedValueOnce({ ok: true });

    await expect(del("/profiles/profile-a")).resolves.toEqual({ ok: true });

    expect(spy).toHaveBeenCalledWith("/profiles/profile-a");
  });
});
