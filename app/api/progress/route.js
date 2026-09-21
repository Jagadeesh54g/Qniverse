import { db } from '@/lib/mongodb';
import { getAuthUser } from '@/lib/auth';
import { Progress } from '@/models';

const EMPTY_PROGRESS = {
  xp: 0,
  lessons: {},
  challenges: {},
  streak: 0,
  last: null,
};

/**
 * GET /api/progress
 *
 * Loads the currently signed-in user's progress.
 */
export async function GET() {
  try {
    const user = await getAuthUser();

    if (!user) {
      return Response.json(
        {
          authenticated: false,
          data: null,
          message: 'Please sign in.',
        },
        { status: 401 }
      );
    }

    await db();

    const progress = await Progress.findOne({
      userId: user._id,
    }).lean();

    return Response.json({
      authenticated: true,
      data: progress || EMPTY_PROGRESS,
    });
  } catch (error) {
    console.error('[Qniverse progress GET]', error);

    return Response.json(
      {
        authenticated: true,
        data: null,
        message: 'Unable to load progress.',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/progress
 *
 * Saves the currently signed-in user's progress.
 */
export async function POST(request) {
  try {
    const user = await getAuthUser();

    if (!user) {
      return Response.json(
        {
          authenticated: false,
          message: 'Please sign in.',
        },
        { status: 401 }
      );
    }

    const body = await request.json();

    await db();

    const progress = await Progress.findOneAndUpdate(
      {
        userId: user._id,
      },
      {
        $set: {
          xp: Number(body.xp) || 0,
          lessons: body.lessons || {},
          challenges: body.challenges || {},
          streak: Number(body.streak) || 0,
          last: body.last || null,
        },
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      }
    ).lean();

    return Response.json({
      authenticated: true,
      data: progress,
    });
  } catch (error) {
    console.error('[Qniverse progress POST]', error);

    return Response.json(
      {
        authenticated: true,
        message: 'Unable to save progress.',
      },
      { status: 500 }
    );
  }
}