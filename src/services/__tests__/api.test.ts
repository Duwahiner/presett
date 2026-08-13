import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const requestUse = vi.fn();
  const responseUse = vi.fn();
  const instance = {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    interceptors: {
      request: { use: requestUse },
      response: { use: responseUse },
    },
  };
  return { create: vi.fn(() => instance), instance, requestUse, responseUse };
});

vi.mock("axios", () => ({ default: { create: mocks.create } }));
vi.mock("@/resources/resources", () => ({ getLocale: () => "es", t: vi.fn() }));

import { createApi, del, extractApiError, get, post, put } from "@/services/api";

describe("extractApiError", () => {
  it("preserves nested API messages and status", () => {
    expect(
      extractApiError({
        isAxiosError: true,
        response: { status: 422, statusText: "Unprocessable", data: { error: { message: "Invalid profile" } } },
      }),
    ).toEqual({ message: "Invalid profile", status: 422 });
  });

  it("falls back through axios, Error, and unknown messages", () => {
    expect(extractApiError({ isAxiosError: true, response: { status: 500, statusText: "Server error" } })).toEqual({ message: "Server error", status: 500 });
    expect(extractApiError({ isAxiosError: true, message: "Network down" })).toEqual({ message: "Network down" });
    expect(extractApiError(new Error("Unexpected"))).toEqual({ message: "Unexpected" });
    expect(extractApiError(42)).toEqual({ message: "42" });
  });
});

describe("createApi", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("uses the browser base URL and configures request and response interceptors", async () => {
    createApi();

    expect(mocks.create).toHaveBeenCalledWith(expect.objectContaining({ baseURL: "/api" }));
    const requestHandler = mocks.requestUse.mock.calls[0][0];
    const responseHandler = mocks.responseUse.mock.calls[0][0];
    const errorHandler = mocks.responseUse.mock.calls[0][1];
    const config = { headers: { set: vi.fn() } };

    expect(requestHandler(config)).toBe(config);
    expect(config.headers.set).toHaveBeenCalledWith("Accept-Language", "es");
    expect(responseHandler({ data: { ok: true } })).toEqual({ ok: true });
    await expect(errorHandler(new Error("Nope"))).rejects.toEqual({ message: "Nope" });
  });

  it("uses an absolute server base URL", () => {
    const originalWindow = globalThis.window;
    Object.defineProperty(globalThis, "window", { configurable: true, value: undefined });
    process.env.PORT = "4567";

    createApi();

    expect(mocks.create).toHaveBeenCalledWith(expect.objectContaining({ baseURL: "http://localhost:4567/api" }));
    Object.defineProperty(globalThis, "window", { configurable: true, value: originalWindow });
  });
});

describe("API methods", () => {
  it("delegates all HTTP methods to the shared instance", async () => {
    mocks.instance.get.mockResolvedValue({ id: "get" });
    mocks.instance.post.mockResolvedValue({ id: "post" });
    mocks.instance.put.mockResolvedValue({ id: "put" });
    mocks.instance.delete.mockResolvedValue({ id: "delete" });

    await expect(get("/get")).resolves.toEqual({ id: "get" });
    await expect(post("/post", { value: 1 })).resolves.toEqual({ id: "post" });
    await expect(put("/put", { value: 2 })).resolves.toEqual({ id: "put" });
    await expect(del("/delete")).resolves.toEqual({ id: "delete" });

    expect(mocks.instance.get).toHaveBeenCalledWith("/get");
    expect(mocks.instance.post).toHaveBeenCalledWith("/post", { value: 1 });
    expect(mocks.instance.put).toHaveBeenCalledWith("/put", { value: 2 });
    expect(mocks.instance.delete).toHaveBeenCalledWith("/delete");
  });
});
