import algosdk from "algosdk";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

async function main() {
  const algod = new algosdk.Algodv2(
    process.env.ALGOD_TOKEN || "",
    process.env.ALGOD_SERVER || "",
    Number(process.env.ALGOD_PORT || 0)
  );

  const tealPath = path.join(__dirname, "expense.teal");
  if (!fs.existsSync(tealPath)) {
    console.error("Compile the PyTeal contract to expense.teal first.");
    process.exit(1);
  }

  const tealSource = fs.readFileSync(tealPath, "utf8");
  const compiled = await algod.compile(tealSource).do();
  console.log("Program hash:", compiled.hash);
  console.log("Program bytes (base64):", compiled.result);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

