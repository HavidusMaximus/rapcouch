// Unsplash-Konfiguration für den RAPCOUCH-Modus "SACK" (Grab the Bag).
//
// Optional: Ohne gültigen Key funktioniert der Modus trotzdem – die App
// fällt dann automatisch auf Picsum Photos zurück (kein Key nötig, aber
// ohne gezielten Content-Filter). Mit einem kostenlosen Unsplash-Key gibt
// es echte, kuratierte Fotos von Alltagsgegenständen inkl. NSFW-Filter
// (content_filter=high).
//
// So bekommst du einen kostenlosen Key:
//   1. Auf https://unsplash.com/developers registrieren (kostenlos).
//   2. "Your apps" -> "New Application" -> Namen/Beschreibung eingeben.
//   3. Den "Access Key" (nicht den Secret Key!) hier unten eintragen.
//   Kostenloser Tarif ("Demo"): 50 Anfragen/Stunde – für Live-Auftritte
//   und Übung reicht das i.d.R. locker.
//
// Wichtig: Dieses Skript wird als normales <script>-Tag geladen (kein
// type="module"), deshalb funktionieren "import"-Anweisungen hier NICHT.

const UNSPLASH_CONFIG = {
  accessKey: "qekQBirB0sj4H2Uk3Pxeky1oOfUES7nBiyOnGqqPMS0",
};
