// Uygulama genelindeki sabitler. DOM'a veya tarayıcı API'lerine dokunmaz
// (Node testlerinde de import edilebilir).

// Proje adı: değiştirmek için burası, index.html <title> ve README yeterli.
export const APP_NAME = 'Strata Sandbox';

// Dosya adlarında kullanılan kısa ad (ör. yakalanan PNG).
export const APP_SLUG = 'strata';

// Uygulama sürümü: package.json ve CHANGELOG.md ile aynı olmalı (tests/releases.test.js).
export const APP_VERSION = '0.10.0';

// localStorage anahtarı bilinçli olarak addan bağımsızdır: ad değişince
// kullanıcı tercihleri kaybolmaz.
export const STORAGE_KEY = 'fsbox.prefs.v1';

// Fizik grid'i açılışta konteynır boyutuna göre bir kez seçilir (ADR-002).
// Hücre bütçesi performans sınırıdır: dokunmatik (coarse pointer) cihazlarda daha düşük.
export const CELL_BUDGET = Object.freeze({ desktop: 90000, mobile: 40000 });

// Sunum çözünürlüğü üst sınırı (render maliyetini sınırlar).
export const MAX_DPR = 2;

// Uygulama katmanının kare başına fizik bütçesi (ms).
export const PHYSICS_BUDGET_MS = 8;

// Varsayılan başlangıç seed'i.
export const DEFAULT_SEED = 'strata';
