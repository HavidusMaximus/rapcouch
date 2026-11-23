// Tests für database.rules.json gegen den lokalen Firebase-Emulator.
// Ausführen: npm install && npm run test:rules   (braucht Java für den Emulator)
import { test, before, after, beforeEach } from 'node:test';
import { readFileSync } from 'node:fs';
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';

const TS = { '.sv': 'timestamp' };
let env;

before(async () => {
  env = await initializeTestEnvironment({
    projectId: 'rapcouch-7d8f1',
    database: { rules: readFileSync(new URL('../database.rules.json', import.meta.url), 'utf8'), host: '127.0.0.1', port: 9000 },
  });
});
after(async () => { await env.cleanup(); });
beforeEach(async () => {
  await env.clearDatabase();
  await env.withSecurityRulesDisabled(async (ctx) => {
    await ctx.database().ref().set({
      staff: {
        admin1: { role: 'admin', active: true, displayName: 'Admin', email: 'a@x.de' },
        mod1: { role: 'moderator', active: true, displayName: 'Mod', email: 'm@x.de' },
        mod2: { role: 'moderator', active: true, displayName: 'Mod 2', email: 'm2@x.de' },
        old1: { role: 'moderator', active: false, displayName: 'Alt', email: 'o@x.de' },
      },
      audience: { live: { open: true } },
    });
  });
});

const db = (uid, token) => (uid ? env.authenticatedContext(uid, token || {}) : env.unauthenticatedContext()).database();
const anon = (uid) => db(uid, { firebase: { sign_in_provider: 'anonymous' } });
const verified = (uid) => db(uid, { email: uid + '@x.de', email_verified: true });
const unverified = (uid) => db(uid, { email: uid + '@x.de', email_verified: false });
const suggestion = (uid, w = 'Couch', id = 'abc123') => ({
  ['suggestions/' + id]: { w, t: TS, d: uid },
  ['rate/' + uid]: TS,
});
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

/* ---------- staff ---------- */
test('staff: Admin darf andere Einträge schreiben, aber nicht den eigenen', async () => {
  await assertSucceeds(db('admin1').ref('staff/mod1/role').set('admin'));
  await assertFails(db('admin1').ref('staff/admin1/active').set(false));
});
test('staff: niemand ohne Admin-Rolle kann sich hochstufen', async () => {
  await assertFails(db('mod1').ref('staff/mod1/role').set('admin'));
  await assertFails(db('mod1').ref('staff/mod2/role').set('admin'));
  await assertFails(verified('fremd').ref('staff/fremd').set({ role: 'admin', active: true, displayName: 'X', email: 'x@x.de' }));
});
test('staff: Liste nur für Admins, eigener Eintrag für alle', async () => {
  await assertSucceeds(db('admin1').ref('staff').once('value'));
  await assertFails(db('mod1').ref('staff').once('value'));
  await assertSucceeds(db('mod1').ref('staff/mod1').once('value'));
  await assertFails(db('mod1').ref('staff/mod2').once('value'));
});

/* ---------- config/theme ---------- */
test('config/theme: öffentlich lesbar, nur aktive Admins schreiben, nur bekannte Themes', async () => {
  await assertSucceeds(db(null).ref('config/theme').once('value'));
  await assertSucceeds(db('admin1').ref('config/theme').set('klassisch'));
  await assertSucceeds(db('admin1').ref('config/theme').set('kontrast'));
  await assertFails(db('admin1').ref('config/theme').set('pink'));
  await assertFails(db('mod1').ref('config/theme').set('kontrast'));
  await assertFails(db('old1').ref('config/theme').set('kontrast'));
  await assertFails(verified('fremd').ref('config/theme').set('kontrast'));
  await assertFails(db(null).ref('config/theme').set('kontrast'));
  await assertFails(db('admin1').ref('config/anderes').set('x'));
});

/* ---------- audience: open ---------- */
test('open: öffentlich lesbar, nur aktive Staff schreiben', async () => {
  await assertSucceeds(db(null).ref('audience/live/open').once('value'));
  await assertFails(anon('a1').ref('audience/live/open').set(false));
  await assertFails(db('old1').ref('audience/live/open').set(false));
  await assertSucceeds(db('mod1').ref('audience/live/open').set(false));
});

/* ---------- audience: suggestions + Wartezeit ---------- */
test('suggestions: anonymes Handy kann mit Zeitstempel einreichen', async () => {
  await assertSucceeds(anon('a1').ref('audience/live').update(suggestion('a1')));
});
test('suggestions: ohne Anmeldung, ohne rate-Eintrag oder mit fremder Kennung abgelehnt', async () => {
  await assertFails(db(null).ref('audience/live').update(suggestion('a1')));
  await assertFails(anon('a1').ref('audience/live/suggestions/x1').set({ w: 'Couch', t: TS, d: 'a1' }));
  await assertFails(anon('a1').ref('audience/live').update({ 'suggestions/x2': { w: 'Couch', t: TS, d: 'a2' }, 'rate/a1': TS }));
  await assertFails(anon('a1').ref('audience/live').update({ 'suggestions/x3': { w: 'Couch', t: TS, d: 'a1' }, 'rate/a1': 12345 }));
});
test('suggestions: ungültige Wörter und Zusatzfelder abgelehnt', async () => {
  await assertFails(anon('a1').ref('audience/live').update(suggestion('a1', '<b>')));
  await assertFails(anon('a1').ref('audience/live').update(suggestion('a1', 'x')));
  await assertFails(anon('a1').ref('audience/live').update({ 'suggestions/y': { w: 'Couch', t: TS, d: 'a1', z: 1 }, 'rate/a1': TS }));
});
test('suggestions: geschlossen -> abgelehnt', async () => {
  await env.withSecurityRulesDisabled(c => c.database().ref('audience/live/open').set(false));
  await assertFails(anon('a1').ref('audience/live').update(suggestion('a1')));
});
test('suggestions: zweite Einreichung erst nach 20 Sekunden', { timeout: 40000 }, async () => {
  await assertSucceeds(anon('a1').ref('audience/live').update(suggestion('a1', 'Couch', 'id1')));
  await assertFails(anon('a1').ref('audience/live').update(suggestion('a1', 'Sofa', 'id2')));
  await assertSucceeds(anon('a2').ref('audience/live').update(suggestion('a2', 'Sofa', 'id3'))); // anderes Handy
  await sleep(20500);
  await assertSucceeds(anon('a1').ref('audience/live').update(suggestion('a1', 'Sofa', 'id4')));
});
test('suggestions: nur Staff liest und löscht', async () => {
  await assertSucceeds(anon('a1').ref('audience/live').update(suggestion('a1')));
  await assertFails(anon('a1').ref('audience/live/suggestions').once('value'));
  await assertFails(anon('a1').ref('audience/live/suggestions/abc123').remove());
  await assertSucceeds(db('mod1').ref('audience/live/suggestions').once('value'));
  await assertSucceeds(db('mod1').ref('audience/live/suggestions/abc123').remove());
});

/* ---------- audience: approved ---------- */
test('approved: nur Staff mit eigener UID in "by"', async () => {
  await assertSucceeds(db('mod1').ref('audience/live/approved/k1').set({ w: 'Couch', by: 'mod1', t: TS }));
  await assertFails(db('mod1').ref('audience/live/approved/k2').set({ w: 'Couch', by: 'mod2', t: TS }));
  await assertFails(anon('a1').ref('audience/live/approved/k3').set({ w: 'Couch', by: 'a1', t: TS }));
  await assertFails(db('old1').ref('audience/live/approved/k4').set({ w: 'Couch', by: 'old1', t: TS }));
});
test('approved: atomare Freigabe schlägt fehl, wenn die Einreichung schon weg ist (keine Doppel-Freigabe)', async () => {
  await assertSucceeds(anon('a1').ref('audience/live').update(suggestion('a1', 'Couch', 's1')));
  const approve = (uid, key) => db(uid).ref('audience/live').update({
    ['approved/' + key]: { w: 'Couch', by: uid, t: TS },
    'suggestions/s1': null,
  });
  await assertSucceeds(approve('mod1', 'k1'));
  await assertFails(approve('mod2', 'k2'));
  const approved = (await db('mod1').ref('audience/live/approved').once('value')).val();
  if (Object.keys(approved || {}).length !== 1) throw new Error('Erwartet genau eine Freigabe, gefunden: ' + JSON.stringify(approved));
});
test('approved: Schreiben in unbekannte Knoten unter audience abgelehnt', async () => {
  await assertFails(db('mod1').ref('audience/live/irgendwas').set(true));
});

/* ---------- sessions ---------- */
const goodState = {
  mode: 'takt', bpm: 90, turnBars: 4, lenMin: 4, lenMax: 12, complexity: 'alle',
  posSet: ['n'], activeCategory: 'tiere', themaSource: 'custom', topics: ['Montag', 'Couch'],
  intervalSec: 120, playing: true, seed: 'abc', startedAt: 1700000000000,
};
test('sessions: nur bestätigte E-Mail oder aktive Staff', async () => {
  await assertFails(db(null).ref('sessions/ABC123/state').set(goodState));
  await assertFails(anon('a1').ref('sessions/ABC123/state').set(goodState));
  await assertFails(unverified('u1').ref('sessions/ABC123/state').set(goodState));
  await assertSucceeds(verified('v1').ref('sessions/ABC123/state').set(goodState));
  await assertSucceeds(db('mod1').ref('sessions/ABC123/state').update({ bpm: 100 }));
  await assertSucceeds(verified('v1').ref('sessions/ABC123/state').once('value'));
  await assertFails(unverified('u1').ref('sessions/ABC123/state').once('value'));
});
test('sessions: neue Felder (Themen, Quelle, Intervall) erlaubt, Unsinn abgelehnt', async () => {
  const v = verified('v1');
  await assertSucceeds(v.ref('sessions/public/state').set(goodState));
  await assertSucceeds(v.ref('sessions/public/state').update({ posSet: null, activeCategory: null, topics: null, startedAt: null }));
  await assertFails(v.ref('sessions/public/state').update({ mode: 'xyz' }));
  await assertFails(v.ref('sessions/public/state').update({ complexity: 'irgendwas' }));
  await assertFails(v.ref('sessions/public/state').update({ themaSource: 'x' }));
  await assertFails(v.ref('sessions/public/state').update({ turnBars: 3 }));
  await assertFails(v.ref('sessions/public/state').update({ lenMin: 20, lenMax: 10 }));
  await assertFails(v.ref('sessions/public/state').update({ topics: ['x'.repeat(121)] }));
  await assertFails(v.ref('sessions/public/state').update({ intervalSec: 2 }));
  await assertFails(v.ref('sessions/public/state').update({ hacker: true }));
  await assertFails(v.ref('sessions/ab/state').set(goodState)); // Code zu kurz
});
test('sessions: Presence nur mit eigener UID als Präfix, Liste nicht löschbar', async () => {
  await assertSucceeds(verified('v1').ref('sessions/public/presence/v1_xyz').set(true));
  await assertFails(verified('v1').ref('sessions/public/presence/v2_xyz').set(true));
  await assertFails(verified('v1').ref('sessions/public/presence').remove());
  await assertSucceeds(verified('v1').ref('sessions/public/presence/v1_xyz').remove());
});

/* ---------- registrations ---------- */
test('registrations: einmaliger eigener Eintrag nach bestätigter E-Mail', async () => {
  const entry = { email: 'v1@x.de', displayName: 'Vau', createdAt: TS };
  await assertFails(unverified('u1').ref('registrations/u1').set({ ...entry, email: 'u1@x.de' }));
  await assertFails(verified('v1').ref('registrations/v1').set({ ...entry, email: 'falsch@x.de' }));
  await assertSucceeds(verified('v1').ref('registrations/v1').set(entry));
  await assertFails(verified('v1').ref('registrations/v1').set(entry));
  await assertSucceeds(verified('v1').ref('registrations/v1').once('value'));
  await assertSucceeds(db('admin1').ref('registrations').once('value'));
  await assertFails(db('mod1').ref('registrations').once('value'));
});
