// Uygulama genelindeki sabitler. DOM'a veya tarayıcı API'lerine dokunmaz
// (Node testlerinde de import edilebilir).

// Proje adı: değiştirmek için burası, index.html <title> ve README yeterli.
export const APP_NAME = 'Strata Sandbox';

// localStorage anahtarı bilinçli olarak addan bağımsızdır: ad değişince
// kullanıcı tercihleri kaybolmaz.
export const STORAGE_KEY = 'fsbox.prefs.v1';

// Geçici sabit grid boyutu. Phase 4/9'da açılışta konteynıra ve hücre
// bütçesine göre bir kez hesaplanacak.
export const DEFAULT_GRID = Object.freeze({ width: 240, height: 135 });

// Varsayılan başlangıç seed'i.
export const DEFAULT_SEED = 'strata';
