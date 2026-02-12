import type { Request, Response } from "express";
import { createCampusToken } from "../services/algorandService";

export const createCampusTokenHandler = async (_req: Request, res: Response) => {
  try {
    const result = await createCampusToken();
    res.status(201).json({
      message: "CAMPUS ASA created on Algorand Testnet",
      assetId: result.assetId,
      txId: result.txId,
    });
  } catch (err: any) {
    console.error("Error creating CAMPUS token", err);
    res.status(500).json({ error: err.message || "Failed to create token" });
  }
};

// Alias used in routes
export { createCampusTokenHandler as createCampusToken };

