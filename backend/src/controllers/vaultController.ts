import { Request, Response } from "express";
import { getVault, updateVault, depositToVault, withdrawFromVault } from "../data/vaults";

export const getWalletVault = (req: Request, res: Response) => {
    const address = req.params.address as string;
    const vault = getVault(address) || updateVault(address, {});
    res.json(vault);
};

export const updateVaultGoal = (req: Request, res: Response) => {
    const address = req.params.address as string;
    const { goal, goalName } = req.body;
    const vault = updateVault(address, { goal: Number(goal), goalName });
    res.json(vault);
};

export const vaultTransaction = (req: Request, res: Response) => {
    const address = req.params.address as string;
    const { amount, type } = req.body as { amount: number; type: "deposit" | "withdraw" };

    if (type === "deposit") {
        const vault = depositToVault(address, amount);
        return res.json(vault);
    } else if (type === "withdraw") {
        const vault = withdrawFromVault(address, amount);
        if (!vault) return res.status(400).json({ error: "Insufficient vault balance" });
        return res.json(vault);
    }

    res.status(400).json({ error: "Invalid transaction type" });
};
