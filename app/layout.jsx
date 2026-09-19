import './globals.css';
import Navbar from '@/components/Navbar';
import TutorPanel from '@/components/TutorPanel';
import ToastHost from '@/components/ToastHost';
import NavigationLoader from '@/components/NavigationLoader';
import { ProgressProvider } from '@/lib/progress';

export const metadata = {
  title: 'Qniverse — Interactive Quantum Learning Lab',
  description:
    'Learn quantum computing by experimenting with it.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <div className="shell">
          <ProgressProvider>
            <Navbar />

            <main>{children}</main>

            <TutorPanel />
            <ToastHost />
            <NavigationLoader />
          </ProgressProvider>
        </div>
      </body>
    </html>
  );
}