# Solby

Video app built on [Shelby](https://shelby.xyz) decentralized storage (Aptos + Solana wallets).

## Security

- **Never commit API keys or secrets.** Use `.env.local` for local development (see `.env.example` for variable names). `.env.local` and other `.env*` files are gitignored.
- Add `NEXT_PUBLIC_SHELBYNET_API_KEY` (from [Geomi](https://geomi.dev)) in your environment only; do not put it in the repo.
