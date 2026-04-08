import { useState, useEffect, useCallback } from 'react';
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  doc,
  getDoc,
  deleteDoc,
} from 'firebase/firestore';
import { db } from '../firebase';

const sortDocumentsByUpdatedAt = (documents) => {
  return [...documents].sort((a, b) => {
    const aTime = a.updatedAt ? a.updatedAt.getTime() : 0;
    const bTime = b.updatedAt ? b.updatedAt.getTime() : 0;
    return bTime - aTime;
  });
};

/**
 * Listens to ALL RAMS documents (not just current user's).
 * Falls back to client-side sorting if the composite Firestore index has not been created yet.
 */
export const useAllRamsDocuments = (currentUser) => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [indexWarning, setIndexWarning] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!currentUser?.uid) {
      setDocuments([]);
      setLoading(false);
      setIndexWarning(false);
      setError(null);
      return () => {};
    }

    setLoading(true);
    setError(null);
    setIndexWarning(false);

    // Query ALL documents, not just owned ones
    const baseQuery = query(collection(db, 'ramsDocuments'));

    const handleSnapshot = (snapshot, sortLocally = false) => {
      const nextDocuments = snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        const toDate = (value) => (value && typeof value.toDate === 'function' ? value.toDate() : null);
        return {
          id: docSnap.id,
          client: data.client || 'Untitled RAMS',
          projectDescription: data.projectDescription || '',
          siteAddress: data.siteAddress || '',
          updatedAt: toDate(data.updatedAt),
          createdAt: toDate(data.createdAt),
          shareCode: data.shareCode || null,
          ownerUid: data.ownerUid || null,
          ownerName: data.ownerName || data.ownerEmail || 'Unknown',
          isOwner: data.ownerUid === currentUser?.uid,
        };
      });

      setDocuments(sortLocally ? sortDocumentsByUpdatedAt(nextDocuments) : nextDocuments);
      setLoading(false);
      setIndexWarning(sortLocally);
    };

    let fallbackAttached = false;
    let fallbackUnsubscribe = null;

    const attachFallbackListener = () => {
      if (fallbackAttached) {
        return;
      }
      fallbackAttached = true;
      fallbackUnsubscribe = onSnapshot(
        baseQuery,
        (snapshot) => handleSnapshot(snapshot, true),
        (fallbackError) => {
          console.error('Failed to subscribe to all RAMS documents without ordering', fallbackError);
          setLoading(false);
          setError(fallbackError);
        },
      );
    };

    const orderedQuery = query(baseQuery, orderBy('updatedAt', 'desc'));

    const orderedUnsubscribe = onSnapshot(
      orderedQuery,
      (snapshot) => handleSnapshot(snapshot, false),
      (queryError) => {
        if (queryError?.code === 'failed-precondition') {
          console.warn('[rams] Missing Firestore index for updatedAt, using client-side sort instead.');
          attachFallbackListener();
          return;
        }
        console.error('Failed to subscribe to all RAMS documents', queryError);
        setLoading(false);
        setError(queryError);
      },
    );

    return () => {
      orderedUnsubscribe();
      if (fallbackUnsubscribe) {
        fallbackUnsubscribe();
      }
    };
  }, [currentUser?.uid]);

  const deleteDocument = useCallback(async (documentId) => {
    if (!currentUser?.uid) {
      throw new Error('You must be signed in to delete a RAMS document.');
    }
    if (!documentId) {
      throw new Error('Missing RAMS document identifier.');
    }

    const documentRef = doc(db, 'ramsDocuments', documentId);
    const snapshot = await getDoc(documentRef);

    if (!snapshot.exists()) {
      throw new Error('This RAMS document no longer exists.');
    }

    // Anyone can delete any RAMS (team shared)
    await deleteDoc(documentRef);
  }, [currentUser]);

  return {
    documents,
    loading,
    indexWarning,
    error,
    deleteDocument,
  };
};
