import { afterEach, describe, expect, it, vi } from "vitest";

const ENV_KEY = "NEXT_PUBLIC_API_URL";

describe("API_BASE_URL", () => {
  const originalValue = process.env[ENV_KEY];

  afterEach(() => {
    if (originalValue === undefined) {
      delete process.env[ENV_KEY];
    } else {
      process.env[ENV_KEY] = originalValue;
    }
    vi.resetModules();
  });

  it("strips a single trailing slash", async () => {
    vi.resetModules();
    process.env[ENV_KEY] = "http://localhost:8080/";
    const { API_BASE_URL } = await import("../api");
    expect(API_BASE_URL).toBe("http://localhost:8080");
  });

  it("strips multiple trailing slashes", async () => {
    vi.resetModules();
    process.env[ENV_KEY] = "http://localhost:8080///";
    const { API_BASE_URL } = await import("../api");
    expect(API_BASE_URL).toBe("http://localhost:8080");
  });

  it("leaves a URL with no trailing slash unchanged", async () => {
    vi.resetModules();
    process.env[ENV_KEY] = "http://localhost:8080";
    const { API_BASE_URL } = await import("../api");
    expect(API_BASE_URL).toBe("http://localhost:8080");
  });

  it("is undefined when the env var is unset", async () => {
    vi.resetModules();
    delete process.env[ENV_KEY];
    const { API_BASE_URL } = await import("../api");
    expect(API_BASE_URL).toBeUndefined();
  });
});
