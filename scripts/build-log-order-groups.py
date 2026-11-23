"""Regenerate observed-order bindings from the pinned public scunpacked-data GitHub tarball."""
import json
from pathlib import Path
import sys
import tarfile

ROOT = Path(__file__).resolve().parents[1]
COMMIT = "3cc8072b24df2a2d71eb6207708e2039f909b342"
BUILD = "13165946"


def bindings(raw, definition):
    orders = raw.get("HaulingOrders") or []
    primary = definition["rules"].get("orders", [])
    if not orders or len(primary) != len(orders) or raw.get("NotForRelease") or raw.get("WorkInProgress"):
        return None
    if any(i != item.get("orderIndex") or (item["name"], item["kind"]) != (o.get("Name"), o.get("Kind"))
           for i, (item, o) in enumerate(zip(primary, orders))):
        return None
    objectives = {o["Id"] for o in raw.get("ObjectiveTokens", [])
                  if o.get("HandlerType") == "ObjectiveHandler_Hauling" and o.get("Id")}
    if len(objectives) != 1:
        return None
    result = {"objective": objectives.pop(), "items": [o["Name"] for o in orders]}
    pools = raw.get("LocationPools", {})
    for role, purpose in (("pickup", "Location"), ("dropoff", "Destination")):
        groups = []
        for order in orders:
            name = order.get(role.title() + "Pool")
            pool = pools.get(name, {})
            groups.append(name if str(pool.get("Purpose", "")).startswith(purpose) else None)
        result[role] = groups
    return result if any(result["pickup"] + result["dropoff"]) else None


def main(archive):
    catalog = json.loads((ROOT / "data/log-mission-index.json").read_text())
    definitions = {d["id"]: d for d in catalog["definitions"] if d["released"] and not d["notForRelease"]}
    found = {}
    prefix = f"scunpacked-data-{COMMIT}/contracts/"
    with tarfile.open(archive, "r|gz") as tar:
        for item in tar:
            if not item.isfile() or not item.name.startswith(prefix):
                continue
            identifier = Path(item.name).stem
            if identifier not in definitions:
                continue
            raw = json.load(tar.extractfile(item))
            if raw["UUID"] != identifier:
                raise ValueError("Contract identity mismatch")
            profile = bindings(raw, definitions[identifier])
            if profile:
                found[identifier] = profile
    if not found:
        raise ValueError("No matching contracts in the pinned archive")
    source = f"https://github.com/StarCitizenWiki/scunpacked-data/tree/{COMMIT}/contracts"
    output = {"source": source, "build": BUILD, "definitions": dict(sorted(found.items()))}
    (ROOT / "data/log-order-groups.json").write_text(json.dumps(output, ensure_ascii=False, separators=(",", ":")) + "\n")
    print(f"{len(found)} verified order profiles from {len(definitions)} released definitions")


if __name__ == "__main__":
    main(sys.argv[1])
