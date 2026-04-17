import { Party, Guest, Gift } from '../types';

const PARTIES_KEY = 'partypal_parties';
const GUESTS_KEY = 'partypal_guests';
const GIFTS_KEY = 'partypal_gifts';

const safeParse = (data: string | null) => {
  if (!data) return [];
  try {
    return JSON.parse(data);
  } catch (e) {
    console.error("Error parsing local storage data:", e);
    return [];
  }
};

export const store = {
  getParties: (): Party[] => {
    const data = localStorage.getItem(PARTIES_KEY);
    return safeParse(data);
  },
  saveParty: (party: Party) => {
    const parties = store.getParties();
    const index = parties.findIndex(p => p.id === party.id);
    if (index >= 0) {
      parties[index] = party;
    } else {
      parties.push(party);
    }
    localStorage.setItem(PARTIES_KEY, JSON.stringify(parties));
  },
  deleteParty: (id: string) => {
    const parties = store.getParties().filter(p => p.id !== id);
    localStorage.setItem(PARTIES_KEY, JSON.stringify(parties));
  },
  
  getGuests: (partyId: string): Guest[] => {
    const data = localStorage.getItem(GUESTS_KEY);
    const allGuests: Guest[] = safeParse(data);
    return allGuests.filter(g => g.partyId === partyId);
  },
  saveGuest: (guest: Guest) => {
    const data = localStorage.getItem(GUESTS_KEY);
    const allGuests: Guest[] = safeParse(data);
    const index = allGuests.findIndex(g => g.id === guest.id);
    if (index >= 0) {
      allGuests[index] = guest;
    } else {
      allGuests.push(guest);
    }
    localStorage.setItem(GUESTS_KEY, JSON.stringify(allGuests));
  },
  
  getGifts: (partyId: string): Gift[] => {
    const data = localStorage.getItem(GIFTS_KEY);
    const allGifts: Gift[] = safeParse(data);
    return allGifts.filter(g => g.partyId === partyId);
  },
  saveGift: (gift: Gift) => {
    const data = localStorage.getItem(GIFTS_KEY);
    const allGifts: Gift[] = safeParse(data);
    const index = allGifts.findIndex(g => g.id === gift.id);
    if (index >= 0) {
      allGifts[index] = gift;
    } else {
      allGifts.push(gift);
    }
    localStorage.setItem(GIFTS_KEY, JSON.stringify(allGifts));
  }
};
