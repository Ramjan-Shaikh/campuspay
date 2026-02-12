import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import { registerAlgorandRoutes } from "./routes";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

registerAlgorandRoutes(app);

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`CampusPay backend listening on http://localhost:${PORT}`);
});

