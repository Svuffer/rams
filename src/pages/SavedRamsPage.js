import React, { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useSavedRamsDocuments } from '../hooks/useSavedRamsDocuments';
import { useAllRamsDocuments } from '../hooks/useAllRamsDocuments';

const formatDateTime = (value) => {
  if (!value) {
    return 'Not yet saved';
  }
  try {
    return new Intl.DateTimeFormat('en-GB', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(value);
  } catch (error) {
    console.warn('Unable to format RAMS updatedAt value', error);
    return value.toString();
  }
};

const buildShareLink = (shareCode) => {
  if (!shareCode) {
    return null;
  }
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  return `${origin}/share/${shareCode}`;
};

const SavedRamsPage = () => {
  const navigate = useNavigate();
  const { user: currentUser, loading: authLoading } = useAuth();
  const [viewMode, setViewMode] = useState('mine'); // 'mine' or 'all'

  // Use different hooks based on view mode
  const myDocumentsHook = useSavedRamsDocuments(currentUser);
  const allDocumentsHook = useAllRamsDocuments(currentUser);

  const {
    documents,
    loading,
    indexWarning,
    deleteDocument,
  } = viewMode === 'mine' ? myDocumentsHook : allDocumentsHook;

  const [feedback, setFeedback] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [pendingDeleteId, setPendingDeleteId] = useState(null);

  const sortedDocuments = useMemo(() => {
    return [...documents];
  }, [documents]);

  const clearMessages = () => {
    setFeedback('');
    setErrorMessage('');
  };

  const handleCopyLink = useCallback((shareCode) => {
    clearMessages();
    if (!shareCode) {
      setErrorMessage('This RAMS does not yet have a share link. Save it first to generate a customer link.');
      return;
    }

    const link = buildShareLink(shareCode);
    if (!link) {
      setErrorMessage('Unable to build the share link at this time.');
      return;
    }

    if (navigator.clipboard?.writeText) {
      navigator.clipboard
        .writeText(link)
        .then(() => {
          setFeedback('Customer link copied to clipboard.');
        })
        .catch((error) => {
          console.warn('Clipboard copy failed, falling back to prompt', error);
          window.prompt('Copy the RAMS link below:', link);
        });
    } else {
      window.prompt('Copy the RAMS link below:', link);
    }
  }, []);

  const handleDelete = useCallback(async (documentId, isOwner) => {
    clearMessages();
    if (!documentId) {
      setErrorMessage('Missing RAMS document identifier.');
      return;
    }

    if (!isOwner) {
      setErrorMessage('You can only delete your own RAMS documents.');
      return;
    }

    const confirmation = window.confirm('Are you sure you want to permanently delete this RAMS?');
    if (!confirmation) {
      return;
    }

    try {
      setPendingDeleteId(documentId);
      await deleteDocument(documentId);
      setFeedback('RAMS deleted successfully.');
    } catch (error) {
      console.error('Failed to delete RAMS document', error);
      setErrorMessage(error?.message || 'Unable to delete this RAMS. Please try again.');
    } finally {
      setPendingDeleteId(null);
    }
  }, [deleteDocument]);

  const handleContinueEditing = useCallback((documentId, isOwner) => {
    if (!documentId) {
      return;
    }
    if (!isOwner) {
      setErrorMessage('You can only edit your own RAMS documents.');
      setTimeout(() => setErrorMessage(''), 4000);
      return;
    }
    clearMessages();
    navigate('/', { state: { loadDocumentId: documentId } });
  }, [navigate]);

  const renderContent = () => {
    if (authLoading) {
      return <div className="py-16 text-center text-slate-500">Checking your UCtel session…</div>;
    }

    if (!currentUser) {
      return (
        <div className="py-16 text-center text-slate-600">
          <p className="text-lg font-semibold text-slate-700">You need to sign in to manage saved RAMS.</p>
          <p className="mt-4 text-sm text-slate-500">Return to the RAMS builder via the UCtel portal and sign in again.</p>
          <button
            onClick={() => navigate('/')}
            className="mt-6 inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-[var(--uctel-blue)] hover:text-[var(--uctel-blue)] focus:outline-none focus:ring-2 focus:ring-[var(--uctel-blue)]"
          >
            Back to RAMS Builder
          </button>
        </div>
      );
    }

    if (loading) {
      return <div className="py-16 text-center text-slate-500">Loading saved RAMS…</div>;
    }

    if (sortedDocuments.length === 0) {
      return (
        <div className="py-16 text-center text-slate-600">
          <p className="text-lg font-semibold text-slate-700">No RAMS saved yet.</p>
          <p className="mt-2 text-sm text-slate-500">Create a RAMS in the builder and use "Save RAMS" to store it here.</p>
          <button
            onClick={() => navigate('/')}
            className="mt-6 inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-[var(--uctel-blue)] hover:text-[var(--uctel-blue)] focus:outline-none focus:ring-2 focus:ring-[var(--uctel-blue)]"
          >
            Back to RAMS Builder
          </button>
        </div>
      );
    }

    return (
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Client</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Project</th>
                {viewMode === 'all' && (
                  <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Created By</th>
                )}
                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Last Updated</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Share Link</th>
                <th scope="col" className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {sortedDocuments.map((docMeta) => {
                const shareLink = buildShareLink(docMeta.shareCode);
                const isOwner = docMeta.isOwner || docMeta.ownerUid === currentUser?.uid;
                return (
                  <tr key={docMeta.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-sm font-semibold text-slate-800">
                      <div className="flex items-center gap-2">
                        {docMeta.client}
                        {isOwner && (
                          <span className="inline-flex items-center rounded-full bg-teal-100 px-2 py-0.5 text-xs font-medium text-teal-700">
                            Yours
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">{docMeta.projectDescription || '—'}</td>
                    {viewMode === 'all' && (
                      <td className="px-4 py-3 text-sm text-slate-600">
                        {docMeta.ownerName || 'Unknown'}
                      </td>
                    )}
                    <td className="px-4 py-3 text-sm text-slate-500">{formatDateTime(docMeta.updatedAt)}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {shareLink ? (
                        <div className="flex flex-col gap-1">
                          <a
                            href={shareLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[var(--uctel-blue)] underline decoration-[var(--uctel-blue)]/60 decoration-dotted underline-offset-2 hover:text-[var(--uctel-teal)]"
                          >
                            {docMeta.shareCode}
                          </a>
                          <button
                            onClick={() => handleCopyLink(docMeta.shareCode)}
                            className="inline-flex w-max items-center gap-1 rounded border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-600 transition hover:border-[var(--uctel-blue)] hover:text-[var(--uctel-blue)]"
                          >
                            Copy link
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">Save to generate link</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right text-sm">
                      <div className="flex flex-wrap justify-end gap-2">
                        <button
                          onClick={() => handleContinueEditing(docMeta.id, isOwner)}
                          disabled={!isOwner}
                          className={`inline-flex items-center gap-1 rounded border px-3 py-1.5 text-xs font-semibold transition ${
                            isOwner
                              ? 'border-slate-300 text-slate-600 hover:border-[var(--uctel-blue)] hover:text-[var(--uctel-blue)]'
                              : 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400'
                          }`}
                          title={isOwner ? 'Edit this RAMS' : 'You can only edit your own RAMS'}
                        >
                          {isOwner ? 'Continue editing' : 'View only'}
                        </button>
                        {docMeta.shareCode && (
                          <a
                            href={shareLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 rounded border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-[var(--uctel-blue)] hover:text-[var(--uctel-blue)]"
                          >
                            View public page
                          </a>
                        )}
                        <button
                          onClick={() => handleDelete(docMeta.id, isOwner)}
                          disabled={pendingDeleteId === docMeta.id || !isOwner}
                          className={`inline-flex items-center gap-1 rounded border px-3 py-1.5 text-xs font-semibold transition focus:outline-none focus:ring-2 focus:ring-red-300 ${
                            pendingDeleteId === docMeta.id
                              ? 'cursor-wait border-red-200 bg-red-100 text-red-400'
                              : !isOwner
                              ? 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400'
                              : 'border-red-200 text-red-600 hover:border-red-400 hover:text-red-700'
                          }`}
                          title={isOwner ? 'Delete this RAMS' : 'You can only delete your own RAMS'}
                        >
                          {pendingDeleteId === docMeta.id ? 'Deleting…' : 'Delete'}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-100" style={{ '--uctel-orange': '#d88e43', '--uctel-teal': '#008080', '--uctel-blue': '#2c4f6b' }}>
      <div className="container mx-auto px-4 py-8 md:px-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-slate-800">Saved RAMS</h1>
            <p className="text-sm text-slate-500">
              {viewMode === 'mine'
                ? 'Manage your saved risk assessments, copy share links, or remove outdated drafts.'
                : 'View all RAMS created by the UCtel team.'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* View Mode Toggle */}
            <div className="inline-flex rounded-lg border border-slate-300 bg-white p-1 shadow-sm">
              <button
                onClick={() => setViewMode('mine')}
                className={`rounded-md px-4 py-2 text-sm font-semibold transition ${
                  viewMode === 'mine'
                    ? 'bg-[var(--uctel-blue)] text-white'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                My RAMS
              </button>
              <button
                onClick={() => setViewMode('all')}
                className={`rounded-md px-4 py-2 text-sm font-semibold transition ${
                  viewMode === 'all'
                    ? 'bg-[var(--uctel-blue)] text-white'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                All RAMS
              </button>
            </div>
            <button
              onClick={() => navigate('/')}
              className="inline-flex items-center gap-2 rounded border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-[var(--uctel-blue)] hover:text-[var(--uctel-blue)] focus:outline-none focus:ring-2 focus:ring-[var(--uctel-blue)]"
            >
              Back to RAMS Builder
            </button>
          </div>
        </div>

        {indexWarning && (
          <div className="mb-6 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            RAMS are temporarily sorted on the client because the Firestore composite index is still building. Once the index is ready, this warning will disappear.
          </div>
        )}

        {feedback && (
          <div className="mb-4 rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {feedback}
          </div>
        )}

        {errorMessage && (
          <div className="mb-4 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMessage}
          </div>
        )}

        {renderContent()}
      </div>
    </div>
  );
};

export default SavedRamsPage;
