// Klavye kısayolları. keyToAction saf bir eşlemedir (test edilebilir);
// attachKeyboard yalnızca DOM bağlantısını yapar.
import { pickerByShortcut } from './catalog.js';

// Windows'ta AltGr, ctrlKey + altKey olarak gelir (Türkçe Q klavyede [ ] AltGr ile yazılır).
const isAltGraph = (e) => (typeof e.getModifierState === 'function' && e.getModifierState('AltGraph')) || (e.ctrlKey && e.altKey);

export function keyToAction(e) {
  const k = e.key;
  const altGr = isAltGraph(e);
  if ((e.ctrlKey || e.metaKey) && !altGr) {
    if ((k === 'z' || k === 'Z') && !e.shiftKey && !e.altKey) return { type: 'undo' };
    return null; // tarayıcı/işletim sistemi kısayolları
  }
  if (e.altKey && !altGr) return null;

  if (k.length === 1 && !altGr) {
    const pick = pickerByShortcut(k);
    if (pick) return { type: 'material', key: pick.key };
  }
  switch (k) {
    case ' ':
      return { type: 'togglePause' };
    case '.':
      return { type: 'step' };
    case '[':
      return { type: 'brushSize', delta: -1 };
    case ']':
      return { type: 'brushSize', delta: 1 };
    case 's':
    case 'S':
      return altGr ? null : { type: 'cycleShape' };
    case '+':
    case '=':
      return { type: 'speed', delta: 1 };
    case '-':
      return { type: 'speed', delta: -1 };
    case '?':
      return { type: 'help' };
    default:
      return null;
  }
}

const TEXT_INPUT_TYPES_ALLOWED = new Set(['range', 'checkbox', 'radio', 'button', 'submit', 'reset', 'color']);

// Metin girişi yapılan alanlarda kısayollar devre dışı.
export function shouldIgnoreTarget(target) {
  if (!target) return false;
  if (target.isContentEditable) return true;
  const tag = target.tagName;
  if (tag === 'TEXTAREA' || tag === 'SELECT') return true;
  if (tag === 'INPUT') return !TEXT_INPUT_TYPES_ALLOWED.has(String(target.type).toLowerCase());
  return false;
}

const NO_REPEAT = new Set(['togglePause', 'undo', 'help', 'cycleShape']);

export function attachKeyboard(target, dispatch) {
  const onKeyDown = (e) => {
    if (e.defaultPrevented || shouldIgnoreTarget(e.target)) return;
    const action = keyToAction(e);
    if (!action) return;
    if (e.repeat && NO_REPEAT.has(action.type)) return;
    // Odaklı bir butonda Space butonu tetiklesin (erişilebilirlik); pause'u değil.
    const tag = e.target?.tagName;
    if (action.type === 'togglePause' && (tag === 'BUTTON' || tag === 'SUMMARY' || (tag === 'INPUT' && e.target.type !== 'range'))) return;
    e.preventDefault();
    dispatch(action);
  };
  target.addEventListener('keydown', onKeyDown);
  return () => target.removeEventListener('keydown', onKeyDown);
}
