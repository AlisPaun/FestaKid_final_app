import { db, auth } from '../firebase';
import { collection, doc, setDoc, deleteDoc, onSnapshot, getDocs, query, where } from 'firebase/firestore';
import { Party, Guest, Gift } from '../types';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string;
    email?: string | null;
    emailVerified?: boolean;
    isAnonymous?: boolean;
    tenantId?: string | null;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export const subscribeToParties = (callback: (parties: Party[], metadata: { hasPendingWrites: boolean }) => void) => {
  if (!auth.currentUser) {
    callback([], { hasPendingWrites: false });
    return () => {};
  }
  
  const q = query(collection(db, 'parties'), where('hostId', '==', auth.currentUser.uid));
  
  return onSnapshot(q, (snapshot) => {
    const parties = snapshot.docs.map(doc => doc.data() as Party);
    callback(parties, { hasPendingWrites: snapshot.metadata.hasPendingWrites });
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, 'parties');
  });
};

export const subscribeToParty = (partyId: string, callback: (party: Party | null) => void) => {
  return onSnapshot(doc(db, 'parties', partyId), (snapshot) => {
    if (snapshot.exists()) {
      callback(snapshot.data() as Party);
    } else {
      callback(null);
    }
  }, (error) => {
    handleFirestoreError(error, OperationType.GET, `parties/${partyId}`);
  });
};

export const subscribeToGuests = (partyId: string, callback: (guests: Guest[]) => void) => {
  const q = query(collection(db, `parties/${partyId}/guests`));
  return onSnapshot(q, (snapshot) => {
    const guests = snapshot.docs.map(doc => doc.data() as Guest);
    callback(guests);
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, `parties/${partyId}/guests`);
  });
};

export const subscribeToGifts = (partyId: string, callback: (gifts: Gift[]) => void) => {
  const q = query(collection(db, `parties/${partyId}/gifts`));
  return onSnapshot(q, (snapshot) => {
    const gifts = snapshot.docs.map(doc => doc.data() as Gift);
    callback(gifts);
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, `parties/${partyId}/gifts`);
  });
};

export const saveParty = async (party: Party) => {
  try {
    await setDoc(doc(db, 'parties', party.id), party);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `parties/${party.id}`);
  }
};

export const deleteParty = async (id: string) => {
  try {
    await deleteDoc(doc(db, 'parties', id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `parties/${id}`);
  }
};

export const saveGuest = async (guest: Guest) => {
  try {
    await setDoc(doc(db, `parties/${guest.partyId}/guests`, guest.id), guest);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `parties/${guest.partyId}/guests/${guest.id}`);
  }
};

export const saveGift = async (gift: Gift) => {
  try {
    await setDoc(doc(db, `parties/${gift.partyId}/gifts`, gift.id), gift);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `parties/${gift.partyId}/gifts/${gift.id}`);
  }
};

export const saveFeedback = async (feedback: { id: string; text: string; userId?: string; createdAt: string }) => {
  try {
    await setDoc(doc(db, 'feedback', feedback.id), feedback);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `feedback/${feedback.id}`);
  }
};
