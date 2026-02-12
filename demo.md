## CampusPay Demo Guide

### 1. Prerequisites

- Node.js 18+
- Pera Wallet mobile app (Testnet account)
- Algorand Testnet funds (via faucet)

### 2. Backend setup

1. Copy env template:

```bash
cd backend
cp .env.example .env
```

2. Edit `.env` and set:

- `CREATOR_MNEMONIC` to a funded Algorand Testnet account (used only on backend).
- Keep `ALGOD_SERVER`/`INDEXER_SERVER` defaults (Algonode Testnet) or adjust if needed.

3. Install deps and start dev server:

```bash
cd backend
npm install
npm run dev
```

Backend runs on `http://localhost:4000`.

### 3. Frontend setup

1. Copy env template:

```bash
cd frontend
cp .env.local.example .env.local
```

2. After CAMPUS ASA is created (next step), set `NEXT_PUBLIC_CAMPUS_TOKEN_ID` in `.env.local`.

3. Install deps and start dev server:

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on `http://localhost:3000`.

### 4. Create CAMPUS token (ASA)

1. With backend running, call:

```bash
curl -X POST http://localhost:4000/api/create-token
```

2. Response includes `assetId`. Set this value in:

- `backend/.env` as `CAMPUS_TOKEN_ID`
- `frontend/.env.local` as `NEXT_PUBLIC_CAMPUS_TOKEN_ID`

3. Restart backend and frontend if they are running.

4. Use Pera Wallet to **opt-in** to the CAMPUS ASA for any account you will use.

### 5. Fund test wallet

1. In Pera Wallet, create/import a Testnet account.
2. Visit an Algorand Testnet faucet (e.g. AlgoExplorer TestNet dispenser).
3. Send test Algo to your Pera Testnet address.

### 6. Test user flow

#### 6.1 Connect wallet

1. Open `http://localhost:3000`.
2. Go to `/dashboard`.
3. Click **“Connect Pera Wallet”** and approve connection on your phone.
4. Confirm:
   - Address is visible.
   - Algo and CAMPUS balances appear once you’ve opted in.

#### 6.2 Peer-to-peer CAMPUS transfer

1. On `/dashboard`, in **Send CAMPUS** section:
   - Enter a receiver Testnet address that has opted in to CAMPUS.
   - Enter an amount (integer, since CAMPUS has 0 decimals).
2. Click **Send CAMPUS** and sign in Pera.
3. After confirmation:
   - UI shows the transaction ID.
   - Balances update via **Reload** logic in wallet context.

#### 6.3 Create and pay an expense split

1. Navigate to `/expense/create`.
2. Fill the form:
   - **Total amount** (CAMPUS).
   - **Participants**: comma-separated Algorand addresses (all must have opted-in to CAMPUS).
3. Submit; you are redirected to `/expense/[id]`.
4. Open the expense page as a participant (matching wallet address):
   - See total, per-participant amount, list of participants with paid/unpaid badges.
5. Click **Pay my share**:
   - Backend marks you as paid.
   - Frontend builds CAMPUS ASA transfer to the creator and Pera signs it.
   - After confirmation, the UI shows the tx id and refreshed status.

#### 6.4 Create event and buy NFT-style ticket

1. Go to `/events`.
2. In **Create event**:
   - Enter name, description.
   - Set ticket price (CAMPUS) and total tickets.
   - Submit to create event (requires connected wallet).
3. In events list:
   - Pick an event and click **Buy ticket**.
   - Pera signs a CAMPUS transfer from buyer to event creator.
   - Backend records the ticket by wallet.

#### 6.5 Verify tickets

1. On `/events`, in **Verify tickets**:
   - Enter a wallet address.
   - Click **Check**.
2. UI shows a list of owned ticket asset IDs as recorded by backend.

### 7. Notes & limitations

- All activity is on Algorand Testnet only.
- Expense and event metadata are stored in-memory in the backend (reset on restart).
- Smart contract file in `smart-contracts/expense.py` is a minimal template and not wired into flows.
- No private keys are exposed to the frontend; only Pera Wallet handles signing.

