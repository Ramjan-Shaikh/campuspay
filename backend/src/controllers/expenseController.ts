import type { Request, Response } from "express";
import { v4 as uuid } from "uuid";
import {
  createExpenseRecord,
  getExpenseById,
  markParticipantPaid,
  listExpensesForWallet,
} from "../data/expenses";

export const createExpense = (req: Request, res: Response) => {
  const { totalAmount, participants, creator, shares, title } = req.body as {
    totalAmount: number;
    participants: string[];
    creator: string;
    shares?: Record<string, number>;
    title?: string;
  };

  if (!creator) {
    return res
      .status(400)
      .json({ error: "creator, totalAmount and participants are required" });
  }

  if ((!participants || participants.length === 0) && !shares) {
    return res
      .status(400)
      .json({ error: "At least one participant is required" });
  }

  if (!totalAmount && !shares) {
    return res
      .status(400)
      .json({ error: "creator, totalAmount and participants are required" });
  }

  let finalParticipants = participants;
  let finalTotal = totalAmount;
  let perParticipant = 0;

  if (shares && Object.keys(shares).length > 0) {
    finalParticipants = Object.keys(shares);
    finalTotal = Object.values(shares).reduce((sum, v) => sum + Number(v), 0);
    perParticipant = Math.floor(finalTotal / finalParticipants.length);
  } else {
    perParticipant = Math.floor(totalAmount / participants.length);
  }

  const id = uuid();

  const paid: Record<string, boolean> = {};
  finalParticipants.forEach((p) => {
    paid[p] = false;
  });

  const expense = createExpenseRecord({
    id,
    creator,
    title,
    totalAmount: finalTotal,
    participants: finalParticipants,
    amountPerParticipant: perParticipant,
    paid,
    shares,
  });

  res.status(201).json(expense);
};

export const getExpense = (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  const expense = getExpenseById(id);
  if (!expense) return res.status(404).json({ error: "Expense not found" });
  res.json(expense);
};

export const payExpenseShare = async (req: Request, res: Response) => {
  const { expenseId, sender } = req.body as {
    expenseId: string;
    sender: string;
  };

  const expense = getExpenseById(expenseId);
  if (!expense) {
    return res.status(404).json({ error: "Expense not found" });
  }

  if (!expense.participants.includes(sender)) {
    return res.status(400).json({ error: "Sender is not a participant" });
  }

  // NOTE: In a full implementation you would integrate a smart contract here
  // to validate and route the payment on-chain. For the MVP we mark as paid
  // and let the frontend handle the actual ASA transfer via the wallet.
  const updated = markParticipantPaid(expenseId, sender);

  res.json({
    expense: updated,
    message: "Marked share as paid. Perform ASA transfer from frontend.",
  });
};

export const listExpenses = (req: Request, res: Response) => {
  const wallet = (req.query.wallet as string | undefined) || "";
  if (!wallet) {
    return res
      .status(400)
      .json({ error: "wallet query parameter is required" });
  }
  const items = listExpensesForWallet(wallet);
  res.json(items);
};


