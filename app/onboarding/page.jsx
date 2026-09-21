import { redirect } from 'next/navigation';
import { getAuthUser } from '@/lib/auth';
import OnboardingAssessment from '@/components/OnboardingAssessment';

export const metadata = {
  title: 'Quantum Compass — Qniverse',
  description: 'Calibrate your Qniverse learning path.',
};

export default async function OnboardingPage() {
  const user = await getAuthUser();
  if (!user) redirect('/sign-in');
  if (user.onboardingComplete) redirect('/learn');
  return <OnboardingAssessment />;
}
