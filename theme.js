/* Gemeinsames Farbthema aller RapCouch-Seiten.
 *
 * Das aktive Theme steht in Firebase unter config/theme (öffentlich lesbar, nur von
 * aktiven Admins schreibbar – siehe database.rules.json). Jede Seite
 *  - wendet sofort das zuletzt gemerkte Theme an (kein Aufblitzen der falschen Farben),
 *  - fragt dann per einfacher REST-Anfrage ab, welches Theme gerade gilt.
 * Die Hauptseite hört zusätzlich live mit und bietet Admins den Umschalter.
 *
 * Neues Theme hinzufügen: unten in THEMES eintragen und den Namen in der Regel
 * config/theme in database.rules.json ergänzen.
 *
 * Wichtig: normales <script>-Tag (kein type="module"). */
(function(){
  var DEFAULT = 'kontrast';
  var KEY = 'rc-theme';

  var THEMES = {
    // Für Beamer: sehr dunkler Grund, fast weißer Text, helles Eigelb als Akzent.
    kontrast: {
      label: 'Beamer-Kontrast',
      v: { bg:'#0E0C07', raised:'#1A160C', fg:'#FFF8E6', dim:'#C9BFA3',
           accent:'#FFC81E', accentDim:'#5C4708', accentRgb:'255,200,30',
           line:'#6B5F3F', danger:'#FF8F7A' }
    },
    // Das bisherige Aussehen.
    klassisch: {
      label: 'Klassisch (Orange)',
      v: { bg:'#0a0a0a', raised:'#121212', fg:'#ededea', dim:'#8a8a86',
           accent:'#ff4d1c', accentDim:'#5a2210', accentRgb:'255,77,28',
           line:'#232320', danger:'#ff8a70' }
    }
  };

  var current = DEFAULT;

  function apply(name){
    if (!THEMES[name]) name = DEFAULT;
    var v = THEMES[name].v, s = document.documentElement.style;
    var map = {
      '--bg': v.bg, '--bg-raised': v.raised, '--raised': v.raised,
      '--fg': v.fg, '--fg-dim': v.dim, '--dim': v.dim,
      '--accent': v.accent, '--accent-dim': v.accentDim, '--accent-rgb': v.accentRgb,
      '--line': v.line, '--danger': v.danger
    };
    for (var k in map) s.setProperty(k, map[k]);
    document.documentElement.setAttribute('data-theme', name);
    var changed = name !== current;
    current = name;
    try { localStorage.setItem(KEY, name); } catch (e){}
    if (changed) { try { window.dispatchEvent(new CustomEvent('rc-theme', { detail: name })); } catch (e){} }
  }

  try {
    var cached = localStorage.getItem(KEY);
    if (cached && THEMES[cached]) apply(cached);
  } catch (e){}

  // Gilt gerade ein anderes Theme? Einzelne kurze Abfrage ohne Firebase-SDK.
  function load(){
    var cfg = (typeof FIREBASE_CONFIG !== 'undefined') ? FIREBASE_CONFIG : null;
    var base = ((cfg && cfg.databaseURL) || '').replace(/\/$/, '');
    if (!base || typeof fetch !== 'function') return;
    fetch(base + '/config/theme.json', { cache: 'no-store' })
      .then(function(r){ return r.ok ? r.json() : undefined; })
      .then(function(n){
        if (n === undefined) return;                 // Fehler/offline: gemerktes Theme behalten
        apply(typeof n === 'string' && THEMES[n] ? n : DEFAULT);
      })
      .catch(function(){});
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', load);
  else load();

  window.rcTheme = { THEMES: THEMES, DEFAULT: DEFAULT, apply: apply, current: function(){ return current; } };
})();
