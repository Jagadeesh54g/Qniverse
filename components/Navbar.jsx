'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
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
  const router = useRouter();
  const [user, setUser] = useState(null);

  useEffect(() => {
    fetch('/api/auth/me').then(async (response) => {
      if (!response.ok) return;
      const data = await response.json();
      setUser(data.user || null);
    }).catch(() => {});
  }, [pathname]);

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
    setUser(null);
    router.push('/sign-in');
    router.refresh();
  }

  return (
    <nav className="nav">
      <Link href="/" className="brand"><QniverseLogo /></Link>
      <div className="navlinks">
        {links.map(([href, label]) => <Link key={href} href={href} className={pathname?.startsWith(href) ? 'active' : ''}>{label}</Link>)}
      </div>
      {user ? (
        <div className="nav-user">
          <span className="nav-user-name">{user.name || user.email}</span>
          <button type="button" className="nav-signout" onClick={logout}>Sign out</button>
        </div>
      ) : (
        <Link href="/sign-in" className="nav-signin">Sign in <span>↗</span></Link>
      )}
      <Link href="/playground" className="btn primary">Open Lab</Link>
    </nav>
  );
}
