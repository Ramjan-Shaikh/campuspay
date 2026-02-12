import { Request, Response } from "express";
import {
    addFundraiser,
    getFundraiserById,
    updateFundraiserRaised,
    listAllFundraisers,
    Fundraiser,
} from "../data/fundraisers";

export const createFundraiser = (req: Request, res: Response) => {
    const { title, description, goal, creator, deadline, category } = req.body as Partial<Fundraiser>;

    if (!title || !description || !goal || !creator || !deadline || !category) {
        return res.status(400).json({ error: "All fields (title, description, goal, creator, deadline, category) are required" });
    }

    const fundraiser = addFundraiser({
        title,
        description,
        goal: Number(goal),
        creator,
        deadline,
        category,
    });

    res.status(201).json(fundraiser);
};

export const contributeToFundraiser = (req: Request, res: Response) => {
    const { id } = req.params as { id: string };
    const { amount } = req.body as { amount: number };

    if (!amount || amount <= 0) {
        return res.status(400).json({ error: "Contribution amount must be greater than zero" });
    }

    const updated = updateFundraiserRaised(id, amount);
    if (!updated) {
        return res.status(404).json({ error: "Fundraiser not found" });
    }

    res.json(updated);
};

export const listFundraisers = (_req: Request, res: Response) => {
    res.json(listAllFundraisers());
};

export const getFundraiser = (req: Request, res: Response) => {
    const { id } = req.params as { id: string };
    const fundraiser = getFundraiserById(id);
    if (!fundraiser) {
        return res.status(404).json({ error: "Fundraiser not found" });
    }
    res.json(fundraiser);
};
