import { notFound } from 'next/navigation';
import ProblemWorkspace from '../../../components/challenges/ProblemWorkspace.jsx';
import { getProblem, problems } from '../../../lib/challenges/problems.js';
import '../challenges.css';

export function generateStaticParams() {
  return problems.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }) {
  const { slug } = await params; // params is a Promise in Next 15+, a plain object before; await handles both
  const p = getProblem(slug);
  return { title: p ? `${p.title} · Qniverse Challenges` : 'Challenge not found' };
}

export default async function ChallengePage({ params }) {
  const { slug } = await params;
  if (!getProblem(slug)) notFound();
  return <ProblemWorkspace slug={slug} />;
}
