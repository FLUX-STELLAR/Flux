# Flux — SCF interest hazırlığı

Hazırlanma: 7 Eylül 2026. Durum: iç çalışma taslağı; gönderilmedi.

Ürün yönü güncellemesi: [v1.4 önerisi](PRODUCT_DIRECTION.md), yaklaşan batch yükümlülükleri için zaman bazlı likidite planlamasını bir sonraki teslim olarak tanımlar. Planner ve çoklu rota seçimi mevcut traction veya tamamlanmış entegrasyon olarak sunulmayacak. İlk canlı pilot tek rota ile sınırlı kalır.

İlk hedef, Flux'un mevcut aşamasını kanıtlarla anlatıp SCF'den uygunluk ve sonraki adım yönlendirmesi almak. Tam Build başvurusu ve kontrollü mainnet pilotu ayrı aşamalar.

## Güncel kaynak kontrolü

- [SCF ana sayfası](https://communityfund.stellar.org/): giriş noktası “Indicate Your Interest”.
- [Integration Track](https://stellar.gitbook.io/scf-handbook/scf-awards/build-award/integration-track): interest sonrası uygun bulunan ekipler Build başvurusuna davet ediliyor. Track mevcut traction bekliyor; yeni ve traction'sız uygulamalar için Instawards yönlendirmesi var. Flux'un uygunluğu henüz doğrulanmadı.
- [Güncel Integration List](https://stellar.gitbook.io/scf-handbook/scf-awards/build-award/integration-track/integration-list): LayerZero, CCTP ve SDP listede. Listede bulunmak, seçilecek ağ/varlık rotasının teknik olarak hazır olduğunu kanıtlamaz.
- Alanlar ve sınırlar, sitenin bu tarihte sunduğu [Build Interest Form istemci kodundan](https://communityfund.stellar.org/_next/static/chunks/9442-a7b7f550d924e119.js) okundu. Form tarayıcıda doldurulmadı; aktif akış ve koşullu alanlar gönderim öncesinde ekranda kontrol edilmeli. JS dosya adresi site güncellemesiyle değişebilir.

## PRD'ye göre çalışma düzeltmeleri

PRD ürün hedefi olarak korunuyor. Kullanıcının açıklamasına göre geliştirme kullanıcı ve AI desteğiyle yürütülüyor. PRD'deki beş kişilik kadro mevcut ekip olarak sunulmayacak. AI, insan ekip üyesi veya hesap verebilir başvuru sahibi olarak sayılmayacak. Gerçek kurucu deneyimi ayrıca eklenecek.

PRD'deki 75.000 USD çalışma bütçesi, contributor-week ve rol varsayımları yeniden hesaplanmadan başvuru taahhüdüne dönüştürülmeyecek. İncelenen interest formu tanımında bütçe alanı yok; bu aşamada ayrıntılı hibe bütçesi öncelik değil.

PRD'nin pilot/mainnet kapıları sonraki teslimler için geçerli. Hepsini interest formu ön koşulu gibi sunmuyoruz. Bu, Integration Track'in traction beklentisinin karşılandığı anlamına gelmiyor.

## Form alanları ve taslaklar

Metinler İngilizce ve düz metindir. Sınırlar istemci doğrulamasında görülen karakter üst sınırlarıdır; zengin metin biçimlendirmesi ek karakter yaratabilir.

### Project Title

Flux

### Project Description — üst sınır 1.100 karakter

Flux is building a treasury control layer for Stellar payment operators, connecting upcoming payout obligations to policy-controlled funding and batch-level reconciliation. Its local sandbox calculates funding shortfalls, preserves reserves and allocations, requires exact-intent approval, and reconciles simulated transfers before signaling liquidity readiness. The proposed next increment is a time-based planner that evaluates multiple scheduled batches, explains when funding is needed, and flags deadline risk. Live execution will initially use one operator-controlled EVM treasury, one supported asset route and one Stellar settlement account. Intended benefits are lower prefunded inventory and less manual coordination while preserving payout readiness; neither is yet measured. The planner, live transport and payout integration remain to be implemented.

### Current Traction — üst sınır 1.000 karakter

Flux is at the local sandbox prototype stage. The repository implements a React operator interface, a persistent SQLite-backed API, exact shortfall calculations, manual intent approvals, transfer limits, idempotency, simulated funding and reconciliation, delayed-delivery recovery, audit exports and a signed webhook outbox. Transfer and payout adapters are simulated. No production users, partner commitments, mainnet volume or measured capital-efficiency improvements are claimed. The next validation step is to test the workflow with a Stellar payout operator and prove one supported EVM-to-Stellar funding route. Demo and repository evidence will be attached once prepared for review.

Son cümle gönderim öncesinde gerçek demo/repo bağlantılarıyla değiştirilmeli. Test başarısı ancak yeniden çalıştırılıp doğrulandığında eklenmeli. Önceki incelemede `npm run check`, `tsc` bulunamadığı için başlayamadı; bu dosya yeni bir test doğrulaması iddia etmiyor.

### Planned Stellar Integration — üst sınır 1.100 karakter

Flux plans to connect an existing batch payout workflow to an EVM-to-Stellar settlement funding service. LayerZero/USDT0 is the primary candidate; CCTP/native USDC is the alternative if it better matches the pilot operator's settlement asset. The MVP will select one supported route. An operator-controlled wallet or multisig will authorize source transactions. A Stellar observer will check balance freshness and asset receivability, then bind destination account, asset identity and received amount to the approved funding intent and source/rail evidence. Reconciled funding will trigger a signed readiness webhook to the payout engine. SDP is the proposed reference integration. These live integrations are not yet implemented. Intended Stellar outcomes are externally funded settlement volume and repeated funding cycles linked to real payout batches; thresholds will follow operator validation.

### Build Track

Tercih: Integration Track; uygunluk teyidi bekleniyor. İşlevsel prototip, gerçek kullanım kanıtından ayrı anlatılmalı. Mevcut operatör ilişkisi yoksa “existing operator integration” tamamlanmış gibi yazılmamalı.

Uygunluk görüşmesinde kullanılabilecek soru:

> Flux currently has a local sandbox prototype and is seeking its first payout-operator validation. We plan a narrow integration using a listed cross-chain building block and SDP as a reference workflow. What evidence would you require before inviting Flux to the Integration Track, and would you recommend Instawards first at this stage?

Bu soru ayrı bir form alanı olarak doğrulanmadı; uygun görüşme veya serbest açıklama alanında kullanılabilir. Kimseye gönderilmedi.

### Team Description — üst sınır 2.000 karakter

Eksik bilgiler doldurulmadan gönderilmeyecek taslak:

Flux is led by [FULL NAME], responsible for product decisions, implementation ownership and operator validation. Development uses AI-assisted engineering tools. Relevant experience includes [VERIFIABLE PROJECTS, RESPONSIBILITIES AND RESULTS]. Public work: [GITHUB / PORTFOLIO]. LinkedIn: [LINK]. Specialist protocol and security support needs will be scoped against the selected integration before any controlled mainnet pilot.

### Kullanıcı bilgisi veya ek hazırlık gereken alanlar

| Alan                           | Hazırlık                                                                                                                                  |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Project Category               | Gerçek seçenekler arasından B2B operatör uygulamasını karşılayan kategori seçilecek; özgün protokol geliştirme iddiası yapılmayacak.      |
| Website                        | Zorunlu URL. Kamuya açık ürün açıklaması ve demo videosu olan bir sayfa öneriliyor. Mevcut localhost adresi inceleyiciye erişim sağlamaz. |
| Submitter type                 | Kullanıcının gerçek bireysel/kurumsal başvuru statüsü.                                                                                    |
| Email                          | Kullanıcının başvuru iletişim adresi.                                                                                                     |
| Team Description               | İsim, doğrulanabilir deneyim ve profil bağlantıları.                                                                                      |
| Target jurisdictions           | İlk hedef operatör/pazar seçimine göre doldurulacak; otomatik olarak “Global” seçilmeyecek.                                               |
| Team jurisdictions             | Kullanıcının teyit ettiği konum/kuruluş bilgisi; cihaz saat diliminden çıkarılmayacak.                                                    |
| Local financial infrastructure | Gerçek entegrasyon kapsamına göre cevaplanacak. Flux'un fonlaması ile partnerin fiat/yerel ödeme faaliyeti açıkça ayrılacak.              |
| Referral                       | Gerçek referans ilişkisi varsa verilen kod; aksi halde mevcutmuş gibi gösterilmeyecek.                                                    |

Ülke ve diğer cevaplara bağlı ek alanlar bulunuyor. Yukarıdaki tablo sabit alanların hazırlanması içindir; koşullu sorular ancak gerçek cevaplar belli olunca tamamlanabilir.

## Interest için önerdiğimiz hazırlık eşiği

Bu liste bizim çalışma hedefimizdir; SCF'nin yayımladığı zorunlu belge listesi değildir.

1. **Tekrarlanabilir demo:** İzole sandbox'ta yeni talep, açık hesabı, onay, mutabakat ve gecikmede güvenli toparlanma gösterilecek. İlgili kontroller yeniden çalıştırılacak; 2–3 dakikalık video hazırlanacak.
2. **Paylaşılabilir ürün sayfası:** Problem, hedef operatör, demo, mimari ve mevcut/geliştirilecek kapsam açıkça sunulacak. Yönetim API'sini dışarı açmadan statik sayfa/video ile ilk inceleme yapılabilir.
3. **Dar teknik plan:** Tek rota için kaynak ağ, varlık, hedef hesap modeli, imza yöntemi ve receipt doğrulama yaklaşımı araştırılıp belgelenecek. Canlı zincir kanıtı ancak gerçekten elde edilirse sunulacak.
4. **Kurucu ve talep kanıtı:** Kurucu geçmişi eklenecek. Operatör görüşmesi varsa tarih, ihtiyaç, kullanılan varlık ve kabul edilen fonlama süresi kaydedilecek; yoksa doğrulama hedefi olarak kalacak.
5. **Formun son hali:** Metinler gerçek URL'lerle ve kullanıcı bilgileriyle tamamlanacak. Mevcut aşama üzerinden track uygunluğu sorulacak.

Önerilen sonraki mühendislik adımı: ürün yönü belgesindeki üç batch senaryosunu kullanan salt okunur Liquidity Planner sandbox. Mevcut demo ve funding akışı korunur; planner kapsamı uygulandıktan sonra ayrıca doğrulanır. Gerçek operatör problemi ve örnek veri araştırması bu teslimle birlikte yürütülür. Çoklu canlı ağ ve otonom mainnet işlemleri kapsam dışındadır.
