import { afterEach, vi } from "vitest";

process.env.NEXT_PUBLIC_SUPABASE_URL ??= "https://example.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??= "test-anon-key";
process.env.SUPABASE_SERVICE_ROLE_KEY ??= "test-service-role";
process.env.NVIDIA_BUILD_API_BASE_URL ??= "https://integrate.api.nvidia.com";
process.env.NVIDIA_BUILD_API_TIMEOUT_MS ??= "30000";

afterEach(() => {
  vi.clearAllMocks();
  vi.restoreAllMocks();
  delete process.env.FRANCSCORE_E2E_TEST_MODE;
  delete process.env.NVIDIA_MAIN_API_KEY;
  delete process.env.NVIDIA_RERANK_API_KEY;
  delete process.env.NVIDIA_SAFETY_API_KEY;
  delete process.env.NVIDIA_STT_API_KEY;
});
