import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { describe, it } from 'node:test';
import { DB_PATH, JSON_PATH, SQL_PATH, readGita, seedSql, webJson } from './build.mjs';
import { joinWords, toDevanagari } from './devanagari.mjs';

const gita = readGita();
const verse = (c, v) => gita.verses.find((x) => x.chapter === c && x.verse === v);

describe('Gita source', () => {
  it('has 700 verses', () => {
    assert.equal(gita.verses.length, 700);
  });

  it('has the standard chapter counts', () => {
    assert.deepEqual(
      gita.chapters.map((c) => c.verse_count),
      [47, 72, 43, 42, 29, 47, 30, 28, 34, 42, 55, 20, 34, 27, 20, 24, 28, 78],
    );
  });
});

describe('Devanagari', () => {
  it('joins words that end in a consonant', () => {
    assert.equal(joinWords('karmaṇy evādhikāras te mā phaleṣu kadā cana'), 'karmaṇyevādhikāraste mā phaleṣu kadā cana');
  });

  it('converts 2.47', () => {
    assert.equal(toDevanagari('karmaṇy evādhikāras te mā phaleṣu kadā cana'), 'कर्मण्येवाधिकारस्ते मा फलेषु कदा चन');
  });

  it('attaches the avagraha', () => {
    assert.equal(toDevanagari("saṅgo 'stv akarmaṇi"), 'सङ्गोऽस्त्वकर्मणि');
  });

  it('keeps visarga and anusvara words apart', () => {
    assert.equal(toDevanagari('samavetā yuyutsavaḥ māmakāḥ pāṇḍavānīkaṃ vyūḍhaṃ'), 'समवेता युयुत्सवः मामकाः पाण्डवानीकं व्यूढं');
  });

  it('reads ṁ before l as candrabindu', () => {
    assert.equal(toDevanagari('śraddhāvāṁl labhate'), 'श्रद्धावाँल्लभते');
  });

  it('writes oṃ as ॐ only when it stands alone', () => {
    assert.equal(toDevanagari('vedyaṃ pavitram oṃkāra ṛk sāma yajur eva ca'), 'वेद्यं पवित्रमोङ्कार ऋक्साम यजुरेव च');
    assert.equal(toDevanagari('oṃ tat sad iti nirdeśo'), 'ॐ तत्सदिति निर्देशो');
  });

  it('joins across the middle of a long line', () => {
    assert.equal(toDevanagari('na jāyate mriyate vā kadā cin; nāyaṃ bhūtvā'), 'न जायते म्रियते वा कदा चिन्नायं भूत्वा');
  });
});

describe('verses', () => {
  it('names the speaker of 2.11', () => {
    assert.equal(verse(2, 11).speaker_sa, 'श्रीभगवानुवाच');
    assert.equal(verse(2, 11).speaker_iast, 'śrībhagavān uvāca');
  });

  it('has no speaker on 2.47', () => {
    assert.equal(verse(2, 47).speaker_sa, null);
  });

  it('writes 2.47 in two half-lines', () => {
    assert.equal(verse(2, 47).sanskrit, 'कर्मण्येवाधिकारस्ते मा फलेषु कदा चन ।\nमा कर्मफलहेतुर्भूर्मा ते सङ्गोऽस्त्वकर्मणि ॥');
    assert.equal(
      verse(2, 47).transliteration,
      "karmaṇy evādhikāras te mā phaleṣu kadā cana |\nmā karmaphalahetur bhūr mā te saṅgo 'stv akarmaṇi ||",
    );
  });

  it('leaves no Latin letters or Vedic signs in the Devanagari', () => {
    const bad = gita.verses.filter((v) => /[A-Za-z;'ꣳ]/.test(v.sanskrit + (v.speaker_sa ?? '')));
    assert.deepEqual(bad.map((v) => `${v.chapter}.${v.verse}`), []);
  });

  it('leaves meanings empty', () => {
    assert.ok(gita.verses.every((v) => v.meaning_en === null && v.meaning_hi === null));
  });
});

describe('outputs', () => {
  it('the seed file is up to date', () => {
    assert.equal(readFileSync(SQL_PATH, 'utf8'), seedSql(gita));
  });

  it('the app database matches the source', () => {
    const db = new DatabaseSync(DB_PATH, { readOnly: true });
    try {
      assert.equal(db.prepare('select count(*) as n from verses').get().n, 700);
      assert.equal(db.prepare('select count(*) as n from chapters').get().n, 18);
      const row = db.prepare('select sanskrit, speaker_sa from verses where chapter = 2 and verse = 11').get();
      assert.equal(row.sanskrit, verse(2, 11).sanskrit);
      assert.equal(row.speaker_sa, 'श्रीभगवानुवाच');
    } finally {
      db.close();
    }
  });

  it('the web preview copy is up to date', () => {
    assert.equal(readFileSync(JSON_PATH, 'utf8'), webJson(gita));
  });
});
