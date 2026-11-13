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

// Event-Name aus der URL (?e=...) – nur harmlose Zeichen zulassen.
function audienceEventFromUrl(){
  const e = new URLSearchParams(location.search).get('e');
  return (e && /^[A-Za-z0-9_-]{1,32}$/.test(e)) ? e : AUDIENCE_CONFIG.event;
}
