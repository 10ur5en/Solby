# Ücretsiz sunucuya deploy (Vercel)

Projeyi **Vercel** ücretsiz katmanında yayına alıp sunucu ortamında test edebilirsiniz.

## 1. Vercel hesabı

1. [vercel.com](https://vercel.com) adresine gidin.
2. **Sign Up** → GitHub (veya GitLab / e-posta) ile ücretsiz hesap açın.

## 2. Projeyi GitHub’a atın (henüz yoksa)

```bash
# Proje klasöründe
git add .
git commit -m "Prepare for deploy"
git branch -M main
git remote add origin https://github.com/KULLANICI_ADINIZ/solby.git
git push -u origin main
```

(GitHub’da yeni repo: **New repository** → repo adı → Create.)

## 3. Vercel’e import

1. [vercel.com/new](https://vercel.com/new) açın.
2. **Import Git Repository** → GitHub’ı bağlayın (izin verin).
3. **Solby** (veya repo adınız) projesini seçin → **Import**.

## 4. Environment variables

**Environment Variables** bölümünde şunları ekleyin:

| Name | Value | Açıklama |
|------|--------|----------|
| `NEXT_PUBLIC_SHELBYNET_API_KEY` | `geomi_xxx` veya mevcut key | Geomi’den aldığınız client key |

İsteğe bağlı:

- **`ENABLE_VIDEO_REGISTRY`** = `true` → Video listesini sunucuda tutar (Vercel’de **kalıcı dosya yok**; sadece test için veya ileride Blob/DB eklenebilir).
- **`NEXT_PUBLIC_SHELBY_INDEXER_URL`** → Varsayılan dışında indexer kullanacaksanız.

Geomi tarafında:

- **Approved URLs** listesine Vercel adresinizi ekleyin, örn: `https://solby-xxx.vercel.app` (deploy sonrası tam URL’i kopyalayıp ekleyin).

## 5. Deploy

- **Deploy**’a tıklayın.
- Birkaç dakika içinde `https://proje-adi.vercel.app` adresi canlı olur.

## 6. Ne test edilir?

- Sayfaların açılması, cüzdan bağlama, arama.
- Video listesi: indexer veri döndürüyorsa veya aynı tarayıcıda yükleme yaptıysanız liste dolar.
- Video yükleme: Cüzdan + Geomi key + approved URL doğruysa yükleme çalışır.

## Not: ENABLE_VIDEO_REGISTRY ve Vercel

Vercel serverless ortamında **kalıcı dosya sistemi yok**; her istek geçici bir ortamda çalışır. Bu yüzden `ENABLE_VIDEO_REGISTRY=true` ile `data/video-registry.json` yazılsa bile **veriler deploy’lar arasında kalıcı olmaz**. Gizli sekme / farklı cihazda kalıcı liste için ileride şunlar kullanılabilir:

- **Vercel Blob** (depolama),
- veya **Vercel KV / Supabase** gibi harici veritabanı.

Şimdilik deploy ile “uygulama sunucuda çalışıyor mu?” testini yapabilirsiniz; video listesi indexer + aynı tarayıcıdaki localStorage ile çalışır.

## Alternatif: Netlify

1. [netlify.com](https://www.netlify.com) → Sign up (GitHub).
2. **Add new site** → **Import an existing project** → GitHub → repo seçin.
3. Build command: `npm run build`, Publish directory: `.next` değil; Netlify Next.js’i otomatik algılar (Runtime: Next.js seçin).
4. Env değişkenlerini **Site settings → Environment variables**’da ekleyin.

Next.js için genelde **Vercel** daha az ayar gerektirir.
