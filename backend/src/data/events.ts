export interface Event {
  id: string;
  name: string;
  description: string;
  ticketPrice: number;
  totalTickets: number;
  remainingTickets: number;
  assetId: number;
  creator: string;
  category: string;
  date: string;
  location: string;
}

const events = new Map<string, Event>();
const ticketsByWallet = new Map<string, string[]>(); // wallet -> eventIds

export const addEvent = (event: Event) => {
  events.set(event.id, event);
  return event;
};

export const getEventById = (id: string) => events.get(id);

export const addTicketToWallet = (wallet: string, eventId: string) => {
  const current = ticketsByWallet.get(wallet) || [];
  current.push(eventId);
  ticketsByWallet.set(wallet, current);
};

export const getTicketsForWallet = (wallet: string) =>
  ticketsByWallet.get(wallet) || [];

export const listEvents = () => Array.from(events.values());


