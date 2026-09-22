import { db } from '@/lib/mongodb';
import { getAuthUser } from '@/lib/auth';
import {
  CommunityPost,
  CommunityReply,
} from '@/models';

export async function POST(request) {
  try {
    const user = await getAuthUser();

    if (!user) {
      return Response.json(
        {
          message: 'Please sign in.',
        },
        { status: 401 }
      );
    }

    const body = await request.json();

    const postId = String(
      body.postId || ''
    ).trim();

    const replyText = String(
      body.body || ''
    )
      .trim()
      .slice(0, 2000);

    if (!postId || !replyText) {
      return Response.json(
        {
          message:
            'Write a reply first.',
        },
        { status: 400 }
      );
    }

    await db();

    const post =
      await CommunityPost.findById(
        postId
      );

    if (!post) {
      return Response.json(
        {
          message:
            'Question not found.',
        },
        { status: 404 }
      );
    }

    const reply =
      await CommunityReply.create({
        postId: post._id,

        authorId: user._id,

        authorName:
          user.name ||
          user.email.split('@')[0],

        body: replyText,
      });

    await CommunityPost.findByIdAndUpdate(
      post._id,
      {
        $inc: {
          replies: 1,
        },
      }
    );

    return Response.json(
      {
        ok: true,

        reply: {
          _id: String(reply._id),
          postId: String(reply.postId),
          authorName: reply.authorName,
          body: reply.body,
          createdAt: reply.createdAt,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error(
      '[Qniverse Community Reply]',
      error
    );

    return Response.json(
      {
        message:
          'Unable to add the reply.',
      },
      { status: 500 }
    );
  }
}