# Flux MVP — İnşa planı

Kaynak: PRD v1.3 (6 Eylül 2026) ve FLUX_PRD_INCELEME_RAPORU.md.

## İlk çalışır teslim

Tek operatörün ödeme grubunu oluşturduğu, açığı hesapladığı, tutarı onayladığı, fonlama durumunu izlediği ve mutabakat kanıtını dışa aktardığı çalışan uygulama. İlk teslim açıkça etiketlenmiş yerel sandbox kullanır: dış ağ işlemi veya gerçek para hareketi üretmez. Canlı pilot için gereken ağ/cüzdan/operatör kararları teslim edilen ürünün içinde tamamlanmış gibi sunulmaz.

## Kod yapısı

- `shared`: API sözleşmeleri, para hassasiyeti, durum tipleri. Frontend ve backend ortak kullanır.
- `backend/src`: HTTP API, SQLite kalıcılık, fonlama/politika servisi, worker, adaptörler ve webhook outbox.
- `backend/src/sdk`: sınırlı partner istemcisi ve webhook doğrulaması.
- `frontend/src`: React/TypeScript operatör uygulaması.
- `backend/tests` ve `frontend/tests`: para güvenliği, API erişimi, dayanıklılık ve kullanıcı yolculukları.
- `docs`: mimari kararlar, API/kurtarma ve canlı pilot kapıları.

React + Vite, Node 24 + Express + TypeScript. Yerel tek süreç için SQLite WAL/FULL; tutarlar ondalık string olarak taşınır, hesaplar BigInt ile yapılır. Worker ve API aynı veritabanını kullanır; kritik işlemler `BEGIN IMMEDIATE` içindedir. Canlı çok örnekli servis için PostgreSQL/migration ve operatör kimlik sağlayıcısı ayrıca değerlendirilecek.

## Uygulama sırası

1. Proje araçları, tipler, dokümantasyon ve çalıştırma komutları.
2. Kesin para aritmetiği; minimum rezerv, işlem/günlük limit, süre ve tazelik kuralları.
3. Kalıcı talepler, idempotency, ödeme bakiyesi tahsisi, onay, iptal ve hash bağlantılı audit kayıtları.
4. Tek ekonomik gönderimi garanti eden sandbox adaptörü; kalıcı transfer/gözlem kayıtları; gecikme, eksik alım ve toparlanma.
5. Yetkilendirilmiş API, transactional webhook outbox, sınırlı TypeScript istemcisi.
6. Operatör paneli: genel görünüm, fonlama kuyruğu, yeni ödeme grubu, detay/onay/kanıt, politika, audit ve entegrasyon.
7. Kritik hata testleri, API testleri, tarayıcı üzerinden uçtan uca kontrol, üretim derlemesi.
8. Çalıştırma/kurtarma belgesi ve güncel kabul kriteri matrisi.

## İlk uygulama kararları

- Tüm pozitif fonlamalar manuel onay ister. Onay, talebin immutable hash'ine bağlıdır.
- Sert limit aşımları ek onayla geçilmez; politika değişikliği ayrı ve kayıtlı işlemdir.
- Tutarlar 7 basamaklı Stellar birimiyle tutulur; sandbox USDT0 transfer tutarı 6 basamağa yukarı yuvarlanır. Gerçek rota ücreti/quote ayrıca uygulanmalıdır.
- Tek hesapta bekleyen ödeme gruplarının tahsisleri hesaba katılır. Bekleyen gelen fon, başka grubun kullanılabilir bakiyesine eklenmez.
- Tek batch ID ve idempotency anahtarı farklı içerikle tekrar kullanılırsa 409 döner.
- İmza/gönderim öncesi bakiye tekrar değerlendirilir. Ek fon ihtiyacı doğarsa eski onay sessizce değiştirilmez.
- Kaynak gönderimi ve dış gözlem birbirinden ayrılır. Gecikmede yalnızca gözlem tekrarlanır.
- Sıfır fonlama `NO_FUNDING_REQUIRED`; reddedilen/süresi dolan talepler ayrı terminal sonuçlardır.
- Mutabakat kaynak/message/receipt/asset/account/amount eşleşmesini ve tekil receipt tüketimini gerektirir.
- Ödeme hazır sinyali ile payout başarısı ayrıdır; mevcut ödeme motoru ödeme durumunun sahibidir.
- API, audit ve webhook olayları aynı DB işleminde yazılır; at-least-once teslim kullanılır.
- Yerel erişim yalnızca loopback; açık sandbox etiketi. Uzak dağıtım ve mainnet varsayılan olarak etkinleştirilmez.

## Canlı pilot için açık kapılar

- Gerçek operatör, varlık issuer/SAC, kaynak ağ/token adresi, hedef hesap, desteklenen rota kanıtı.
- Operatör kontrollü kaynak cüzdanı / multisig; işlem detaylarının cüzdanda bağımsız doğrulanması.
- Gerçek Stellar gözlemi, kaynak finality, LayerZero GUID veya CCTP attestation doğrulaması.
- RPC/ücret/quote, trustline, XLM rezervi, hassasiyet ve alım farkı politikası.
- Üretim kimlik sağlayıcısı, MFA, rol ayrımı, anahtar saklama ve bağımsız güvenlik incelemesi.
- Gerçek SDP/partner erişimi; fonlama hazır olduğunda ödeme başlatma sözleşmesi.
- Pilot baseline, SLA, risk limiti, veri yayın izinleri ve SCF kanıtları.

Bu kapılar, yerel uygulamayı kurmayı engellemez. Gerçek fon hareketi için geçilmesi gerekir.

## İlk teslim durumu — 7 Eylül 2026

1–8 numaralı yerel sandbox işleri uygulandı. API, kalıcı veritabanı, exact-amount hesaplama, manuel onay, limitler, tahsisler, recovery, audit/outbox, partner istemcisi, beş ekranlı operatör paneli ve testler mevcut. Gerçek ağ/cüzdan/SDP entegrasyonları açık kapılardır; test sonuçları ve kapsam `docs/ACCEPTANCE.md` üzerinden izlenir.
