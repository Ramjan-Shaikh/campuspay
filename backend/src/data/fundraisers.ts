import crypto from "crypto";

export interface Fundraiser {
    id: string;
    title: string;
    description: string;
    goal: number;
    raised: number;
    creator: string;
    deadline: string;
    category: string;
}

const fundraisers = new Map<string, Fundraiser>();

export const addFundraiser = (fundraiser: Omit<Fundraiser, "id" | "raised">) => {
    const id = crypto.randomBytes(8).toString("hex");
    const newFundraiser: Fundraiser = {
        ...fundraiser,
        id,
        raised: 0,
    };
    fundraisers.set(id, newFundraiser);
    return newFundraiser;
};

export const getFundraiserById = (id: string) => fundraisers.get(id);

export const updateFundraiserRaised = (id: string, amount: number) => {
    const fundraiser = fundraisers.get(id);
    if (fundraiser) {
        fundraiser.raised += amount;
        fundraisers.set(id, fundraiser);
        return fundraiser;
    }
    return null;
};

export const listAllFundraisers = () => Array.from(fundraisers.values());
