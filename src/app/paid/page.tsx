import PaidClient from "./PaidClient";

/**
 * Thank-you page after checkout. A server wrapper only so the optional offers
 * can be switched on from Vercel env vars (read at build: redeploy after a change).
 */
export default function PaidPage() {
  return <PaidClient offers={{ vault: !!process.env.VAULT_URL?.trim() }} />;
}
