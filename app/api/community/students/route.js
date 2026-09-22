import { db } from '@/lib/mongodb';
import { getAuthUser } from '@/lib/auth';
import { User } from '@/models';

export async function GET() {
  try {
    const currentUser =
      await getAuthUser();

    if (!currentUser) {
      return Response.json(
        {
          message:
            'Please sign in.',
        },
        { status: 401 }
      );
    }

    await db();

    const students =
      await User.find({
        _id: {
          $ne: currentUser._id,
        },
      })
        .select(
          'name email learnerLevel'
        )
        .sort({
          createdAt: -1,
        })
        .limit(50)
        .lean();

    return Response.json({
      students: students.map(
        (student) => ({
          id: String(
            student._id
          ),

          name:
            student.name ||
            student.email.split('@')[0],

          learnerLevel:
            student.learnerLevel ||
            'curious',
        })
      ),
    });
  } catch (error) {
    console.error(
      '[Qniverse Students]',
      error
    );

    return Response.json(
      {
        message:
          'Unable to load students.',
      },
      { status: 500 }
    );
  }
}