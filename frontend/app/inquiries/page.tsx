'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api, ApiError, getToken, getUser, clearSession, Inquiry } from '../../lib/api';

const STATUS_STYLES: Record<string, string> = {
  New: 'bg-blue-100 text-blue-800',
  'In Progress': 'bg-yellow-100 text-yellow-800',
  Resolved: 'bg-green-100 text-green-800',
};

export default function InquiriesPage() {
  const router = useRouter();
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [ready, setReady] = useState(false);

  // Backend enforces auth; this just sends signed-out users to the login page
  useEffect(() => {
    if (!getToken()) router.replace('/');
    else setReady(true);
  }, [router]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { inquiries } = await api.listInquiries({
        status: status || undefined,
        q: search.trim() || undefined,
      });
      setInquiries(inquiries);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        router.replace('/');
        return;
      }
      setError(err instanceof ApiError ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }, [status, search, router]);

  // Reload when filters change (small delay while typing in the search box)
  useEffect(() => {
    if (!ready) return;
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [ready, load]);

  function signOut() {
    clearSession();
    router.replace('/');
  }

  if (!ready) return null;

  const filtering = search.trim() !== '' || status !== '';

  return (
    <main className="max-w-4xl mx-auto p-4">
      <header className="flex items-center justify-between py-4">
        <h1 className="text-xl font-semibold">Inquiries</h1>
        <div className="flex items-center gap-3 text-sm">
          <span className="text-gray-600">{getUser()?.name}</span>
          <button onClick={signOut} className="text-blue-600 hover:underline">
            Sign out
          </button>
        </div>
      </header>

      <div className="flex flex-wrap gap-2 mb-4">
        <input
          type="search"
          placeholder="Search name, contact or subject"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 min-w-[200px] border rounded px-3 py-2"
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="border rounded px-3 py-2"
          aria-label="Filter by status"
        >
          <option value="">All statuses</option>
          <option value="New">New</option>
          <option value="In Progress">In Progress</option>
          <option value="Resolved">Resolved</option>
        </select>
        <Link
          href="/inquiries/new"
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          New inquiry
        </Link>
      </div>

      {loading && <p className="text-gray-500 py-8 text-center">Loading inquiries...</p>}

      {!loading && error && (
        <div role="alert" className="bg-red-50 text-red-700 p-4 rounded text-center">
          <p>{error}</p>
          <button onClick={load} className="mt-2 underline">
            Try again
          </button>
        </div>
      )}

      {!loading && !error && inquiries.length === 0 && (
        <p className="text-gray-500 py-8 text-center">
          {filtering
            ? 'No inquiries match your search.'
            : 'No inquiries yet. Click "New inquiry" to record the first one.'}
        </p>
      )}

      {!loading && !error && inquiries.length > 0 && (
        <ul className="space-y-2">
          {inquiries.map((i) => (
            <li key={i.id}>
              <Link
                href={`/inquiries/${i.id}`}
                className="block bg-white border rounded p-4 hover:border-blue-400"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">{i.subject}</span>
                  <span className={`text-xs px-2 py-1 rounded ${STATUS_STYLES[i.status]}`}>
                    {i.status}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mt-1">
                  {i.customer_name} · {i.customer_contact}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  {new Date(i.created_at).toLocaleString()}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}