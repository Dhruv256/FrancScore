import { loadEnvConfig } from "@next/env";
import { afterEach, vi } from "vitest";

loadEnvConfig(process.cwd(), true);

afterEach(() => {
  vi.clearAllMocks();
  vi.restoreAllMocks();
  delete process.env.FRANCSCORE_E2E_TEST_MODE;
  delete process.env.NVIDIA_MAIN_API_KEY;
  delete process.env.NVIDIA_RERANK_API_KEY;
  delete process.env.NVIDIA_SAFETY_API_KEY;
  delete process.env.NVIDIA_STT_API_KEY;
});
