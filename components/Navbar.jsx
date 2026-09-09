
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import QniverseLogo from './QniverseLogo';

const links = [
  ['/learn', 'Learn'],
  ['/playground', 'Quantum Lab'],
  ['/algorithms', 'Algorithms'],
  ['/challenges', 'Challenges'],
  ['/progress', 'Progress'],
];

export default function Navbar() {
  const pathname = usePathname();

  return (
    <nav className="nav">
      <Link href="/" className="brand">
        <QniverseLogo />
      </Link>

      <div className="navlinks">
        {links.map(([href, label]) => (
          <Link
            key={href}
            href={href}
            className={pathname?.startsWith(href) ? 'active' : ''}
          >
            {label}
          </Link>
        ))}
      </div>

      <Link href="/playground" className="btn primary">
        Open Lab
      </Link>
    </nav>
  );
}
