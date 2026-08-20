// Section map -- grep "[SEC NNN]" to jump to any section; numbers are stable even as line numbers drift.
// SEC 100  Imports, helpers & state init   formatDateTime · hooks · state
// SEC 200  Action handlers                 handleOpenReview · handleAccept · handleBackToList
// SEC 300  renderList / renderReview        table of assigned RAMS · document review + sign-off form
// SEC 400  Main JSX return                 page shell · warnings · feedback · export

// [SEC 100] Imports, helpers & state init
import React, { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../hooks/useAuth';
import { useAllRamsDocuments } from '../hooks/useAllRamsDocuments';
import PrintableDocument from '../components/PrintableDocument';

const formatDateTime = (value) => {
  if (!value) {
    return null;
  }
  const date = typeof value?.toDate === 'function' ? value.toDate() : value;
  try {
    return new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
  } catch (error) {
    console.warn('Unable to format acceptance date', error);
    return null;
  }
};

const AssignedRamsPage = () => {
  const navigate = useNavigate();
  const { user: currentUser, loading: authLoading } = useAuth();
  const { documents, loading, acceptDocument } = useAllRamsDocuments(currentUser);

  const [activeReview, setActiveReview] = useState(null);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [signatureText, setSignatureText] = useState('');
  const [feedback, setFeedback] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isAccepting, setIsAccepting] = useState(false);

  const myDocuments = useMemo(() => {
    if (!currentUser?.email) {
      return [];
    }
    return documents.filter(docMeta => docMeta.assignedEngineerEmails?.includes(currentUser.email));
  }, [documents, currentUser]);
// [SEC 100 END]

// [SEC 200] Action handlers
  const handleOpenReview = useCallback(async (docMeta) => {
    setErrorMessage('');
    setFeedback('');
    setReviewLoading(true);
    try {
      const snapshot = await getDoc(doc(db, 'ramsDocuments', docMeta.id));
      if (!snapshot.exists()) {
        setErrorMessage('This RAMS document no longer exists.');
        return;
      }
      const fullData = snapshot.data();
      const myEntry = (fullData.assignedEngineers || []).find(e => e.email === currentUser.email);
      setSignatureText(myEntry?.name || '');
      setActiveReview({
        id: docMeta.id,
        meta: docMeta,
        formData: fullData.formData,
        acceptances: fullData.acceptances || {},
        myEntry,
      });
    } catch (error) {
      console.error('Failed to load RAMS document for review', error);
      setErrorMessage('Unable to load this RAMS document. Please try again.');
    } finally {
      setReviewLoading(false);
    }
  }, [currentUser]);

  const handleBackToList = useCallback(() => {
    setActiveReview(null);
    setSignatureText('');
  }, []);

  const handleAccept = useCallback(async () => {
    if (!activeReview?.myEntry) {
      return;
    }
    if (!signatureText.trim()) {
      setErrorMessage('Please type your name to sign and accept this RAMS.');
      return;
    }
    setIsAccepting(true);
    setErrorMessage('');
    try {
      await acceptDocument(activeReview.id, activeReview.myEntry.id, {
        name: activeReview.myEntry.name,
        email: activeReview.myEntry.email,
        signatureText: signatureText.trim(),
      });
      setFeedback('RAMS accepted and signed.');
      setActiveReview(null);
      setSignatureText('');
    } catch (error) {
      console.error('Failed to accept RAMS document', error);
      setErrorMessage(error?.message || 'Unable to record acceptance. Please try again.');
    } finally {
      setIsAccepting(false);
    }
  }, [activeReview, signatureText, acceptDocument]);
// [SEC 200 END]

// [SEC 300] renderList / renderReview
  const taskLookup = useMemo(() => {
    if (!activeReview?.formData?.selectedTasks) {
      return {};
    }
    const map = {};
    activeReview.formData.selectedTasks.forEach((task) => {
      if (!task?.taskId) {
        return;
      }
      if (!map[task.taskId]) {
        map[task.taskId] = { title: task.taskTitle || task.taskId };
      }
    });
    return map;
  }, [activeReview]);

  const renderReview = () => {
    const isAccepted = Boolean(activeReview.myEntry && activeReview.acceptances[activeReview.myEntry.id]);
    const acceptedRecord = activeReview.myEntry ? activeReview.acceptances[activeReview.myEntry.id] : null;

    return (
      <div>
        <button
          onClick={handleBackToList}
          className="mb-4 inline-flex items-center gap-2 rounded border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-[var(--uctel-blue)] hover:text-[var(--uctel-blue)]"
        >
          &larr; Back to Assigned RAMS
        </button>

        <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          {isAccepted ? (
            <div className="rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              You accepted this RAMS as <strong>{acceptedRecord.signatureText}</strong>
              {formatDateTime(acceptedRecord.acceptedAt) ? ` on ${formatDateTime(acceptedRecord.acceptedAt)}` : ''}.
            </div>
          ) : (
            <>
              <h3 className="text-lg font-semibold text-slate-800">Acknowledge &amp; Accept</h3>
              <p className="mt-1 text-sm text-slate-600">
                Review the RAMS below, then type your name to sign and confirm you have read and accept it.
              </p>
              <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                <input
                  type="text"
                  value={signatureText}
                  onChange={(e) => setSignatureText(e.target.value)}
                  placeholder="Type your full name to sign"
                  className="flex-grow rounded-md border border-slate-300 p-2 text-sm"
                />
                <button
                  onClick={handleAccept}
                  disabled={isAccepting}
                  className={`rounded-lg px-6 py-2 text-sm font-semibold text-white transition ${
                    isAccepting ? 'cursor-wait bg-teal-400' : 'bg-[var(--uctel-teal)] hover:bg-teal-600'
                  }`}
                >
                  {isAccepting ? 'Signing…' : 'Acknowledge & Accept'}
                </button>
              </div>
            </>
          )}
        </div>

        {activeReview.formData && (
          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <PrintableDocument data={activeReview.formData} allTasks={taskLookup} />
          </div>
        )}
      </div>
    );
  };

  const renderList = () => {
    if (authLoading) {
      return <div className="py-16 text-center text-slate-500">Checking your UCtel session…</div>;
    }

    if (!currentUser) {
      return (
        <div className="py-16 text-center text-slate-600">
          <p className="text-lg font-semibold text-slate-700">You need to sign in to view RAMS assigned to you.</p>
        </div>
      );
    }

    if (loading) {
      return <div className="py-16 text-center text-slate-500">Loading assigned RAMS…</div>;
    }

    if (myDocuments.length === 0) {
      return (
        <div className="py-16 text-center text-slate-600">
          <p className="text-lg font-semibold text-slate-700">No RAMS currently assigned to you.</p>
          <p className="mt-2 text-sm text-slate-500">
            RAMS get assigned via the "Requires sign-off" option on the Project Team step.
          </p>
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
                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Status</th>
                <th scope="col" className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {myDocuments.map((docMeta) => {
                const myEntry = docMeta.assignedEngineers.find(e => e.email === currentUser.email);
                const isAccepted = Boolean(myEntry && docMeta.acceptances[myEntry.id]);
                return (
                  <tr key={docMeta.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-sm font-semibold text-slate-800">{docMeta.client}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">{docMeta.projectDescription || '—'}</td>
                    <td className="px-4 py-3 text-sm">
                      {isAccepted ? (
                        <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                          Accepted
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                          Pending
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right text-sm">
                      <button
                        onClick={() => handleOpenReview(docMeta)}
                        disabled={reviewLoading}
                        className="inline-flex items-center gap-1 rounded border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-[var(--uctel-blue)] hover:text-[var(--uctel-blue)]"
                      >
                        {isAccepted ? 'View' : 'Review & Accept'}
                      </button>
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
// [SEC 300 END]

// [SEC 400] Main JSX return
  return (
    <div className="min-h-screen bg-slate-100" style={{ '--uctel-orange': '#d88e43', '--uctel-teal': '#008080', '--uctel-blue': '#2c4f6b' }}>
      <div className="container mx-auto px-4 py-8 md:px-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-slate-800">Assigned RAMS</h1>
            <p className="text-sm text-slate-500">RAMS documents that require your sign-off.</p>
          </div>
          <button
            onClick={() => navigate('/')}
            className="inline-flex items-center gap-2 rounded border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-[var(--uctel-blue)] hover:text-[var(--uctel-blue)]"
          >
            Back to RAMS Builder
          </button>
        </div>

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

        {activeReview ? renderReview() : renderList()}
      </div>
    </div>
  );
};

export default AssignedRamsPage;
// [SEC 400 END]
