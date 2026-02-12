import type { Express } from "express";

import { createCampusToken } from "./controllers/tokenController";
import {
  createExpense,
  getExpense,
  payExpenseShare,
  listExpenses,
} from "./controllers/expenseController";
import {
  createEvent,
  buyTicket,
  verifyTicketsForWallet,
  getEvent,
} from "./controllers/eventController";
import {
  createFundraiser,
  contributeToFundraiser,
  listFundraisers,
  getFundraiser,
} from "./controllers/fundraiserController";
import {
  getWalletVault,
  updateVaultGoal,
  vaultTransaction,
} from "./controllers/vaultController";

export const registerAlgorandRoutes = (app: Express) => {
  // Health check
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  // ASA creation
  app.post("/api/create-token", createCampusToken);

  // Expense splitting
  app.post("/api/expense/create", createExpense);
  app.post("/api/expense/pay", payExpenseShare);
  app.get("/api/expense/:id", getExpense);
  app.get("/api/expenses", listExpenses);

  // Events & ticketing
  app.post("/api/event/create", createEvent);
  app.post("/api/event/:id/buy", buyTicket);
  app.get("/api/event/:id", getEvent);
  app.get("/api/event/verify/:walletAddress", verifyTicketsForWallet);

  // Utility
  app.get("/api/events", (_req, res) => {
    // lightweight wrapper, avoids exposing data layer directly here
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { listAllEvents } = require("./controllers/eventController");
    return listAllEvents(_req as any, res as any);
  });

  // Fundraisers
  app.post("/api/fundraiser/create", createFundraiser);
  app.post("/api/fundraiser/:id/contribute", contributeToFundraiser);
  app.get("/api/fundraisers", listFundraisers);
  app.get("/api/fundraiser/:id", getFundraiser);

  // Vaults (Savings)
  app.get("/api/vault/:address", getWalletVault);
  app.post("/api/vault/:address/goal", updateVaultGoal);
  app.post("/api/vault/:address/transaction", vaultTransaction);
};

