import { getAuthUser } from '@/lib/auth';

export async function GET() {
  const user = await getAuthUser();
  if (!user) return Response.json({ authenticated: false }, { status: 401 });
  return Response.json({
    authenticated: true,
    user: {
      id: String(user._id),
      name: user.name,
      email: user.email,
      onboardingComplete: !!user.onboardingComplete,
      learnerLevel: user.learnerLevel || 'curious',
    },
  });
}
