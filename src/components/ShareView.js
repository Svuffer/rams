// Section map -- grep "[SEC NNN]" to jump to any section; numbers are stable even as line numbers drift.
// SEC 100  Imports & state init    React hooks, React Router, PrintableDocument
// SEC 200  Data fetching           useEffect fetchDocument · inlineImages helper
// SEC 300  PDF generation          handleDownloadPdf · taskLookup memo
// SEC 400  JSX render              loading/error states · main return · formatDate · export

// [SEC 100] Imports & state init
import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import PrintableDocument from './PrintableDocument';

const ShareView = () => {
  const { shareCode } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [payload, setPayload] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const printableRef = useRef(null);
// [SEC 100 END]

// [SEC 200] Data fetching
    let cancelled = false;
    const fetchDocument = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/rams/share/${encodeURIComponent(shareCode)}`);
        if (!response.ok) {
          throw new Error(`Unable to load RAMS (${response.status})`);
        }
        const data = await response.json();
        const normalised = {
          ...data,
          meta: {
            ...data.meta,
            updatedAt: data.meta?.updatedAt ? new Date(data.meta.updatedAt) : null,
            createdAt: data.meta?.createdAt ? new Date(data.meta.createdAt) : null,
          },
        };
        if (!cancelled) {
          setPayload(normalised);
        }
      } catch (err) {
        if (!cancelled) {
          console.error('Failed to fetch shared RAMS', err);
          setError(err.message || 'Unknown error');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    if (shareCode) {
      fetchDocument();
    } else {
      setLoading(false);
      setError('No share code provided.');
    }

    return () => {
      cancelled = true;
    };
  }, [shareCode]);
// [SEC 200 END]

// [SEC 300] PDF generation
  const inlineImages = useCallback(async (container) => {
    const images = Array.from(container.querySelectorAll('img'));
    await Promise.all(
      images.map(async (img) => {
        const src = img.getAttribute('src');
        if (!src || src.startsWith('data:')) {
          return;
        }
        try {
          const response = await fetch(src);
          if (!response.ok) {
            return;
          }
          const blob = await response.blob();
          const reader = new FileReader();
          const dataUrl = await new Promise((resolve) => {
            reader.onload = () => resolve(reader.result);
            reader.readAsDataURL(blob);
          });
          img.setAttribute('src', dataUrl);
        } catch (err) {
          console.warn('Inline image failed', src, err);
        }
      }),
    );
  }, []);

  const handleDownloadPdf = useCallback(async () => {
    if (!printableRef.current) {
      return;
    }
    const apiKey = process.env.REACT_APP_PDFSHIFT_KEY;
    if (!apiKey) {
      alert('PDF generation is unavailable. Missing REACT_APP_PDFSHIFT_KEY.');
      return;
    }
    setIsGenerating(true);
    try {
      const clone = printableRef.current.cloneNode(true);
      clone.style.position = 'fixed';
      clone.style.left = '-9999px';
      document.body.appendChild(clone);
      await inlineImages(clone);
      const html = `<!DOCTYPE html><html><head><meta charset="utf-8" /><title>RAMS</title></head><body>${clone.innerHTML}</body></html>`;
      document.body.removeChild(clone);

      const response = await fetch('https://api.pdfshift.io/v3/convert/pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': apiKey,
        },
        body: JSON.stringify({
          source: html,
          format: 'A4',
          margin: '15mm',
        }),
      });

      if (!response.ok) {
        throw new Error(`PDFShift responded with ${response.status}`);
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      const filenameBase = payload?.meta?.client ? payload.meta.client.replace(/[^a-z0-9_-]+/gi, '_') : 'UCtel_RAMS';
      anchor.download = `${filenameBase}.pdf`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('PDF generation failed', err);
      alert('Unable to generate PDF. Please try again later.');
    } finally {
      setIsGenerating(false);
    }
  }, [inlineImages, payload]);
// [SEC 300 END]

// [SEC 400] JSX render
  const taskLookup = useMemo(() => {
    if (!payload?.formData?.selectedTasks) {
      return {};
    }
    const map = {};
    payload.formData.selectedTasks.forEach((task) => {
      if (!task?.taskId) {
        return;
      }
      if (!map[task.taskId]) {
        map[task.taskId] = { title: task.taskTitle || task.taskId };
      }
    });
    return map;
  }, [payload]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100">
        <span className="text-slate-500">Loading RAMS…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
        <div className="max-w-lg rounded-2xl bg-white p-8 text-center shadow-xl">
          <h1 className="text-xl font-semibold text-slate-800">RAMS unavailable</h1>
          <p className="mt-3 text-sm text-slate-500">{error}</p>
          <p className="mt-6 text-sm text-slate-500">
            If you believe this is an error, please contact your UCtel project manager.
          </p>
          <Link
            to="/"
            className="mt-6 inline-flex items-center justify-center rounded-lg bg-[var(--uctel-blue,#2c4f6b)] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-opacity-90"
          >
            Go to UCtel Portal
          </Link>
        </div>
      </div>
    );
  }

  if (!payload?.formData) {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-100 py-10" style={{ '--uctel-blue': '#2c4f6b', '--uctel-teal': '#008080' }}>
      <div className="mx-auto max-w-5xl rounded-3xl bg-white p-6 shadow-2xl">
        <div className="flex flex-col gap-3 border-b border-slate-200 pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[var(--uctel-blue)]">Shared RAMS</h1>
            <p className="text-sm text-slate-500">Prepared for {payload.meta?.client || 'UCtel client'}</p>
            {payload.meta?.updatedAt && (
              <p className="text-xs text-slate-400">
                Last updated {formatDate(payload.meta.updatedAt)}
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleDownloadPdf}
              disabled={isGenerating}
              className={`rounded-lg px-4 py-2 text-sm font-semibold text-white shadow-sm transition focus:outline-none focus:ring-2 focus:ring-[var(--uctel-blue)] ${isGenerating ? 'cursor-not-allowed bg-slate-300' : 'bg-[var(--uctel-blue)] hover:bg-opacity-90'}`}
            >
              {isGenerating ? 'Generating…' : 'Download PDF'}
            </button>
            <button
              onClick={() => window.print()}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-[var(--uctel-blue)] hover:text-[var(--uctel-blue)]"
            >
              Print
            </button>
          </div>
        </div>
        <div ref={printableRef} className="mt-6">
          <PrintableDocument data={payload.formData} allTasks={taskLookup} />
        </div>
      </div>
    </div>
  );
};

const formatDate = (value) => {
  if (!value) {
    return 'Not available';
  }
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) {
    return 'Not available';
  }
  return new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
};

export default ShareView;
// [SEC 400 END]
