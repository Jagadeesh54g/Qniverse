import { db } from '@/lib/mongodb';
import { getAuthUser } from '@/lib/auth';
import { CommunityPost } from '@/models';

export async function POST(request) {
  try {
    const user = await getAuthUser();

    if (!user) {
      return Response.json(
        {
          message:
            'Please sign in.',
        },
        { status: 401 }
      );
    }

    const {
      postId,
    } = await request.json();

    if (!postId) {
      return Response.json(
        {
          message:
            'Post ID is required.',
        },
        { status: 400 }
      );
    }

    await db();

    const post =
      await CommunityPost.findByIdAndUpdate(
        postId,
        {
          $inc: {
            likes: 1,
          },
        },
        {
          new: true,
        }
      ).lean();

    if (!post) {
      return Response.json(
        {
          message:
            'Question not found.',
        },
        { status: 404 }
      );
    }

    return Response.json({
      ok: true,
      likes: post.likes || 0,
    });
  } catch (error) {
    console.error(
      '[Qniverse Like]',
      error
    );

    return Response.json(
      {
        message:
          'Unable to like the question.',
      },
      { status: 500 }
    );
  }
}