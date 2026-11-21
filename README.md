[![make.fun](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/c/gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/locky504/gta6-cover-art/rank.svg)](https://make.fun/c/gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/locky504/gta6-cover-art/reward.svg)](https://make.fun/c/gta6-cover-art-01)

# Neon Bay Cover Studio

A GTA-style cover art maker that runs entirely offline in a desktop browser:
upload your own photos, crop and arrange them across multi-panel poster
layouts, write a bold caption, pick a Vice City sunset or neon colour grade,
and export a share-ready PNG.

Built for the [make.fun gta6-cover-art-01 bounty](https://make.fun/c/gta6-cover-art-01)
— turn a person's photo and a caption into cover art in the style of GTA 6's
posters.

## What it does

- **Any photo** — load up to three photos from your machine (or try the two
  built-in sample photos). One photo fills every panel, or several photos fill
  one panel each. Drag a photo on the preview to reposition it, scroll to zoom,
  or use the crop sliders per panel.
- **Multi-panel posters** — four layouts: Triple split (hero centre, two side
  panels), Comic strip (three equal panels), Hero + strip, and Four grid.
- **Bold caption lettering** — a big condensed title with a hard outline and
  drop shadow, a tagline pill, five title colours, and a retro sun with rays.
- **Sunset / neon grades** — Vice Sunset, Neon Night, Golden Hour, Teal Noir
  and Pop Punch, plus film grain and halftone dots.
- **Fast export** — one click exports a PNG in 1080×1080, 1080×1350 or
  1920×1080. The live preview and the export run the same drawing code, so
  what you see is what you get.

## Try it

```sh
node serve.ts
# open http://localhost:8080
```

No build step, no network: `app/` is plain static files. Every font is a local
file under `app/fonts/` (Anton and Oswald, SIL Open Font License), every photo
is read on your machine and never uploaded.

## Layout of this repo

- `app/` — the web app (`index.html`, `style.css`, `src/cover.js` for the
  cover renderer, `src/app.js` for the editor, `src/shots.js` for screenshot
  modes, `fonts/`, `samples/`).
- `screenshots/` — screenshots taken by the maker: the exported cover first,
  then the editor with a photo loaded, then covers in the other post sizes.
- `main.ts` — the entrypoint: copies `app/` and `screenshots/` to `/output`
  and writes `/output/dossier.json` with the kit's `buildDossier`.
- `vendor/makefun-app.ts` — the kit's dossier library, unchanged.
- `serve.ts` — a tiny static server for local testing.

## Originality

All art is original: no Rockstar Games logo, wordmark, official artwork,
character or font file. The sample photos under `app/samples/` were made with
an image model for make.fun and are free to use. Display type is Anton and
Oswald under the SIL Open Font License (see `app/fonts/OFL-Anton.txt` and
`app/fonts/OFL-Oswald.txt`).

## License

MIT — see [LICENSE](LICENSE).
