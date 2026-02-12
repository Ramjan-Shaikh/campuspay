export interface Expense {
  id: string;
  creator: string;
  title?: string;
  totalAmount: number;
  participants: string[];
  amountPerParticipant: number;
  paid: Record<string, boolean>;
  shares?: Record<string, number>;
}

const expenses = new Map<string, Expense>();

export const createExpenseRecord = (expense: Expense) => {
  expenses.set(expense.id, expense);
  return expense;
};

export const getExpenseById = (id: string) => expenses.get(id);

export const markParticipantPaid = (id: string, participant: string) => {
  const e = expenses.get(id);
  if (!e) return;
  e.paid[participant] = true;
  expenses.set(id, e);
  return e;
};

export const listExpensesForWallet = (wallet: string) => {
  const lower = wallet.toLowerCase();
  return Array.from(expenses.values()).filter(
    (e) =>
      e.creator.toLowerCase() === lower ||
      e.participants.some((p) => p.toLowerCase() === lower)
  );
};


