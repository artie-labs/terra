#!/usr/bin/env python3
"""Build artie.world from site/datasets.json into site/_site/.

    python3 site/build.py            # writes site/_site/index.html and one page per dataset

Standard library only. One template (template.html), one JSON file, and the
run-time number read from pg/bench.txt at build time so it is never typed by
hand. Static files (schema.svg, recordings/) are copied alongside.
"""
import html
import json
import math
import pathlib
import shutil
import sys

HERE = pathlib.Path(__file__).resolve().parent
OUT = HERE / "_site"
sys.path.insert(0, str(HERE.parent / "pg"))
from bench_readme import read_bench  # noqa: E402  (one parser for bench.txt)
PLAYER_CSS = "https://cdn.jsdelivr.net/npm/asciinema-player@3.8.0/dist/bundle/asciinema-player.css"
PLAYER_CSS_SRI = "sha384-VAIywtUJJ6n5TJ2byhF+zitDG0mvuNWwRS2gSv1QtEZiVw+c/T/gdOXGwyP2OeJK"
PLAYER_JS = "https://cdn.jsdelivr.net/npm/asciinema-player@3.8.0/dist/bundle/asciinema-player.min.js"
PLAYER_JS_SRI = "sha384-svQ3ol2I6XJvPsGztCmG9/XctZ37XNsP86aAFDcKciKlaGHNbEmhhedZ7tNu5b9h"
# Recompute the hashes when bumping the version:
#   curl -sL <url> | openssl dgst -sha384 -binary | base64
CTA = ('Built by <a href="https://www.artie.com">Artie</a>. To replicate this database into a warehouse for real, '
       '<a href="https://app.artie.com">create a free pipeline</a>; the free plan has no end date.')
SITE_TITLE = "artie.world"
SITE_LINE = "A fake world with real database behavior. Clone it, stream it, break it."


def esc(value):
    return html.escape(str(value), quote=True)


def run_minutes(dataset):
    bench, note = read_bench((HERE / dataset["bench_file"]).resolve())
    return bench["total"], max(1, math.ceil(bench["total"] / 60)), note


def render(template, **fields):
    page = template
    for key, value in fields.items():
        page = page.replace("{{" + key + "}}", value)
    return page


def index_page(template, datasets):
    items = []
    for d in datasets:
        seconds, minutes, _ = run_minutes(d)
        items.append(f'<li><a href="{esc(d["slug"])}.html">{esc(d["name"])}</a> '
                     f'<span>{esc(d["source_db"])}. {esc(d["capability"])}. Runs in {minutes} min.</span></li>')
    body = (f'<h1>{esc(SITE_TITLE)}</h1><p class="lede">{esc(SITE_LINE)}</p>'
            '<h2>Datasets</h2><ul class="index">' + "".join(items) + "</ul>"
            '<h2>What this is</h2>'
            '<p>Each dataset is one source database and one thing it shows. You get a seeded database, a writer that keeps changing it, '
            'numbered schema changes to apply on purpose, and a verifier that compares source and destination after each one. '
            'Point any replication tool at it. The code is Apache-2.0 and the data is synthetic.</p>'
            '<p><a href="https://github.com/artie-labs/terra">github.com/artie-labs/terra</a></p>')
    return render(template, title=esc(SITE_TITLE), description=esc(SITE_LINE), head_extra="", body=body, cta=CTA)


def dataset_page(template, d):
    seconds, minutes, note = run_minutes(d)
    facts = [
        ("Animal", d["animal"]), ("Source", d["source_db"]), ("Shows", d["capability"]),
        ("Status", d["status"]), ("Repo", f'<a href="{esc(d["repo_url"])}">{esc(d["repo_url"].replace("https://", ""))}</a>'),
        ("Run it in", f"{minutes} min ({seconds} s measured, {esc(note)}; see <code>pg/bench.txt</code>)"),
    ]
    dl = "".join(f"<dt>{esc(k)}</dt><dd>{v if k in ('Repo', 'Run it in') else esc(v)}</dd>" for k, v in facts)
    run = "".join(f"<pre>{esc(cmd)}</pre>" for cmd in d["run"])
    rows = "".join(
        f'<tr><td class="n">{e["n"]:02d}</td><td>{esc(e["title"])}<br><code>{esc(e["ddl"])}</code></td><td>{esc(e["tests"])}</td></tr>'
        for e in d["events"])
    body = (f'<p class="nav"><a href="index.html">{esc(SITE_TITLE)}</a></p>'
            f'<h1>{esc(d["name"])}</h1><p class="lede">{esc(d["hook"])}</p>'
            f"<dl>{dl}</dl>"
            "<h2>Run it</h2>" + run +
            f'<p>{esc(d["run_note"])}</p>'
            "<h2>Recording</h2>"
            f'<div class="player" id="player"></div>'
            f'<p><a href="{esc(d["recording"])}">{esc(d["recording"])}</a>: {esc(d["recording_note"])}</p>'
            "<h2>Schema after the events</h2>"
            f'<img class="schema" src="{esc(d["schema_image"])}" alt="Schema diagram of {esc(d["name"])} after all events">'
            f'<p>{esc(d["schema_note"])}</p>'
            "<h2>Events</h2>"
            f'<table><tr><th>#</th><th>Event</th><th>What to look for</th></tr>{rows}</table>'
            f'<p>{esc(d["events_note"])} <a href="{esc(d["observed_url"])}">{esc(d["observed_url"].replace("https://github.com/", ""))}</a></p>')
    head_extra = (f'<link rel="stylesheet" href="{PLAYER_CSS}" integrity="{PLAYER_CSS_SRI}" crossorigin="anonymous">'
                  f'<script src="{PLAYER_JS}" integrity="{PLAYER_JS_SRI}" crossorigin="anonymous"></script>'
                  '<script>window.addEventListener("DOMContentLoaded", function () {'
                  f'  AsciinemaPlayer.create({json.dumps(d["recording"])}, document.getElementById("player"), '
                  '{cols: 100, rows: 28, idleTimeLimit: 2, poster: "npt:0:5", fit: "width", theme: "asciinema"});'
                  '});</script>')
    return render(template, title=esc(f'{d["name"]} · {SITE_TITLE}'), description=esc(d["hook"]), head_extra=head_extra, body=body, cta=CTA)


def main():
    template = (HERE / "template.html").read_text()
    datasets = json.loads((HERE / "datasets.json").read_text())
    if OUT.exists():
        shutil.rmtree(OUT)
    OUT.mkdir()
    (OUT / "index.html").write_text(index_page(template, datasets))
    for d in datasets:
        (OUT / f'{d["slug"]}.html').write_text(dataset_page(template, d))
        shutil.copy(HERE / d["schema_image"], OUT / d["schema_image"])
        rec = HERE / d["recording"]
        (OUT / rec.parent.name).mkdir(exist_ok=True)
        if not rec.exists():
            sys.exit(f"build: {rec} is missing; refusing to publish a page with an empty player")
        shutil.copy(rec, OUT / d["recording"])
    (OUT / "CNAME").write_text("artie.world\n")
    (OUT / ".nojekyll").write_text("")
    print(f"built {OUT}: index.html + {len(datasets)} dataset page(s)")


if __name__ == "__main__":
    main()
