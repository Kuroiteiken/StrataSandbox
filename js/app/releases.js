// Kullanıcıya dönük sürüm notları ("Yenilikler" diyaloğu). Geliştirici ayrıntıları CHANGELOG.md'de.
// - UNRELEASED: geliştirmedeki sürüm. Kullanıcıya görünen her değişiklik buraya kısa bir madde ekler
//   (site her push'ta yayınlandığı için bu yenilikler zaten kullanılabilir durumda).
// - RELEASES: yayınlanmış sürümler, en yeni en üstte; RELEASES[0].version her zaman APP_VERSION'a
//   eşittir (tests/releases.test.js). Diyalog hepsini gösterir (yalnızca sonuncusunu değil).
// Sürüm yayınlanınca UNRELEASED maddeleri RELEASES'in başına taşınır ve UNRELEASED bir sonraki sürüme geçer.

export const UNRELEASED = Object.freeze({
  version: '0.10.0',
  items: [
    'Yeni materyaller: Buz (B), Kar (K), Metal (M) ve Erimiş metal (E). Su 0 °C altında donar ve göl yüzeyden buz tutar; metal ısıyı hızla iletip kızarır ve 1400 °C’de erir.',
    'Sıcaklık: her hücrenin bir sıcaklığı var ve ısı komşulara iletiliyor. Su kaynıyor, buhar soğuyunca yoğuşup yağıyor, lav dış yüzeyinden soğuyup taşa dönüyor, lavla uzun temas eden kum cama dönüşüyor.',
    'Odun, yağ ve bitki yeterince ısınınca kendiliğinden tutuşuyor; sıcak ortamda açık su yavaşça buharlaşıyor.',
    'Isı görselleri: 450 °C üstündeki taş, kum ve cam kızarıyor ve parlıyor; lav soğudukça koyulaşıyor, donmaya yaklaşan su açık maviye dönüyor.',
    'Çoğaltıcı (X): üstüne dökülen materyali 1000 kez çoğaltıp duruyor. Yutucu (Y): değen materyali 1000 kez yutup duruyor.',
    'Kum saati yenilendi: kavisli cam hazneler, odun çerçeve; üstte sınırsız çoğaltıcı, altta sınırsız yutucu olduğu için kum hiç durmadan akıyor.',
    'Ters çevir (F): dünyayı baş aşağı çevirir, geri alınabilir.',
    'Başlıkta sürüm rozeti ve bu Yenilikler listesi.',
  ],
});

export const RELEASES = Object.freeze([
  {
    version: '0.9.0',
    date: '2026-09-30',
    items: [
      'İlk sürüm: kum, su, taş, ateş, odun, buhar, yağ, lav, bitki ve cam; hepsi gerçek hücre fiziğiyle (toz, sıvı, gaz, yoğunluk ve yer değiştirme).',
      'Etkileşimler: ateş yakıtları tutuşturur, su ateşi söndürür ve buhara döner, lav suyla taşlaşır, kum lavla cama döner, bitki suyla büyür.',
      'Sahneler: Volkan, Kum saati, Vaha ve Kaos Lab. Aynı seed aynı sahneyi üretir; Yeniden üret ve Yeni seed.',
      'Fırça: boyut, daire/kare/sprey şekli, basılı tutarak akıtma, sağ tıkla silme, Shift ile üzerine yazma ve Geri al.',
      'Duraklat, tek adım, 0.5×–4× hız; görüntü alma (PNG); ışıma efektleri ve görsel kalite ayarı.',
      'Dokunmatik ve mobil düzen, klavye kısayolları (?), erişilebilir kontroller; tercihler tarayıcıda saklanır.',
    ],
  },
]);

// Diyalog bölümleri: önce geliştirmedeki sürüm (maddesi varsa), sonra yayınlanmış sürümlerin tamamı.
export function releaseSections() {
  const sections = [];
  if (UNRELEASED.items.length > 0) sections.push({ title: `v${UNRELEASED.version} · geliştirmede`, items: UNRELEASED.items });
  for (const r of RELEASES) sections.push({ title: `v${r.version} · ${r.date}`, items: r.items });
  return sections;
}
