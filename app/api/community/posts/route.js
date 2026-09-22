import { db } from '@/lib/mongodb';
import { getAuthUser } from '@/lib/auth';
import {
  CommunityPost,
  CommunityReply,
} from '@/models';

function clean(value, maxLength) {
  return String(value || '')
    .trim()
    .slice(0, maxLength);
}


/* =========================================================
   GET COMMUNITY QUESTIONS
   ========================================================= */

export async function GET(request) {
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

    await db();

    const url = new URL(request.url);

    const tag = clean(
      url.searchParams.get('tag'),
      40
    );

    const query =
      tag && tag !== 'All'
        ? { tag }
        : {};

    const posts =
      await CommunityPost.find(query)
        .sort({ createdAt: -1 })
        .limit(50)
        .lean();

    const postIds = posts.map(
      (post) => post._id
    );

    const replies =
      await CommunityReply.find({
        postId: {
          $in: postIds,
        },
      })
        .sort({ createdAt: 1 })
        .limit(500)
        .lean();

    const groupedReplies = {};

    for (const reply of replies) {
      const key = String(
        reply.postId
      );

      if (!groupedReplies[key]) {
        groupedReplies[key] = [];
      }

      groupedReplies[key].push({
        _id: String(reply._id),
        postId: String(reply.postId),
        authorId: String(reply.authorId),
        authorName: reply.authorName,
        body: reply.body,
        createdAt: reply.createdAt,
      });
    }

    const result = posts.map((post) => ({
      _id: String(post._id),
      authorId: String(post.authorId),
      authorName: post.authorName,
      title: post.title,
      body: post.body,
      tag: post.tag,
      likes: post.likes || 0,
      repliesCount: post.replies || 0,
      createdAt: post.createdAt,

      replies:
        groupedReplies[
          String(post._id)
        ] || [],
    }));

    return Response.json({
      posts: result,
    });
  } catch (error) {
    console.error(
      '[Qniverse Community GET]',
      error
    );

    return Response.json(
      {
        message:
          'Unable to load the community.',
      },
      { status: 500 }
    );
  }
}


/* =========================================================
   CREATE QUESTION
   ========================================================= */

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

    const title = clean(
      body.title,
      140
    );

    const question = clean(
      body.body,
      4000
    );

    const tag =
      clean(body.tag, 40) ||
      'General';

    if (!title || !question) {
      return Response.json(
        {
          message:
            'Add a question title and description.',
        },
        { status: 400 }
      );
    }

    await db();

    const post =
      await CommunityPost.create({
        authorId: user._id,

        authorName:
          user.name ||
          user.email.split('@')[0],

        title,

        body: question,

        tag,
      });

    return Response.json(
      {
        ok: true,
        post: {
          _id: String(post._id),
          authorName: post.authorName,
          title: post.title,
          body: post.body,
          tag: post.tag,
          likes: post.likes,
          replies: [],
          createdAt: post.createdAt,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error(
      '[Qniverse Community POST]',
      error
    );

    return Response.json(
      {
        message:
          'Unable to create the question.',
      },
      { status: 500 }
    );
  }
}