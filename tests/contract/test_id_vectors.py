"""
Golden id vectors shared with the frontend (tests/js/ids.test.ts reads the same
file). Ids are computed here by the deployed contract code itself
(_agreement_id_for / _clause_id_for running on the real SDK Keccak256), so the
JS implementation is checked against the contract, not against a second copy.

Regenerate:  WRITE_VECTORS=1 python3.13 -m pytest tests/contract/test_id_vectors.py
"""
import json
import os
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
VECTORS = ROOT / "tests" / "js" / "id-vectors.json"
CONTRACT = str(ROOT / "contracts" / "SurvivalGate.py")

AUTHOR = "0x3065e31b1d993d7c0d59e6786844cba56780b2d3"
OTHER = "0x1111111111111111111111111111111111111111"
TEXTS = [
    "Nothing in the closing of this arrangement releases either party from what is already owed.",
    "Once we close, neither party owes the other anything further.",
    "  We remain\tanswerable\nfor anything done while the work was live.  ",
    "\u001cThe exclusivity applies only while the work is live.\u001f",
    "Access\u0085is withdrawn at termination.",
    "﻿Support stops on the closing date.",
    "Confidentialité — continues　after the arrangement ends. \U0001F512",
]


def build(contract):
    aid = contract._agreement_id_for(AUTHOR, OTHER)
    rows = []
    for t in TEXTS:
        norm = contract._normalize_text(t.strip())
        rows.append({"text": t, "normalized": norm, "py_len": len(norm),
                     "clause_id": contract._clause_id_for(aid, norm)})
    return {"author": AUTHOR, "other": OTHER, "agreement_id": aid, "clauses": rows}


def test_vectors_match_contract(direct_deploy):
    data = build(direct_deploy(CONTRACT))
    if os.environ.get("WRITE_VECTORS") == "1":
        VECTORS.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    assert json.loads(VECTORS.read_text(encoding="utf-8")) == data
