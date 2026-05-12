import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth";
import { createRouteTimer } from "@/lib/observability/timing";
import { getPracticeQuestionSet } from "@/lib/practice/server";
import type {
  PracticeExamFilter,
  PracticeFilters,
  PracticeLevelFilter,
  PracticeTopicFilter,
  PracticeTrapFilter,
} from "@/lib/practice/types";

export async function GET(request: Request) {
  const { user } = await getAuthContext();
  const timer = createRouteTimer("GET /api/practice/questions", user?.id);

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const searchParams = new URL(request.url).searchParams;
  const skill = searchParams.get("skill");

  if (skill !== "READING" && skill !== "LISTENING") {
    return NextResponse.json({ error: "Invalid skill." }, { status: 400 });
  }

  const filters: PracticeFilters = {
    examType: normalizeExamFilter(searchParams.get("examType")),
    skill,
    level: normalizeLevelFilter(searchParams.get("level")),
    topic: normalizeTopicFilter(searchParams.get("topic")),
    trapType: normalizeTrapFilter(searchParams.get("trapType")),
  };

  try {
    const data = await getPracticeQuestionSet(filters, user.id);
    timer.step("loaded_question_set");
    timer.done({ count: data.items.length, skill: filters.skill });
    return NextResponse.json(data);
  } catch (error) {
    timer.done({ failed: true });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to load practice questions." },
      { status: 500 },
    );
  }
}

function normalizeExamFilter(value: string | null): PracticeExamFilter {
  if (value === "TEF_CANADA" || value === "TCF_CANADA" || value === "MIXED") {
    return value;
  }

  return "ALL";
}

function normalizeLevelFilter(value: string | null): PracticeLevelFilter {
  if (
    value === "A1" ||
    value === "A2" ||
    value === "B1_MINUS" ||
    value === "B1" ||
    value === "B1_PLUS" ||
    value === "B2_MINUS" ||
    value === "B2" ||
    value === "B2_PLUS" ||
    value === "C1"
  ) {
    return value;
  }

  return "ALL";
}

function normalizeTopicFilter(value: string | null): PracticeTopicFilter {
  if (
    value === "WORK" ||
    value === "HOUSING" ||
    value === "HEALTH" ||
    value === "ADMINISTRATION" ||
    value === "OPINION" ||
    value === "EDUCATION" ||
    value === "IMMIGRATION" ||
    value === "DAILY_LIFE" ||
    value === "ENVIRONMENT" ||
    value === "TECHNOLOGY" ||
    value === "CULTURE" ||
    value === "TRAVEL"
  ) {
    return value;
  }

  return "ALL";
}

function normalizeTrapFilter(value: string | null): PracticeTrapFilter {
  if (
    value === "NEGATION" ||
    value === "NUMBER_DATE" ||
    value === "CONTRAST_MARKER" ||
    value === "SYNONYM_TRAP" ||
    value === "FALSE_FRIEND" ||
    value === "DOUBLE_NEGATIVE" ||
    value === "IMPLICIT_MEANING"
  ) {
    return value;
  }

  return "ALL";
}
