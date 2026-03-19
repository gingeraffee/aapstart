import { NextResponse } from "next/server";
import { getQuizAnswers } from "@/lib/content-loader";
import { passQuiz } from "@/lib/dev-progress-store";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const body = await req.json();
  const answers = getQuizAnswers(slug);
  if (!answers) return NextResponse.json({ detail: "No quiz" }, { status: 404 });

  const submitted: Record<string, string> = body.answers ?? body;
  let correct = 0;
  const total = Object.keys(answers).length;
  const feedback: Record<string, { correct: boolean; correct_id: string }> = {};

  for (const [qId, correctId] of Object.entries(answers)) {
    const isCorrect = submitted[qId] === correctId;
    if (isCorrect) correct++;
    feedback[qId] = { correct: isCorrect, correct_id: correctId };
  }

  const passed = correct === total;
  const entry = passQuiz(slug, correct, total, passed);

  return NextResponse.json({
    passed,
    score: correct,
    total,
    module_completed: entry.module_completed,
    feedback,
  });
}
