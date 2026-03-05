# Shelby Player

Solana cüzdanı ile Shelby ağına video yükleyen, YouTube tarzı galeri ve paylaşım sayfalarına sahip web uygulaması. [Shelby Solana Starter](https://github.com/shelby/solana-starter) temel alınarak geliştirilmiştir.

## Özellikler

- **Solana cüzdan bağlantısı** — Phantom, Solflare vb.
- **Storage hesabı** — Cüzdandan türetilir, ShelbyUSD ve APT ile fonlanır
- **Video yükleme** — MP4, WebM, OGG (Shelby blob olarak saklanır)
- **YouTube benzeri galeri** — Yüklenen ve paylaşılan videolar grid görünümde
- **Video izleme sayfası** — `/v/[account]/[dosya-adı]` ile doğrudan link
- **Paylaşım** — Link kopyala ve tarayıcı Paylaş API’si

## Kurulum

```bash
# Bağımlılıklar
npm install

# Ortam değişkenleri (Geomi'den ücretsiz API anahtarı: https://geomi.dev/)
cp .env.example .env.local
# .env.local içine NEXT_PUBLIC_SHELBYNET_API_KEY=... ekleyin

# Geliştirme sunucusu
npm run dev
```

Tarayıcıda [http://localhost:3000](http://localhost:3000) açın.

## Ortam değişkenleri

| Değişken | Açıklama |
|----------|----------|
| `NEXT_PUBLIC_SHELBYNET_API_KEY` | Shelby API anahtarı (gerekli) |
| `NEXT_PUBLIC_SOLANA_RPC` | Solana RPC (isteğe bağlı, varsayılan: Devnet) |

### "Failed to fetch" / yükleme hatası

Yükle butonuna basınca **Failed to fetch** alıyorsanız:

1. **API anahtarı** — [Geomi](https://geomi.dev/) üzerinden giriş yapın, **API Resource** oluşturup **Shelbynet** seçin. Anahtarı **client key** (tarayıcı) olarak oluşturun; server key tarayıcıdan çalışmaz.
2. **Onaylı URL** — Aynı anahtarda **approved URLs** kısmına `http://localhost:3000` ekleyin. Bu olmazsa CORS nedeniyle istek bloklanır.
3. **.env.local** — Proje kökünde `.env.local` dosyası oluşturup şunu yazın:
   ```env
   NEXT_PUBLIC_SHELBYNET_API_KEY=geomi_xxx_veya_aptoslabs_xxx
   ```
4. Sunucuyu **yeniden başlatın** (`npm run dev`); env değişkenleri sadece başlangıçta okunur.

## Kullanım

1. **Cüzdan bağla** — Sağ üstten Solana cüzdanınızı seçin.
2. **Hesabı fonla** — “Hesabı fonla” ile storage hesabına ShelbyUSD ve APT alın.
3. **Video yükle** — “Video seç” ile dosya seçip “Yükle” ile Shelby’e gönderin.
4. **İzle ve paylaş** — Galerideki karta tıklayarak izleyin; “Linki kopyala” veya “Paylaş” ile linki paylaşın.

Paylaşılan link (`/v/STORAGE_ACCOUNT/DOSYA_ADI`) herkese açıktır; videolar Shelby ağında tutulur.

## Proje yapısı

```
src/
├── app/
│   ├── page.tsx           # Ana sayfa (galeri + yükleme)
│   ├── v/[account]/[name]/page.tsx  # Video izleme + paylaşım
│   ├── layout.tsx
│   └── globals.css
├── components/
│   ├── Header.tsx         # Cüzdan bağlantısı
│   ├── StorageAccountManager.tsx
│   ├── VideoUploader.tsx
│   ├── VideoCard.tsx      # Galeri kartı
│   └── ui/button.tsx
├── hooks/
│   └── useFundAccount.ts
├── types/
│   └── video.ts          # Video listesi (localStorage)
└── utils/
    └── shelbyClient.ts
```

## Shelby hakkında

[Shelby](https://shelby.xyz) zincirden bağımsız, merkeziyetsiz dosya depolama protokolüdür. Veriler HTTP `GET` ile okunur; Solana, Aptos veya EVM cüzdanı ile imza atılarak yükleme yapılır.
