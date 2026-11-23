"""Merge recent public trading discussions into the Pages build. Titles are leads only."""
from datetime import datetime, timezone, timedelta
import json
import html
from pathlib import Path
import re
from urllib.request import Request, urlopen
import xml.etree.ElementTree as ET

destination = Path("apps/control-room/public/trade-news.json")
seed = json.loads(destination.read_text())
atom = "{http://www.w3.org/2005/Atom}"
url_pattern = re.compile(r"https://www\.reddit\.com/r/starcitizen/comments/[a-z0-9]+/[\w-]+/?$")
now = datetime.now(timezone.utc)

def fetch(url):
    with urlopen(Request(url, headers={"User-Agent": "STAM-Freight-Control/1.0 (public trade briefing)"}), timeout=12) as response:
        return response.read(1_000_000)

def tags(text, catalogue):
    normalized = " ".join(text.casefold().split())
    return [name for name in sorted(catalogue) if len(name) >= 4 and
            re.search(r"(?<!\w)"+re.escape(name.casefold())+r"(?!\w)", normalized)]

def recent(row):
    return (isinstance(row, dict) and isinstance(row.get("title"), str)
            and len(row["title"]) <= 300 and url_pattern.fullmatch(str(row.get("url", "")))
            and str(row.get("date", "")) >= (now-timedelta(days=45)).date().isoformat())

if __name__ == "__main__":
    articles = {}
    market = json.loads(Path("data/trade-market.json").read_text())
    terminals = {t["location"] for t in market["terminals"] if t.get("location")}
    commodities = {c["name"] for c in market["commodities"]}

    try:
        previous = json.loads(fetch("https://limmin3-sudo.github.io/stam-freight-control/trade-news.json"))
        articles.update((r["url"], r) for r in previous if recent(r))
    except (ValueError, OSError, TypeError):
        pass
    try:
        feed = ET.fromstring(fetch("https://www.reddit.com/r/starcitizen/search.rss?q=%28commodity+OR+trading%29+%28sold+OR+demand+OR+stock+OR+SCU%29&restrict_sr=1&sort=new&t=month"))
        for entry in feed.findall(atom+"entry"):
            link = entry.find(atom+"link")
            if link is None:
                continue
            title = entry.findtext(atom+"title") or ""
            date = (entry.findtext(atom+"published") or "")[:10]
            row = {"url": link.get("href", ""), "title": title, "en": title, "date": date}
            body = re.sub("<[^>]+>", " ", html.unescape(entry.findtext(atom+"content") or ""))
            row["places"] = tags(title+" "+body, terminals)
            row["goods"] = tags(title+" "+body, commodities)
            if recent(row) and re.search(r"trad|commodit|cargo|SCU|demand|stock", title, re.I):
                articles[row["url"]] = row
    except (ValueError, OSError, ET.ParseError):
        print("Community feed unavailable; retaining previously published and curated reports")
    for row in seed:
        articles[row["url"]] = row
    ordered = sorted(articles.values(), key=lambda row: row.get("date", ""), reverse=True)
    destination.write_text(json.dumps([r for r in ordered if r in seed or r in ordered[:25]], ensure_ascii=False, indent=2)+"\n")
