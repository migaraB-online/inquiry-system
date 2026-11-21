'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api, ApiError, getToken } from '../../../lib/api';

type Fields = {
  customer_name: string;
  customer_contact: string;
  subject: string;
  description: string;
};

const EMPTY: Fields = {
  customer_name: '',
  customer_contact: '',
  subject: '',
  description: '',
};

// Client-side checks give instant feedback; the API validates again independently
function validate(v: Fields): Partial<Record<keyof Fields, string>> {
  const errors: Partial<Record<keyof Fields, string>> = {};
  if (!v.customer_name.trim()) errors.customer_name = 'Customer name is required';
  if (v.customer_contact.trim().length < 3)
    errors.customer_contact = 'Enter a phone number or email (at least 3 characters)';
  if (!v.subject.trim()) errors.subject = 'Subject is required';
  if (!v.description.trim()) errors.description = 'Description is required';
  return errors;
}

export default function NewInquiryPage() {
  const router = useRouter();
  const [values, setValues] = useState<Fields>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<keyof Fields, string>>>({});
  const [formError, setFormError] = useState('');
  const [duplicateId, setDuplicateId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!getToken()) router.replace('/');
  }, [router]);

  function update(field: keyof Fields, value: string) {
    setValues((prev) => ({ ...prev, [field]: value }));
    // Clear the error for a field as soon as the user edits it
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError('');
    setDuplicateId(null);

    const found = validate(values);
    if (Object.keys(found).length > 0) {
      setErrors(found);
      return;
    }

    setSaving(true);
    try {
      const { inquiry } = await api.createInquiry(values);
      router.push(`/inquiries/${inquiry.id}`);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 401) {
          router.replace('/');
          return;
        }
        if (err.status === 400 && err.data?.fields) {
          // Server-side validation messages shown next to the fields
          setErrors(err.data.fields);
        } else if (err.status === 409) {
          setDuplicateId(err.data?.existing_id ?? null);
          setFormError(err.message);
        } else {
          setFormError(err.message);
        }
      } else {
        setFormError('Something went wrong');
      }
    } finally {
      setSaving(false);
    }
  }

  const inputClass = (f: keyof Fields) =>
    `mt-1 w-full border rounded px-3 py-2 bg-white text-gray-900 ${
      errors[f] ? 'border-red-500' : ''
    }`;

  return (
    <main className="max-w-xl mx-auto p-4">
      <header className="py-4">
        <Link href="/inquiries" className="text-sm text-blue-600 hover:underline">
          ← Back to inquiries
        </Link>
        <h1 className="text-xl font-semibold mt-2">New inquiry</h1>
      </header>

      <form onSubmit={handleSubmit} noValidate className="bg-white p-6 rounded-lg shadow space-y-4">
        {formError && (
          <div role="alert" className="bg-red-50 text-red-700 text-sm p-3 rounded">
            {formError}
            {duplicateId && (
              <>
                {' '}
                <Link href={`/inquiries/${duplicateId}`} className="underline">
                  View the existing inquiry
                </Link>
              </>
            )}
          </div>
        )}

        <div>
          <label htmlFor="customer_name" className="block text-sm font-medium text-gray-700">
            Customer name
          </label>
          <input
            id="customer_name"
            value={values.customer_name}
            onChange={(e) => update('customer_name', e.target.value)}
            className={inputClass('customer_name')}
          />
          {errors.customer_name && (
            <p className="text-sm text-red-600 mt-1">{errors.customer_name}</p>
          )}
        </div>

        <div>
          <label htmlFor="customer_contact" className="block text-sm font-medium text-gray-700">
            Contact (phone or email)
          </label>
          <input
            id="customer_contact"
            value={values.customer_contact}
            onChange={(e) => update('customer_contact', e.target.value)}
            className={inputClass('customer_contact')}
          />
          {errors.customer_contact && (
            <p className="text-sm text-red-600 mt-1">{errors.customer_contact}</p>
          )}
        </div>

        <div>
          <label htmlFor="subject" className="block text-sm font-medium text-gray-700">
            Subject
          </label>
          <input
            id="subject"
            value={values.subject}
            onChange={(e) => update('subject', e.target.value)}
            className={inputClass('subject')}
          />
          {errors.subject && <p className="text-sm text-red-600 mt-1">{errors.subject}</p>}
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700">
            Description
          </label>
          <textarea
            id="description"
            rows={4}
            value={values.description}
            onChange={(e) => update('description', e.target.value)}
            className={inputClass('description')}
          />
          {errors.description && (
            <p className="text-sm text-red-600 mt-1">{errors.description}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save inquiry'}
        </button>
      </form>
    </main>
  );
}