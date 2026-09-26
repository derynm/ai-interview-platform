import { AxiosError, AxiosHeaders, type InternalAxiosRequestConfig } from "axios";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import api from "@/services/api";

type RejectHandler = (error: unknown) => Promise<never>;

function rejectHandler(): RejectHandler {
  const handlers = (
    api.interceptors.response as unknown as { handlers: { rejected: RejectHandler }[] }
  ).handlers;
  return handlers[0].rejected;
}

function unauthorized(url: string) {
  const config = { url, headers: new AxiosHeaders() } as InternalAxiosRequestConfig;
  return new AxiosError("Unauthorized", "ERR_BAD_REQUEST", config, null, {
    status: 401,
    statusText: "",
    headers: {},
    config,
    data: {},
  });
}

describe("api response interceptor", () => {
  const originalLocation = window.location;

  beforeEach(() => {
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { href: "/assessments" },
    });
    localStorage.setItem("auth_token", "stored-token");
  });

  afterEach(() => {
    Object.defineProperty(window, "location", { configurable: true, value: originalLocation });
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("keeps the login page in place when sign-in is rejected", async () => {
    await expect(rejectHandler()(unauthorized("/auth/login"))).rejects.toBeInstanceOf(AxiosError);
    expect(window.location.href).toBe("/assessments");
    expect(localStorage.getItem("auth_token")).toBe("stored-token");
  });

  it("signs the user out when an authenticated request is rejected", async () => {
    await expect(rejectHandler()(unauthorized("/assessments"))).rejects.toBeInstanceOf(AxiosError);
    expect(window.location.href).toBe("/login");
    expect(localStorage.getItem("auth_token")).toBeNull();
  });

  it("gives up on requests that hang", () => {
    expect(api.defaults.timeout).toBeGreaterThan(0);
  });
});
