# JF-Notizen (Easyverein)

Ein per `<iframe>` einbettbares Widget (gleiche schlichte Karten-Optik wie
llp-termine-suche/llp-schulkontakte-editor), um die Beschreibung der
Easyverein-Termine mit Namenspräfix "JF" (Jour Fixe) chronologisch durchzublättern und
direkt zu bearbeiten.

**Live:** https://stephankurz.github.io/llp-jf-notizen/

## Einbindung

```html
<iframe
  src="https://stephankurz.github.io/llp-jf-notizen/"
  style="display:block; margin:0 auto; width:100%; max-width:1140px; height:900px; border:0;">
</iframe>
```

`display:block; margin:0 auto;` + `max-width` sorgen dafür, dass das `<iframe>`-Element
selbst auf der Host-Seite zentriert bleibt (ein iframe ist sonst standardmäßig
linksbündig, unabhängig davon, wie der Inhalt darin ausgerichtet ist). Die Innenbreite
des Widgets selbst ist auf 1080px begrenzt (`#app { max-width: 1080px }` in
`index.html`).

Es gibt keinen eigenen Login: Die einbettende Webseite ist die Sicherheitsgrenze
(gleiches Prinzip wie beim Schulkontakte-Editor und der Termine-Suche).

## Funktionen

- Zeigt alle Easyverein-Termine, deren Name (getrimmt) mit "JF" beginnt
  (z. B. "JF", "JF mit Stephan", "JF mit Christiane", "JF telefonisch", ...) als eine
  durchgehende chronologische Reihe – unabhängig von der genauen Namensvariante, da es
  zeitlich lückenlos dieselbe fortlaufende Sitzungsreihe ist.
- **"‹ Früher" / "Später ›"**: blättert zum vorherigen/nächsten JF-Termin.
- Start beim Laden: der zuletzt vergangene JF-Termin (nicht zwingend der letzte in der Liste,
  falls bereits künftige Termine ohne Inhalt angelegt sind).
- Beschreibungsfeld ist direkt editierbar (contenteditable), bestehende Formatierung
  (Listen, Fett, ...) bleibt erhalten.
- **Neuer Text erscheint blau** (`#007AFF`, iOS-Systemblau), unabhängig davon, ob er
  angehängt oder mitten im bestehenden schwarzen Text eingefügt wird – so bleibt auf
  Anhieb sichtbar, was seit dem letzten Speichern neu dazugekommen ist.
- **"Speichern"**-Schalter unten rechts (aktiv nur bei ungespeicherten Änderungen):
  schreibt den kompletten Beschreibungstext zurück nach Easyverein. Beim Wechsel zu
  einem anderen JF-Termin mit ungespeicherten Änderungen wird nachgefragt.

## Architektur

Statisches HTML (`index.html`, kein Build-Schritt) plus zwei Supabase Edge Functions im
Projekt `llp-schuldaten`, die den Easyverein-API-Key serverseitig halten (er darf nie im
Browser landen):

| Edge Function | Zweck |
|---|---|
| `jf-list`  | GET, liefert alle JF-Termine (id, Name, Start, Beschreibung), chronologisch sortiert |
| `jf-update` | PATCH `{id, description}`, prüft vor dem Schreiben erneut, dass der Termin-Name mit "JF" beginnt (Schutz gegen manipulierte ids), schreibt dann die Beschreibung nach Easyverein zurück |

## Repo

https://github.com/StephanKurz/llp-jf-notizen (öffentlich, GitHub Pages aus `main`/`/`)
