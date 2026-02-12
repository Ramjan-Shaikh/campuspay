export interface Vault {
    walletAddress: string;
    balance: number;
    goal: number;
    goalName: string;
}

const vaults = new Map<string, Vault>();

export const getVault = (address: string) => vaults.get(address);

export const updateVault = (address: string, data: Partial<Vault>) => {
    const existing = vaults.get(address) || {
        walletAddress: address,
        balance: 0,
        goal: 0,
        goalName: "General Savings",
    };
    const updated = { ...existing, ...data };
    vaults.set(address, updated);
    return updated;
};

export const depositToVault = (address: string, amount: number) => {
    const vault = updateVault(address, {});
    vault.balance += amount;
    vaults.set(address, vault);
    return vault;
};

export const withdrawFromVault = (address: string, amount: number) => {
    const vault = updateVault(address, {});
    if (vault.balance < amount) return null;
    vault.balance -= amount;
    vaults.set(address, vault);
    return vault;
};
