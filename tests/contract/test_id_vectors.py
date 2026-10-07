"""
Golden agreement-id, clause-id and text-hash vectors shared with the frontend
(tests/js/ids.test.ts reads the same file). Every value is computed by the
contract's own code on the real SDK Keccak256.

Regenerate:  WRITE_VECTORS=1 python3 -m pytest tests/contract/test_id_vectors.py
"""
import json
import os
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
VECTORS = ROOT / "tests" / "js" / "id-vectors.json"
CONTRACT = str(ROOT / "contracts" / "ClauseAccord.py")

PARTY_A = "0x6276095FAEA15108740445ff277fdA8c304657F4"
PARTY_B = "0x10AaA763DB250e4856210Dfb91B57780F60e9879"
TITLES = ["Website build", "  Website   build\t", "Café　job", "Line one\u0085two"]
TEXTS = [
    "Confidentiality continues after the arrangement ends.",
    "  The licence lapses   when the arrangement\tends. ",
    "Café　survives",
    "\u001cOne clause\u001f",
    "﻿Audit 🧾",
    "Line one\u0085line two",
]


def build(contract):
    a, b = PARTY_A.lower(), PARTY_B.lower()
    agreements = []
    for t in TITLES:
        agreements.append({"title": t, "agreement_id": contract._agreement_id_for(a, b, contract._normalize_text(t.strip()))})
    aid = agreements[0]["agreement_id"]
    clauses = []
    for t in TEXTS:
        n = contract._normalize_text(t.strip())
        clauses.append({"text": t, "clause_id": contract._clause_id_for(aid, n), "text_hash": contract._hash(n)})
    return {"party_a": PARTY_A, "party_b": PARTY_B, "agreements": agreements, "clause_agreement_id": aid, "clauses": clauses}


def test_vectors_match_contract(direct_deploy):
    data = build(direct_deploy(CONTRACT))
    if os.environ.get("WRITE_VECTORS") == "1":
        VECTORS.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    assert json.loads(VECTORS.read_text(encoding="utf-8")) == data
