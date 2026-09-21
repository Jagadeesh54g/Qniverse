import ChallengeList from '../../components/challenges/ChallengeList.jsx';
import './challenges.css';

export const metadata = {
  title: 'Challenges · Qniverse',
  description: 'Twenty hands-on quantum circuit challenges, graded in your browser.',
};

export default function ChallengesPage() {
  return <ChallengeList />;
}
