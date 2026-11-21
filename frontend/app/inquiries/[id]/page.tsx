'use client';

import { useState, useEffect, useCallback, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api, ApiError, getToken, Inquiry } from '../../../lib/api';

const STATUS_STYLES: Record<string, string> = {
  New: 'bg-blue-100 text-blue-800',
  'In Progress': 'bg-yellow-100 text-yellow-800',
  Resolved: 'bg-green-100 text-green-800',
};

// Must match the backend rules (the backend is still the one that enforces them)
const NEXT_ACTIONS: Record<string, { to: string; label: string }[]> = {
  New: [{ to: 'In Progress', label: 'Start working' }],
  'In Progress': [{ to: 'Resolved', label: 'Mark as resolved' }],
  Resolved: [{ to: 'In Progress', label: 'Reopen' }],
};

export default function InquiryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const [inquiry, setInquiry] = useState<Inquiry | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    setNotFound(false);
    try {
      const { inquiry } = await api.getInquiry(id);
      setInquiry(inquiry);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 401) {
          router.replace('/');
          return;
        }
        // 404 (missing or not yours) and 400 (invalid id) look the same to the user
        if (err.status === 404 || err.status === 400) {
          setNotFound(true);
          return;
        }
        setError(err.message);
      } else {
        setError('Something went wrong');
      }
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    if (!getToken()) {
      router.replace('/');
      return;
    }
    load();
  }, [load, router]);

  async function changeStatus(to: string) {
    if (!inquiry) return;
    setSaving(true);
    setNotice('');
    setError('');
    try {
      const { inquiry: updated } = await api.changeStatus(inquiry.id, to, inquiry.updated_at);
      setInquiry(updated);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 401) {
          router.replace('/');
          return;
        }
        if (err.status === 409 && err.data?.inquiry) {
          // Stale data: another tab changed it first. Show the latest version.
          setInquiry(err.data.inquiry);
          setNotice(
            `This inquiry was changed elsewhere and is now "${err.data.inquiry.status}". Your change was not applied. Review it and try again if needed.`
          );
        } else if (err.status === 422 && err.data?.inquiry) {
          setInquiry(err.data.inquiry);
          setNotice(err.message);
        } else if (err.status === 404) {
          setNotFound(true);
        } else {
          setError(err.message);
        }
      } else {
        setError('Something went wrong');
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="max-w-xl mx-auto p-4">
      <header className="py-4">
        <Link href="/inquiries" className="text-sm text-blue-600 hover:underline">
          ← Back to inquiries
        </Link>
      </header>

      {loading && <p className="text-gray-500 py-8 text-center">Loading inquiry...</p>}

      {!loading && notFound && (
        <div className="bg-white p-6 rounded-lg shadow text-center">
          <h1 className="text-lg font-semibold">Inquiry not found</h1>
          <p className="text-gray-600 mt-2">
            It may have been removed, or you may not have access to it.
          </p>
        </div>
      )}

      {!loading && !notFound && error && !inquiry && (
        <div role="alert" className="bg-red-50 text-red-700 p-4 rounded text-center">
          <p>{error}</p>
          <button onClick={load} className="mt-2 underline">
            Try again
          </button>
        </div>
      )}

      {!loading && !notFound && inquiry && (
        <div className="bg-white p-6 rounded-lg shadow space-y-4">
          {notice && (
            <div role="status" className="bg-yellow-50 text-yellow-800 text-sm p-3 rounded">
              {notice}
            </div>
          )}
          {error && (
            <div role="alert" className="bg-red-50 text-red-700 text-sm p-3 rounded">
              {error}
            </div>
          )}

          <div className="flex items-start justify-between gap-2">
            <h1 className="text-xl font-semibold">{inquiry.subject}</h1>
            <span
              className={`text-xs px-2 py-1 rounded whitespace-nowrap ${STATUS_STYLES[inquiry.status]}`}
            >
              {inquiry.status}
            </span>
          </div>

          <dl className="text-sm space-y-2">
            <div>
              <dt className="text-gray-500">Customer</dt>
              <dd>{inquiry.customer_name}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Contact</dt>
              <dd>{inquiry.customer_contact}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Description</dt>
              <dd className="whitespace-pre-wrap">{inquiry.description}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Created</dt>
              <dd>{new Date(inquiry.created_at).toLocaleString()}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Last updated</dt>
              <dd>{new Date(inquiry.updated_at).toLocaleString()}</dd>
            </div>
          </dl>

          <div className="flex flex-wrap gap-2 pt-2">
            {NEXT_ACTIONS[inquiry.status].map((a) => (
              <button
                key={a.to}
                onClick={() => changeStatus(a.to)}
                disabled={saving}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? 'Saving...' : a.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}