'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';

const TAGS = [
  'All',
  'Quantum Foundations',
  'Circuits',
  'Algorithms',
  'Math',
  'Career',
  'General',
];

function initials(name = 'Student') {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((x) => x[0])
    .join('')
    .toUpperCase();
}

function ago(date) {
  const minutes = Math.max(
    1,
    Math.floor(
      (Date.now() - new Date(date).getTime()) / 60000
    )
  );

  if (minutes < 60) {
    return `${minutes}m ago`;
  }

  const hours = Math.floor(minutes / 60);

  if (hours < 24) {
    return `${hours}h ago`;
  }

  return `${Math.floor(hours / 24)}d ago`;
}

export default function CommunityPage() {
  const [posts, setPosts] = useState([]);
  const [students, setStudents] = useState([]);

  const [tag, setTag] = useState('All');

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [postTag, setPostTag] =
    useState('Quantum Foundations');

  const [reply, setReply] = useState({});
  const [openReply, setOpenReply] = useState(null);

  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState('');

  async function load() {
    setLoading(true);

    try {
      const [postsResponse, studentsResponse] =
        await Promise.all([
          fetch(
            `/api/community/posts?tag=${encodeURIComponent(tag)}`
          ),
          fetch('/api/community/students'),
        ]);

      if (postsResponse.ok) {
        const data = await postsResponse.json();
        setPosts(data.posts || []);
      }

      if (studentsResponse.ok) {
        const data = await studentsResponse.json();
        setStudents(data.students || []);
      }
    } catch {
      setNotice('Unable to connect to the community.');
    }

    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [tag]);

  async function ask(event) {
    event.preventDefault();

    setNotice('');

    const response = await fetch(
      '/api/community/posts',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title,
          body,
          tag: postTag,
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      setNotice(
        data.message || 'Could not post the question.'
      );
      return;
    }

    setTitle('');
    setBody('');

    setNotice(
      'Question posted to the community.'
    );

    load();
  }

  async function addReply(postId) {
    const text = String(reply[postId] || '').trim();

    if (!text) return;

    const response = await fetch(
      '/api/community/replies',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          postId,
          body: text,
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      setNotice(
        data.message || 'Could not reply.'
      );
      return;
    }

    setReply({
      ...reply,
      [postId]: '',
    });

    load();
  }

  async function like(postId) {
    const response = await fetch(
      '/api/community/like',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ postId }),
      }
    );

    if (!response.ok) return;

    const data = await response.json();

    setPosts(
      posts.map((post) =>
        post._id === postId
          ? {
              ...post,
              likes: data.likes,
            }
          : post
      )
    );
  }

  const visibleStudents = useMemo(
    () => students.slice(0, 8),
    [students]
  );

  return (
    <div className="community-page page">

      <section className="community-hero">
        <div>
          <div className="eyebrow">
            QNIVERSE COMMUNITY
          </div>

          <h1>
            Learn together.
            <br />
            <em>Ask freely.</em>
          </h1>

          <p>
            A student-to-student space for quantum
            questions, circuit debugging, algorithm
            discussions and the small “why?” moments
            that make difficult concepts click.
          </p>
        </div>

        <div className="community-orbit">
          <span>STUDENTS</span>
          <b>{students.length || '—'}</b>
          <small>learning together</small>
        </div>
      </section>

      <div className="community-layout">

        <main>

          <form
            className="ask-card"
            onSubmit={ask}
          >
            <div className="eyebrow">
              ASK THE COMMUNITY
            </div>

            <h2>
              What are you stuck on?
            </h2>

            <input
              value={title}
              onChange={(e) =>
                setTitle(e.target.value)
              }
              placeholder="e.g. Why does H² return |0⟩?"
              maxLength={140}
              required
            />

            <textarea
              value={body}
              onChange={(e) =>
                setBody(e.target.value)
              }
              placeholder="Describe your circuit, result, calculation or question..."
              rows={4}
              maxLength={4000}
              required
            />

            <div className="ask-actions">

              <select
                value={postTag}
                onChange={(e) =>
                  setPostTag(e.target.value)
                }
              >
                {TAGS
                  .filter((x) => x !== 'All')
                  .map((x) => (
                    <option key={x}>
                      {x}
                    </option>
                  ))}
              </select>

              <button
                className="primary-btn"
                type="submit"
              >
                Post question →
              </button>

            </div>

            {notice && (
              <p className="community-notice">
                {notice}
              </p>
            )}
          </form>

          <div className="community-filter">

            <div>
              <span className="eyebrow">
                DISCUSSIONS
              </span>

              <h2>
                Recent questions
              </h2>
            </div>

            <div className="tag-row">
              {TAGS.map((item) => (
                <button
                  key={item}
                  className={
                    tag === item
                      ? 'selected'
                      : ''
                  }
                  onClick={() =>
                    setTag(item)
                  }
                  type="button"
                >
                  {item}
                </button>
              ))}
            </div>

          </div>

          {loading ? (
            <div className="community-empty">
              Loading the student network…
            </div>
          ) : posts.length === 0 ? (
            <div className="community-empty">
              <b>No questions yet.</b>
              <span>
                Be the first student to start
                the conversation.
              </span>
            </div>
          ) : (
            posts.map((post) => (
              <article
                className="post-card"
                key={post._id}
              >

                <div className="post-author">

                  <span className="avatar small">
                    {initials(post.authorName)}
                  </span>

                  <div>
                    <b>{post.authorName}</b>

                    <small>
                      {ago(post.createdAt)}
                      {' · '}
                      {post.tag}
                    </small>
                  </div>

                </div>

                <h3>{post.title}</h3>

                <p>{post.body}</p>

                <div className="post-actions">

                  <button
                    onClick={() =>
                      like(post._id)
                    }
                    type="button"
                  >
                    ♡ {post.likes || 0}
                  </button>

                  <button
                    onClick={() =>
                      setOpenReply(
                        openReply === post._id
                          ? null
                          : post._id
                      )
                    }
                    type="button"
                  >
                    ◌{' '}
                    {post.replies?.length ||
                      post.repliesCount ||
                      0}{' '}
                    replies
                  </button>

                </div>

                {openReply === post._id && (
                  <div className="reply-box">

                    {(post.replies || []).map(
                      (item) => (
                        <div
                          className="reply"
                          key={item._id}
                        >

                          <span className="avatar tiny">
                            {initials(
                              item.authorName
                            )}
                          </span>

                          <div>
                            <b>
                              {item.authorName}
                            </b>

                            <p>
                              {item.body}
                            </p>
                          </div>

                        </div>
                      )
                    )}

                    <div className="reply-input">

                      <input
                        value={
                          reply[post._id] || ''
                        }
                        onChange={(e) =>
                          setReply({
                            ...reply,
                            [post._id]:
                              e.target.value,
                          })
                        }
                        placeholder="Add a helpful reply…"
                      />

                      <button
                        type="button"
                        onClick={() =>
                          addReply(post._id)
                        }
                      >
                        Reply
                      </button>

                    </div>

                  </div>
                )}

              </article>
            ))
          )}

        </main>

        <aside className="community-side">

          <div className="side-card">

            <div className="eyebrow">
              STUDENT NETWORK
            </div>

            <h3>
              Meet learners
            </h3>

            <p>
              Find students at different stages
              and learn from how they approach
              the same quantum ideas.
            </p>

            {visibleStudents.map((student) => (
              <div
                className="student-row"
                key={student.id}
              >

                <span className="avatar small">
                  {initials(student.name)}
                </span>

                <div>
                  <b>{student.name}</b>
                  <small>
                    {student.learnerLevel}
                  </small>
                </div>

                <span className="online-dot" />

              </div>
            ))}

            {students.length > 8 && (
              <span className="side-more">
                + {students.length - 8} more students
              </span>
            )}

          </div>

          <div className="side-card community-guidelines">

            <div className="eyebrow">
              GOOD QUESTIONS
            </div>

            <h3>
              Make the community useful.
            </h3>

            <ul>
              <li>
                Show your circuit or calculation.
              </li>

              <li>
                Say what you expected and what
                happened.
              </li>

              <li>
                Help with hints before giving
                full solutions.
              </li>

              <li>
                Keep discussions respectful and
                focused.
              </li>
            </ul>

            <Link
              href="/learn"
              className="text-link"
            >
              Return to theory →
            </Link>

          </div>

        </aside>

      </div>

    </div>
  );
}