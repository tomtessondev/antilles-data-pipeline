"""Build dashboard/data/communes.json from the IGN commune outlines.

Source: github.com/gregoiredavid/france-geojson (IGN Admin Express, Licence Ouverte),
files departements/971-guadeloupe/communes-971-guadeloupe.geojson and
departements/972-martinique/communes-972-martinique.geojson. Download both into one
directory, then run:

    python scripts/prepare_communes.py <download_dir> dashboard/data/communes.json

Coordinates are rounded to 4 decimals (about 10 m), far below what the map can show.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Any

SOURCES = {
    "communes-971-guadeloupe.geojson": "Guadeloupe",
    "communes-972-martinique.geojson": "Martinique",
}


def _round(coords: Any) -> Any:
    if isinstance(coords[0], int | float):
        return [round(coords[0], 4), round(coords[1], 4)]
    return [_round(c) for c in coords]


def main(source_dir: Path, out_path: Path) -> None:
    features = []
    for filename, territory in SOURCES.items():
        data = json.loads((source_dir / filename).read_text(encoding="utf-8"))
        for feature in data["features"]:
            geometry = feature["geometry"]
            features.append(
                {
                    "type": "Feature",
                    "properties": {
                        "code": feature["properties"]["code"],
                        "name": feature["properties"]["nom"],
                        "territory": territory,
                    },
                    "geometry": {
                        "type": geometry["type"],
                        "coordinates": _round(geometry["coordinates"]),
                    },
                }
            )
    collection = {"type": "FeatureCollection", "features": features}
    out_path.write_text(
        json.dumps(collection, ensure_ascii=False, separators=(",", ":")), encoding="utf-8"
    )
    print(f"Wrote {len(features)} communes to {out_path}")


if __name__ == "__main__":
    main(Path(sys.argv[1]), Path(sys.argv[2]))
