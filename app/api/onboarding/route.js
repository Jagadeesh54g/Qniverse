import { db } from '@/lib/mongodb';
import { getAuthUser } from '@/lib/auth';
import { LearnerAssessment, Progress, User } from '@/models';
import { scoreAssessment } from '@/lib/onboarding';

export async function POST(request) {
  const user = await getAuthUser();
  if (!user) return Response.json({ ok: false, message: 'Please sign in first.' }, { status: 401 });

  try {
    const { answers = {} } = await request.json();
    const required = ['quantum-intuition', 'probability', 'circuit-reasoning', 'math', 'programming', 'quantum-exposure', 'challenge'];
    if (required.some((key) => !answers[key])) {
      return Response.json({ ok: false, message: 'Complete the learning compass before continuing.' }, { status: 400 });
    }

    const result = scoreAssessment(answers);
    await db();

    await LearnerAssessment.findOneAndUpdate(
      { userId: user._id },
      { $set: { version: 1, score: result.score, level: result.level, answers, dimensions: result.dimensions, goals: [answers.challenge], recommendedPath: result.recommendedPath } },
      { upsert: true, new: true }
    );

    await User.findByIdAndUpdate(user._id, {
      $set: { onboardingComplete: true, learnerLevel: result.level, learnerProfile: { score: result.score, dimensions: result.dimensions, goals: [answers.challenge], recommendedPath: result.recommendedPath } },
    });

    await Progress.findOneAndUpdate(
      { userId: user._id },
      { $setOnInsert: { userId: user._id, xp: 0, lessons: {}, challenges: {} } },
      { upsert: true, new: true }
    );

    return Response.json({ ok: true, level: result.level, score: result.score, dimensions: result.dimensions, recommendedPath: result.recommendedPath });
  } catch (error) {
    return Response.json({ ok: false, message: error.message || 'Could not save your learning profile.' }, { status: 500 });
  }
}
