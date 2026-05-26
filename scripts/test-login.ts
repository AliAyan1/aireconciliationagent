import { config } from "dotenv";
config({ path: ".env" });
config({ path: ".env.local", override: true });

import { verifyUserPassword } from "../lib/users";
import { signAuthToken } from "../lib/auth-token";

async function main() {
  const email = "team@hisaabai.local";
  const password = "team12345";
  const user = await verifyUserPassword(email, password);
  console.log("verify:", user ? "OK" : "FAIL");
  if (user) {
    const token = await signAuthToken(user);
    console.log("token length:", token.length);
  }
}

main().catch(console.error);
