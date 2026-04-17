export type RSVPStatus = 'pending' | 'attending' | 'declined';

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string;
}

export interface Party {
  id: string;
  title: string;
  date: any; // Firestore Timestamp
  location: {
    address: string;
    lat?: number;
    lng?: number;
    placeId?: string;
  };
  description: string;
  hostId: string;
  theme?: string;
  customThemeConfig?: {
    backgroundColor?: string;
    textColor?: string;
    backgroundImageUrl?: string;
    backgroundPattern?: string;
  };
  invitationText?: string;
  invitationImageUrl?: string;
  photoUrls: string[];
  createdAt: any;
  language?: string;
}

export interface Guest {
  id: string;
  partyId: string;
  name: string;
  email: string;
  phone?: string;
  status: RSVPStatus;
  plusOnes: number;
  userId?: string; // If they are a registered user
}

export interface Gift {
  id: string;
  partyId: string;
  name: string;
  description?: string;
  url?: string;
  claimedBy?: string; // User ID
  claimedByName?: string;
}
