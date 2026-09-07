# Flux — Ürün yönü ve v1.4 önerisi

Tarih: 7 Eylül 2026. Durum: kullanıcı tarafından paylaşılan ürün eleştirisine karşı hazırlanmış çalışma önerisi. Ayrı tutulan PRD v1.3 belgesinin yerine geçmiş nihai PRD değildir. Aşağıdaki planlama yetenekleri henüz uygulanmadı; mevcut ürün yerel sandbox olarak çalışıyor.

## 1. Önerilen ürün kararı

**Flux, Stellar ödeme operatörleri için yaklaşan ödeme yükümlülüklerini zamanlanmış, politika kontrollü fonlama planlarına dönüştüren ve fonlamayı hizmet ettiği batch ile mutabık kılan treasury kontrol katmanı olarak geliştirilmeli.**

Dış iletişim için önerilen tek cümle:

> Flux is building the treasury control plane for Stellar payment operators, turning upcoming payout obligations into policy-controlled liquidity plans and reconciling funding back to the batches it serves.

İlk farklılaşma, **birden fazla batch için ödeme zamanını ve ortak likidite tahsislerini birlikte değerlendirmek**. İlk canlı pilot yine tek operatör, tek kaynak treasury, tek ödeme varlığı, tek doğrulanmış rota ve tek Stellar settlement hesabıyla sınırlandırılır. İkinci rota, operatör ihtiyacı kanıtlandıktan sonra eklenir.

Bu konumlandırma bir ürün hipotezidir. Daha kapsamlı bir mimari veya daha fazla entegrasyon, müşterinin ayrı bir ürüne ihtiyaç duyduğunu tek başına kanıtlamaz.

## 2. Eleştiriden aldığımız ve düzelttiğimiz noktalar

| Konu                                                   | Değerlendirme ve ürün kararı                                                                                                                                                                                                |
| ------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Otomatik top-up tek başına zayıf farklılaşma           | Katılıyoruz. Operatörün bir sonraki fonlama kararını açıklamak, deadline riskini göstermek ve batch muhasebesini kapatmak doğrulanacak değer önerisi.                                                                       |
| Basit açık formülü ürünü değersiz yapar                | Katılmıyoruz. Basit ve denetlenebilir hesap doğru bir primitive. Eksik olan zamana bağlı çoklu yükümlülük planlaması; formülü karmaşıklaştırmak hedef değil.                                                                |
| Unified supply treasury ihtiyacını kaldırır            | Kaynak ağdaki varlık, hedef settlement hesabında kullanılabilir bakiye değildir. Treasury kararı ve taşıma işlemi ayrı sorumluluklar olarak kalır.                                                                          |
| Multi-rail hemen gerekli                               | Henüz kanıtlanmadı. Adaptör sınırı korunur; ilk planlayıcı tek doğrulanmış rotayla değer göstermeli.                                                                                                                        |
| USDT0/LayerZero ve USDC/CCTP otomatik alternatiflerdir | Ödeme varlığının kimliği belirleyicidir. USDC yükümlülüğü USDT0 gelmesiyle hazır sayılamaz. Varlık dönüşümü ayrı fiyat, likidite, yetki ve mutabakat problemi getirir; ilk kapsam dışında.                                  |
| Exactly-once settlement garanti edebiliriz             | Genel bir uçtan uca garanti olarak kullanılmayacak. Belirsiz gönderimde yeniden ekonomik işlem açmama, kalıcı işlem kimliği ve receipt deduplication somut kontrol gereksinimleridir. Payout partnerinin işlemi ayrı kalır. |
| Daha geniş kapsam 75.000 USD hibeyi haklı çıkarır      | Bütçe ve uygunluk, iş kapsamı ve kullanım kanıtıyla gerekçelendirilir. Daha fazla özellik eklemek finansman kanıtı değildir.                                                                                                |

Güncel Stellar dokümanı USDT0 için programatik OFT gönderimini, hedef varlık kimliğini ve transfer süresinin kaynak finality/DVN doğrulamasına bağlı olduğunu açıklıyor. Paylaşılan metindeki “30 saniye–3 dakika” aralığı Flux SLA'sı veya planlayıcı sabiti yapılmayacak. [Stellar USDT0 dokümanı](https://developers.stellar.org/docs/tokens/usdt0-layerzero)

CCTP, Stellar için native USDC taşıma yoludur. Bu, USDT0 ile aynı ödeme varlığını ürettiği anlamına gelmez. Rota uygunluğu önce varlık ve hesap uyumuna göre değerlendirilir. [Stellar CCTP dokümanı](https://developers.stellar.org/docs/tokens/cross-chain-transfers)

## 3. Mevcut temelin üzerine ne ekleniyor?

Mevcut `FundingRequest`, batch kimliğini ve `scheduled_at` zamanını taşıyor; `FundingService` diğer batch tahsislerini, minimum rezervi ve minimum hazırlık süresini dikkate alıyor. Exact-intent onayı, idempotency, gecikmede observation-only recovery, receipt kontrolü ve audit/outbox mevcut. Bunların dış finansal işlemleri simüle ediliyor.

Eksik olan, fonlama talebi oluşturulmadan önce gelecekteki batch'leri birlikte ele alan, zaman bazlı bakiye projeksiyonu çıkaran ve kararın gerekçesini sürümleyerek saklayan planlayıcı.

```mermaid
flowchart LR
    O[Upcoming obligations] --> P[Liquidity horizon and allocations]
    P --> L[Versioned funding plan]
    L --> A[Policy and exact-intent approval]
    A --> F[Existing funding lifecycle]
    F --> R[Verified receipt and reconciliation]
    R --> B[Batch liquidity readiness]
```

Planlama önerisi, onay ve gerçek yürütme ayrı kayıtlardır. Plan oluşturmak otomatik fon göndermez.

## 4. İlk hedef müşteri ve doğrulama

Hedef: aynı Stellar hesabından tekrarlayan batch ödemeleri yapan, treasury'sinin en az bir kısmını desteklenen başka ağda tutan ve fonlama kararlarını manuel koordine eden operatör. İlk kullanım senaryosu payroll, remittance veya merchant payout arasından gerçek erişime göre seçilecek; üç segment aynı anda hedeflenmeyecek.

Henüz bu belgeyle doğrulanmış operatör, taahhüt edilmiş pilot veya SDP veri erişimi ilan edilmiyor.

Önerilen ilk araştırma çıktısı: üç operatör görüşmesi, bunlardan en az birinde anonimleştirilmiş bir haftalık batch zamanları/bakiyeleri/fonlama kayıtları. Bu bir çalışma hedefidir, piyasa kanıtı değildir.

Görüşmeler şu soruları cevaplamalı:

- Ödeme hangi tam varlık kimliğiyle, hangi hesaptan ve hangi saatte hazır olmak zorunda?
- Batch tutarı ne zaman kesinleşiyor; değişiklik, iptal ve kısmi ödeme nasıl bildiriliyor?
- Onay bekleme süresi, fonlama sıklığı, tutulan rezerv ve manuel mutabakat işi ne kadar?
- Son gecikme hangi nedenle oluştu: fonlama, onay, taşıma, alıcı hazırlığı veya payout sistemi?
- Mevcut script/operasyon hangi kararı veremiyor? Flux'un önerisi için ödeme veya pilot isteği var mı?

**Devam kararı:** örnek kayıtlarla tekrarlayan bir karar/tahsis/kanıt sorunu ve denemeye istekli bir operatör gösterebilmek. Sorun yalnızca seyrek manuel transfer ise ürünü genişletmek yerine daha dar bir entegrasyon aracı olarak yeniden değerlendirmek.

## 5. Bir sonraki teslim: Liquidity Planner sandbox

Mevcut uygulamanın sayfaları ve fonlama akışı korunur. Önerilen yeni `Liquidity plan` ekranı ayrı bir navigasyon öğesi olarak eklenir; henüz mevcut UI veya API'de yoktur.

| Parça             | İlk teslim kapsamı                                                                                                                                                           |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Obligation girişi | Manuel veya doğrulanmış dosya/API girdisi; partner ID, revision, tam varlık kimliği, hesap, kalan ödeme tutarı, deadline, durum. SDP entegrasyonu tamamlanmış gibi sunulmaz. |
| Zaman görünümü    | Aynı hesaptaki batch'ler için 1/6/24 saat görünümü. Bilinen yükümlülüklerden deterministik projeksiyon; ML talep tahmini yok.                                                |
| Bakiye ve tahsis  | Gözlem zamanı, korunacak rezerv, mevcut batch tahsisleri, dışarıdan beklenen fon ve kullanılabilir fon ayrı gösterilir.                                                      |
| Planlama          | Deadline sırası; sabit rotanın uygunluğu; fon ihtiyacı; önerilen gönderim zamanı; en geç başlatma zamanı; uygulanamayan planın gerekçesi.                                    |
| Açıklanabilirlik  | Her karar için kullanılan veri sürümleri, hesap, rota varsayımı, politika ve insan tarafından okunabilir gerekçe.                                                            |
| Plan sürümleri    | Tutar, zaman, politika veya bakiye değişince yeni plan sürümü; önceki öneri korunur. Eski onay yeni ekonomik niyete aktarılmaz.                                              |
| Yürütme           | İlk aşamada yalnızca öneri/önizleme. Sonraki aşamada onaylı plan mevcut sandbox funding akışına bağlanır.                                                                    |
| Durum             | Tasarım etiketleri: covered, funding needed, at risk, blocked. Mevcut `FundingStatus` değerleriyle karıştırılmaz.                                                            |

İlk plan birden fazla batch'i kapsayabilir; **her funding intent tek batch'e bağlı kalır**. Tek transferi birçok batch'e dağıtma, bir batch'i birçok rotaya bölme ve en ucuz kombinasyonu çözme ertelenir. Böylece mevcut bire bir ilişki üzerinde kontrollü ilerlenir.

### Zaman ve para modeli

Hesaplar tam varlık kimliği ve settlement hesabı bazında ayrılır. Her deadline için örnek projeksiyon:

```text
projected_balance(t)
  = confirmed_balance_at_snapshot
  + modeled_future_net_receipts_due_by(t)
  - remaining_obligation_payouts_due_by(t)
  - other_committed_outflows_due_by(t)

constraint: projected_balance(t) >= minimum_reserve(t)

latest_start
  = liquidity_ready_deadline
  - approval_and_signing_budget
  - route_delivery_budget
  - reconciliation_budget
  - safety_buffer
```

`modeled_future_net_receipts` önerilmiş/bekleyen fonları kapsayan bir senaryo varsayımıdır; gerçekleşmiş bakiye değildir. Kaynak gönderimi belirsizse bu varsayım normal senaryodan çıkarılır ve risk görünümünde takip edilir. Henüz alınmamış fon hiçbir zaman payout-ready hesabına eklenmez. Alınmış receipt zaten snapshot bakiyesindeyse yeniden giriş olarak sayılmaz.

Mevcut batch tahsisleri ilgili obligation'a bağlanır. Aynı yükümlülük hem kalan payout hem de ek bir rezerv indirimi olarak iki kez sayılmaz. Horizon dışında kalan mevcut taahhütler kullanılabilir fonu sınırlar; bilinmeyen batch eşlemesi varsa plan yürütmeye kapalı olur.

Route budget ilk sandbox'ta açıkça senaryo parametresidir. Canlıda seçilmiş yolun ölçülmüş dağılımı ve operatörün risk tercihiyle belirlenir; p95 gibi bir ölçüm teslim garantisi değildir. `latest_start` geçmişse sistem başarılı plan uydurmaz; deadline riskini gösterir ve yürütmeyi politika uyarınca engeller.

### Gösterilecek örnek

Varsayım: aynı hesap ve aynı varlık, başlangıç bakiyesi 35.000, minimum rezerv 10.000, başka tahsis/giriş ve ücret yok. Her top-up zamanında gelir. Bunlar sentetik demo verileridir.

| Batch zamanı |   Ödeme | Öncesinde gerekli ek net fon | Ödeme sonrası bakiye |
| ------------ | ------: | ---------------------------: | -------------------: |
| 09:00        |  80.000 |                       55.000 |               10.000 |
| 11:30        |  40.000 |                       40.000 |               10.000 |
| 15:00        | 100.000 |                      100.000 |               10.000 |

Toplam ek fon 195.000. Paylaşılan metindeki 185.000, rezerv sıfır kabul edilirse doğrudur. Yenilik toplamı değiştirmek değil, fonların hangi zamanda hangi batch için gerektiğini ve o zamanın karşılanıp karşılanamayacağını göstermek.

Demo ikinci adımında ilk transferin geciktiği varsayılır: etkilenen batch riskli görünür; belirsiz eski transfer dururken otomatik alternatif gönderim oluşmaz. Üçüncü adımda henüz gönderilmemiş bir batch'in tutarı değiştirilir: plan revize edilir ve ilgili eski onay geçersizleşir.

## 6. Tasarımda eklenecek kayıtlar ve güvenlik sınırları

Bunlar önerilen modellerdir; mevcut migration veya API sözleşmesi değildir.

| Kayıt               | Sorumluluk                                                                                                                  |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `PaymentObligation` | Operatör/partner kapsamında benzersiz batch kimliği, revision, kalan tutar, deadline, varlık/hesap ve iptal/ödeme durumu.   |
| `LiquidityPlan`     | Snapshot/checkpoint, horizon, politika sürümü, input revisions, zaman projeksiyonu, gerekçe ve plan revision.               |
| `PlanAllocation`    | Mevcut veya planlanan fonun hangi obligation'a ayrıldığı; confirmed/projected ayrımı; reservation sürümü.                   |
| `FundingIntent`     | İlk geçişte mevcut funding request ile eşlenir; obligation revision ve plan revision bağlantısı eklenir.                    |
| `RouteAssessment`   | Tek rota için uygunluk, tam kaynak/hedef varlık kimliği, net alınacak tutar, fee/quote expiry, zaman bütçesi ve red nedeni. |

Plan uygulanırken input revision ve bakiye/politika sürümü transaction içinde tekrar kontrol edilir. İki açık plan aynı mevcut fonu veya aynı obligation'ı sessizce rezerve edemez. Material intent değişirse tekrar onay gerekir.

İmzalama/gönderim için kalıcı işlem kimliği ekonomik hareketten önce oluşturulmalı; crash recovery aynı kimliği izlemeli. Aynı signed transaction'ın tekrar yayınlanmasıyla yeni bir ekonomik gönderim oluşturmak farklı işlemlerdir. Kaynakta ne olduğu bilinmiyorsa yeni transfer veya rota failover yapılmaz; operatöre inceleme gereği gösterilir.

Receipt kredisi ve tüketimi tekilleştirilir. Webhook at-least-once teslim edilir; partner event kimliğine göre deduplicate eder. **Liquidity-ready, payout-executed değildir.** Canlı payout başarısı, partnerin doğrulanmış durum kaydından alınır. Fonlama sonrası iptal edilmiş batch'in parası otomatik geri taşınmaz.

## 7. Teslim sırası ve kabul kapıları

| Sıra | Çıktı                                            | Kabul kanıtı                                                                                                                   |
| ---- | ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| 1    | Operatör problemi ve örnek veri                  | Mevcut iş akışı, varlık, deadline ve baseline; veri yoksa yalnızca sentetik demo iddiası.                                      |
| 2    | Saf deterministik planner + ayrı önizleme ekranı | Üç batch örneği, zaman/rezerv grafiği, hesap açıklaması; transfer veya mevcut tahsis değişikliği yok.                          |
| 3    | Plan revision ve sandbox yürütme bağlantısı      | Aynı fonu iki kez ayırmama; eski onayın reddi; gecikmede yeni send olmaması; restart ve tekrar çağrı testleri.                 |
| 4    | Bir partner adapter + tek gerçek rota            | Gerçek obligation erişimi, source signing/recovery, hedef receivability ve korele receipt kanıtı.                              |
| 5    | Kontrollü pilot                                  | Mevcut yönteme karşı sonuçlar, tekrar eden gerçek batch'ler ve operatör değerlendirmesi.                                       |
| 6    | İkinci rota / ek treasury                        | İlk yolun çözemediği, operatörce doğrulanmış ihtiyaç ve aynı hedef varlık için uygunluk veya ayrıca onaylanan dönüşüm kapsamı. |

Planner kabul senaryoları: aynı deadline'da yarışan batch'ler; horizon sınırları ve UTC normalizasyonu; stale balance; yetersiz source fon/gas; gecikmiş veya belirsiz receipt; yanlış varlık/issuer; batch revision/iptal; politika değişimi; kaynak/günlük cap; quote expiry; restart ve tekrarlanan input. İlk teslim onay/gönderim yan etkisi üretmez.

Başarı ölçümü aynı operator kayıtları üzerinden yapılır: zaman ağırlıklı ortalama Stellar inventory, fonlama kaynaklı readiness gecikmeleri, toplam ücret, manuel müdahale sayısı ve mutabakat süresi. Karşılaştırma en az mevcut operasyonu, basit threshold yaklaşımını ve önerilen planner'ı kapsar. Daha düşük inventory elde ederken gecikme veya operasyon yükü artırmak otomatik başarı değildir.

## 8. SCF ve dış iletişim

Konumlandırmayı treasury karar ve mutabakat problemi üzerinden kurarız; protokol sayısını ürün değeri yerine koymayız. Güncel Integration Track, mevcut traction ve gerçek kullanım odaklı ölçüm istiyor; çoklu entegrasyon eklemek bu koşulları karşılamaz. Flux için uygunluk henüz doğrulanmış değil. [SCF Integration Track](https://stellar.gitbook.io/scf-handbook/scf-awards/build-award/integration-track)

Landing page mevcut sandbox'ı gösterebilir. Planner henüz uygulanmadığından ekranları veya çoklu rota seçimini çalışır özellik olarak duyurmayız. İlk planner demosu hazır olduğunda ürün anlatımı somut ekranlarla güncellenir.

İlk mühendislik adımı **salt okunur, üç batch'li Liquidity Planner sandbox**. Bu belge backend davranışını, mevcut uygulamanın ekranlarını veya ana ağ işlem yetkilerini değiştirmez.
