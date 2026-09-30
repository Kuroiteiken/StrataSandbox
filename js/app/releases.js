// Kullanıcıya dönük sürüm notları ("Yenilikler" diyaloğu). Geliştirici ayrıntıları CHANGELOG.md'de.
// En yeni sürüm en üstte; RELEASES[0].version her zaman APP_VERSION'a eşittir (tests/releases.test.js).
export const RELEASES = Object.freeze([
  {
    version: '0.9.0',
    date: '2026-09-30',
    items: [
      'Kum, su, taş, ateş, odun, buhar, yağ, lav, bitki ve cam; hepsi gerçek hücre fiziğiyle.',
      'Volkan, Kum saati, Vaha ve Kaos Lab sahneleri; aynı seed aynı sahneyi üretir.',
      'Fırça boyutu ve şekli, basılı tutarak akıtma, sağ tıkla silme ve Geri al.',
      'Dokunmatik ekran desteği, klavye kısayolları ve görsel kalite ayarı.',
    ],
  },
]);

// Diyalogda gösterilen en fazla sürüm sayısı.
export const WHATS_NEW_COUNT = 3;
