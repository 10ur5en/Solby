# Shelby Player

Web app that uploads videos to the Shelby network with a Solana wallet, featuring a YouTube-style gallery and share pages. Built on [Shelby Solana Starter](https://github.com/shelby/solana-starter).

## Features

- **Solana wallet connection** — Phantom, Solflare, etc.
- **Storage account** — Derived from wallet, funded with ShelbyUSD and APT
- **Video upload** — MP4, WebM, OGG (stored as Shelby blobs)
- **YouTube-style gallery** — Uploaded and shared videos in grid view
- **Video watch page** — Direct link via `/v/[account]/[file-name]`
- **Sharing** — Copy link and browser Share API

## Setup

```bash
# Dependencies
npm install

# Environment variables (free API key from Geomi: https://geomi.dev/)
cp .env.example .env.local
# Add NEXT_PUBLIC_SHELBYNET_API_KEY=... to .env.local

# Development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Environment variables

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SHELBYNET_API_KEY` | Shelby API key (required) |
| `NEXT_PUBLIC_SOLANA_RPC` | Solana RPC (optional, default: Devnet) |

### "Failed to fetch" / loading error

If you get **Failed to fetch** when clicking the upload button:

1. **API key** — Sign in at [Geomi](https://geomi.dev/), create an **API Resource** and select **Shelbynet**. Create the key as **client key** (browser); server key will not work from the browser.
2. **Approved URLs** — Add `http://localhost:3000` to **approved URLs** for that key. Otherwise the request will be blocked by CORS.
3. **.env.local** — Create a `.env.local` file in the project root with:
   ```env
   NEXT_PUBLIC_SHELBYNET_API_KEY=geomi_xxx_or_aptoslabs_xxx
   ```
4. **Restart the server** (`npm run dev`); env variables are only read at startup.

## Usage

1. **Connect wallet** — Select your Solana wallet from the top right.
2. **Fund account** — Use "Fund account" to get ShelbyUSD and APT for the storage account.
3. **Upload video** — Use "Choose video" to pick a file and "Upload" to send it to Shelby.
4. **Watch and share** — Click a card in the gallery to watch; use "Copy link" or "Share" to share the link.

Shared links (`/v/STORAGE_ACCOUNT/FILE_NAME`) are public; videos are stored on the Shelby network.

## Project structure

```
src/
├── app/
│   ├── page.tsx           # Home page (gallery + upload)
│   ├── v/[account]/[name]/page.tsx  # Video watch + share
│   ├── layout.tsx
│   └── globals.css
├── components/
│   ├── Header.tsx         # Wallet connection
│   ├── StorageAccountManager.tsx
│   ├── VideoUploader.tsx
│   ├── VideoCard.tsx      # Gallery card
│   └── ui/button.tsx
├── hooks/
│   └── useFundAccount.ts
├── types/
│   └── video.ts          # Video list (localStorage)
└── utils/
    └── shelbyClient.ts
```

## About Shelby

[Shelby](https://shelby.xyz) is a chain-agnostic, decentralized file storage protocol. Data is read via HTTP `GET`; uploads are signed with a Solana, Aptos, or EVM wallet.
