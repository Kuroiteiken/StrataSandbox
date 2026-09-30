// Dökümhane: magma üstünde taş pota ve içinde erimiş metal; potanın yan yarığından dökülen metal havada
// düşerek basamaklı üç taş kalıba dolar (dolan kalıp sağ ağzından bir alttakine taşar), sonda su teknesi.
// Kaidenin yanından çıkan metal kiriş magma çekirdeğinden ısınıp kızarır; zeminde metal külçeler.
// Metal kalıplarda soğuyup katılaşır; potada kalan metal magma üstünde kızgın ama katı kalır (1200 < 1300 °C).
// Oluk yerine serbest düşüş: soğuk taş olukta metal girişte donup kanalı tıkıyordu; hava ısıyı yavaş iletir.
import { MAT } from '../engine/materials.js';
import { frame, rect } from './tools.js';

// Önceden ısıtılmış pota duvarı: metalin katılaşma eşiğinin (1300 °C) üstünde, taşın erime eşiğinin
// (1500 °C) altında; soğuk duvardaki yarıkta metal kabuk bağlayıp çıkışı tıkamasın.
const POT_WALL_TEMP = 1350;

export function foundry(sim) {
  const { W, H, X, Y, S } = frame(sim);
  const floor = Y(0.9);
  rect(sim, 0, floor, W - 1, H - 1, MAT.STONE);

  // Pota: taş duvarlar 2 hücre; iç genişlik pw, iç yükseklik ph.
  const px0 = X(0.05);
  const pw = Math.max(4, X(0.14));
  const ptop = Y(0.2);
  const ph = Math.max(4, Y(0.2));
  const px1 = px0 + pw + 3; // sağ duvarın dış sütunu
  const pbot = ptop + ph; // tabanın ilk satırı
  rect(sim, px0, ptop, px0 + 1, pbot + 1, MAT.STONE);
  rect(sim, px1 - 1, ptop, px1, pbot + 1, MAT.STONE);
  rect(sim, px0, pbot, px1, pbot + 1, MAT.STONE);
  rect(sim, px0, pbot + 2, px1, floor - 1, MAT.STONE); // kaide
  const magmaBottom = Math.min(floor - 1, pbot + 1 + Math.max(2, S(0.04)));
  rect(sim, px0 + 2, pbot + 2, px1 - 2, magmaBottom, MAT.MAGMA);
  rect(sim, px0 + 2, ptop + 1, px1 - 2, pbot - 1, MAT.MOLTEN_METAL);
  for (let y = ptop; y <= pbot + 1; y++) {
    for (let x = px0; x <= px1; x++) if (sim.getCell(x, y)?.material === MAT.STONE) sim.setTemp(x, y, POT_WALL_TEMP);
  }
  const spoutY = ptop + Math.floor(ph * 0.45);
  rect(sim, px1 - 1, spoutY, px1, spoutY + 2, MAT.EMPTY); // yarık (3 satır)

  // Kızaran kiriş: kaidenin sol yanından dışarı uzanır; aradaki tek sıra taştan magma ısısını alır.
  const beamY = pbot + 2;
  for (let x = Math.max(0, px0 - Math.max(3, S(0.08))); x < px0; x++) sim.setCell(x, beamY, MAT.METAL);

  // Basamaklı kalıplar: ilki yarığın hemen altında (sol duvarı potanın kendisi); her kalıbın sol duvarı
  // 2 hücre yüksek olduğundan dolan metal sağ ağızdan bir alttakine taşar.
  const mw = Math.max(5, X(0.1));
  const md = Math.max(3, S(0.05));
  let L = px1; // ilk kalıbın sol duvarı potanın sağ duvarı
  let R = spoutY + 6; // kalıp ağzı satırı
  for (let k = 0; k < 3; k++) {
    if (k > 0) rect(sim, L, R - 2, L, R + md + 1, MAT.STONE); // sol duvar (yüksek)
    rect(sim, L + mw + 1, R, L + mw + 1, R + md + 1, MAT.STONE); // sağ duvar
    rect(sim, L, R + md + 1, L + mw + 1, R + md + 1, MAT.STONE); // taban
    L += mw - 1;
    R += md + 3;
  }

  // Su teknesi (son kalıbın taşma noktasının altında).
  const tw = mw + 4;
  const tTop = Math.min(R, floor - 3);
  const tBottom = Math.min(floor - 1, tTop + 3 * md);
  rect(sim, L, tTop - 2, L, tBottom, MAT.STONE);
  rect(sim, L + tw + 1, tTop, L + tw + 1, tBottom, MAT.STONE);
  rect(sim, L, tBottom, L + tw + 1, tBottom, MAT.STONE);
  if (tBottom - 1 >= tTop + 1) rect(sim, L + 1, tTop + 1, L + tw, tBottom - 1, MAT.WATER);

  // Zeminde metal külçeler (kaidenin sağında).
  const ingotW = Math.max(2, S(0.03));
  for (let k = 0; k < 3; k++) {
    const x = px1 + 2 + k * (ingotW + 1);
    rect(sim, x, floor - 2, x + ingotW - 1, floor - 1, MAT.METAL);
  }
}
