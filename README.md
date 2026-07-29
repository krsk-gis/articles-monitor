# articles-monitor

## Terem- és tanárkereső

A `kereso/` mappában egy önálló, mobilra optimalizált statikus weboldal található, amely segít a hallgatóknak
megtalálni a termeket (részletes megközelíthetőségi leírással: útvonal a bejárattól, akadálymentesítés,
tájékozódási pontok) és a tanárokat (fogadóóra, iroda, aktuális óra).

- `kereso/index.html` – kereső felület
- `kereso/admin.html` – adatszerkesztő felület (termek, tanárok, épületek, órarend)
- `kereso/data/*.json` – az adatok forrása; az admin felületen szerkesztve, majd letöltve és a repóba
  visszatöltve (commit) frissíthetők

A jelenlegi adatok minta/placeholder adatok – ezeket kell lecserélni a valós intézményi adatokra.