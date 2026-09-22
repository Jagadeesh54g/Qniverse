'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import QniverseLogo from './QniverseLogo';

const links = [
  ['/learn', 'Learn'],
  ['/playground', 'Quantum Lab'],
  ['/algorithms', 'Algorithms'],
  ['/challenges', 'Challenges'],
  ['/community', 'Community'],
];

function initials(name = 'Student') {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((x) => x[0])
    .join('')
    .toUpperCase();
}

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();

  const [user, setUser] = useState(null);
  const [open, setOpen] = useState(false);

  const ref = useRef(null);

  useEffect(() => {
    fetch('/api/auth/me')
      .then(async (r) => {
        if (r.ok) {
          const data = await r.json();
          setUser(data.user || null);
        }
      })
      .catch(() => {});
  }, [pathname]);

  useEffect(() => {
    const close = (event) => {
      if (ref.current && !ref.current.contains(event.target)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', close);

    return () => {
      document.removeEventListener('mousedown', close);
    };
  }, []);

  async function logout() {
    await fetch('/api/auth/logout', {
      method: 'POST',
    }).catch(() => {});

    setUser(null);
    setOpen(false);

    router.push('/sign-in');
    router.refresh();
  }

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
            className={
              pathname?.startsWith(href)
                ? 'active'
                : ''
            }
          >
            {label}
          </Link>
        ))}
      </div>

      {user ? (
        <div className="nav-profile" ref={ref}>
          <button
            className="avatar nav-avatar"
            onClick={() => setOpen(!open)}
            aria-expanded={open}
            aria-label="Open account menu"
          >
            {initials(user.name || 'Student')}
          </button>

          {open && (
            <div className="avatar-menu">
              <div className="avatar-menu-head">
                <span className="avatar small">
                  {initials(user.name || 'Student')}
                </span>

                <div>
                  <b>{user.name || 'Student'}</b>
                  <small>{user.email}</small>
                </div>
              </div>

              <div className="avatar-menu-links">
                <Link
                  href="/dashboard"
                  onClick={() => setOpen(false)}
                >
                  ◈ Dashboard
                </Link>

                <Link
                  href="/progress"
                  onClick={() => setOpen(false)}
                >
                  ↗ Progress
                </Link>

                <Link
                  href="/community"
                  onClick={() => setOpen(false)}
                >
                  ◎ Community
                </Link>
              </div>

              <button
                className="avatar-logout"
                onClick={logout}
              >
                Sign out
                <span>↗</span>
              </button>
            </div>
          )}
        </div>
      ) : (
        <Link href="/sign-in" className="nav-signin">
          Sign in <span>↗</span>
        </Link>
      )}

      <Link href="/playground" className="btn primary">
        Open Lab
      </Link>
    </nav>
  );
}