import type { Request, Response } from "express";
import { v4 as uuid } from "uuid";
import {
  Event,
  addEvent,
  addTicketToWallet,
  getEventById,
  getTicketsForWallet,
  listEvents,
} from "../data/events";

// For MVP we treat each event as a single ASA collection where each unit
// represents a ticket. A real-world deployment would likely use NFTs.

export const createEvent = (req: Request, res: Response) => {
  const {
    name,
    description,
    ticketPrice,
    totalTickets,
    creator,
    assetId,
    category,
    date,
    location,
  } = req.body as Partial<Event> & {
    ticketPrice: number;
    totalTickets: number;
    creator: string;
    assetId: number;
    category: string;
    date: string;
    location: string;
  };

  if (
    !name ||
    !description ||
    ticketPrice === undefined ||
    ticketPrice === null ||
    !totalTickets ||
    !creator ||
    !category ||
    !date ||
    !location
  ) {
    return res.status(400).json({
      error:
        "name, description, ticketPrice, totalTickets, creator, category, date and location are required",
    });
  }

  const id = uuid();
  const event = addEvent({
    id,
    name,
    description,
    ticketPrice,
    totalTickets,
    remainingTickets: totalTickets,
    creator,
    assetId: assetId ?? Number(process.env.CAMPUS_TOKEN_ID || 0),
    category,
    date,
    location,
  });

  res.status(201).json(event);
};

export const buyTicket = (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  const { buyer } = req.body as { buyer: string };

  const event = getEventById(id);
  if (!event) return res.status(404).json({ error: "Event not found" });
  if (event.remainingTickets <= 0) {
    return res.status(400).json({ error: "Event sold out" });
  }

  // In a full implementation, we would build and send an ASA transfer
  // transaction here. For the MVP, we assume the frontend performs the
  // actual transfer and we just track ownership.
  event.remainingTickets -= 1;
  addTicketToWallet(buyer, event.id); // Changed from event.assetId to event.id

  res.json({
    event,
    message: "Ticket reserved. Complete ASA transfer from frontend.",
  });
};

export const verifyTicketsForWallet = (req: Request, res: Response) => {
  const { walletAddress } = req.params as { walletAddress: string };
  const eventIds = getTicketsForWallet(walletAddress);
  res.json({ walletAddress, eventIds });
};

export const getEvent = (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  const event = getEventById(id);
  if (!event) return res.status(404).json({ error: "Event not found" });
  res.json(event);
};

export const listAllEvents = (_req: Request, res: Response) => {
  res.json(listEvents());
};

