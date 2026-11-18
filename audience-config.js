// Gemeinsame Einstellungen für "Publikumswörter" (Hauptseite, Mitmach-Seite, Moderations-Seite).
//
// Wichtig: normales <script>-Tag (kein type="module"), daher keine import-Anweisungen.

const AUDIENCE_CONFIG = {
  // Name des Veranstaltungs-Knotens in Firebase (audience/<event>/...).
  // Alle drei Seiten verwenden standardmäßig denselben Wert, deshalb muss das
  // Publikum keinen Code eingeben, nur die kurze Adresse.
  event: 'live',

  // Kurzlink, der auf dem Beamer angezeigt wird (ohne https://). Er muss bei
  // is.gd (oder einem anderen Kurzlink-Dienst) auf die Adresse von
  // mitmachen.html zeigen – die exakte Ziel-Adresse zeigt dir das
  // Publikum-Fenster in der Hauptseite zum Kopieren an.
  shortLink: 'is.gd/rapcouch',

  minLength: 2,
  maxLength: 24,

  // Einreichungen, die älter sind, gelten als Überbleibsel einer früheren Session.
  maxAgeHours: 6,

  // Freigaben, die älter sind, werden beim Beamer nicht mehr eingespielt
  // (z. B. weil der Beamer zwischendurch offline war).
  maxApprovedAgeMinutes: 20,
};

// Einheitliche Prüfung/Bereinigung eines eingereichten Wortes. Gibt das
// bereinigte Wort zurück oder null, wenn es nicht zulässig ist
// (genau ein Wort aus Buchstaben, optional mit Bindestrich).
function audienceNormalizeWord(raw){
  const w = String(raw == null ? '' : raw).normalize('NFC').trim();
  if (w.length < AUDIENCE_CONFIG.minLength || w.length > AUDIENCE_CONFIG.maxLength) return null;
  if (!/^\p{L}+(?:-\p{L}+)*$/u.test(w)) return null;
  return w;
}

// Sperrliste für Publikumswörter. Auch wenn ein Wort in der eigenen Wortliste steht,
// läuft es bei einem Treffer NICHT automatisch auf den Beamer:
//   - Modus "Verwerfen": Das Wort wird verworfen.
//   - Modus "Per Mod-Gerät": Das Wort wartet auf eine bewusste Freigabe und ist auf
//     der Moderationsseite markiert.
// Geprüft wird gegen das klein geschriebene Wort. Die Muster sind so gewählt, dass harmlose
// Wörter wie "Tischlampe", "Sandwichs", "Broschuren" oder "Mongole" nicht getroffen werden.
// Einfach erweitern: ein weiterer regulärer Ausdruck pro Zeile.
const AUDIENCE_BLOCKLIST = [
  /fotze/, /(^|[^cs])hure/, /nutte/, /(^|[^dh])wichs/, /(^|[^i])schlampe/,
  /neger/, /nigger/, /kanake/, /kanacke/, /schwuchtel/, /zigeuner/, /schlitzauge/,
  /bimbo/, /untermensch/, /judensau/, /nazi(?!t)/, /hitler/, /holocaust/,
  /hakenkreuz/, /siegheil/, /endsieg/, /^kz$/, /vergewaltig/, /kindesmissbrauch/,
  /kinderporn/, /p(ä|ae)do/, /inzest/, /fick/, /arschloch/, /spast/, /^mongo(?!l)/,
  /^behindert$/, /missgeburt/, /pimmel/, /m(ö|oe)se(n)?$/, /muschi/, /titte/,
  /penis/, /vagina/, /schwanzlutsch/, /porno/,
];
function audienceIsBlocked(word){
  const w = String(word == null ? '' : word).normalize('NFC').toLowerCase();
  return AUDIENCE_BLOCKLIST.some(re => re.test(w));
}

// Event-Name aus der URL (?e=...) – nur harmlose Zeichen zulassen.
function audienceEventFromUrl(){
  const e = new URLSearchParams(location.search).get('e');
  return (e && /^[A-Za-z0-9_-]{1,32}$/.test(e)) ? e : AUDIENCE_CONFIG.event;
}

// Aktuelle Serverzeit (ms). Der Offset kommt aus Firebase (.info/serverTimeOffset);
// so spielt eine falsch gehende Handy-/Laptop-Uhr bei Altersprüfungen keine Rolle.
let audienceServerOffset = 0;
function audienceNow(){ return Date.now() + audienceServerOffset; }
