import { describe, expect, it } from "vitest";
import { NvidiaAIError, extractJson } from "@/lib/ai/nvidia-client";

describe("AI response parsing", () => {
  it("extracts JSON from fenced model output", () => {
    expect(
      extractJson('```json\n{"estimated_cefr":"B1_PLUS","score_20":13}\n```'),
    ).toEqual({
      estimated_cefr: "B1_PLUS",
      score_20: 13,
    });
  });

  it("extracts inline JSON from mixed text", () => {
    expect(
      extractJson('Here is the result: {"allowed":true,"reason":"","category":null}'),
    ).toEqual({
      allowed: true,
      reason: "",
      category: null,
    });
  });

  it("throws a parse error when no JSON object is present", () => {
    expect(() => extractJson("No JSON here")).toThrowError(NvidiaAIError);
  });
});
