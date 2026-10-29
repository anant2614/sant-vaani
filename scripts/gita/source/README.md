# Gita source text

`gita-iast.json` is `res/gita.json` from the npm package
[krishnagita](https://www.npmjs.com/package/krishnagita) 1.0.5 by Sharad
Baranwal, released into the public domain under the
[Unlicense](https://unlicense.org). SHA-256
`2963709d29fba1b4124bf139cbcf905580493ec839312a0ac1945e3a6df4ed1c`.

It holds all 700 verses in IAST with words split, each verse as
`speaker uvāca|first half|second half||` (the speaker part only where one
speaks). A `;` marks the middle of a long (triṣṭubh) half-line.

`scripts/gita/build.mjs` joins the words the way Devanagari editions print
them, converts to Devanagari, and writes the app's SQLite file and the
database seed. The file is kept as downloaded; fixes belong in the build.

No translation or commentary is included. Meanings stay empty until we
write our own or license one.
