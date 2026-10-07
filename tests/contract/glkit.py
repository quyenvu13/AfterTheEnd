"""
Small helpers shared by the Direct Mode tests: address formatting, Keccak-256,
Python whitespace normalization and the one-test-per-revert-string check.
"""

import ast
import json
import re
from pathlib import Path

from Crypto.Hash import keccak as _keccak


def hx(addr) -> str:
    if isinstance(addr, (bytes, bytearray)):
        return "0x" + bytes(addr).hex()
    if hasattr(addr, "as_hex"):
        return addr.as_hex
    return str(addr)


def lo(addr) -> str:
    return hx(addr).lower()


def J(raw):
    return json.loads(raw)


def keccak_hex(text: str) -> str:
    k = _keccak.new(digest_bits=256)
    k.update(text.encode("utf-8"))
    return k.hexdigest()


def norm(text: str) -> str:
    return " ".join(text.split())


def source_revert_strings(contract_path: str):
    src = Path(contract_path).read_text(encoding="utf-8")
    return set(re.findall(r'UserError\(\s*"([^"]+)"\s*\)', src))


def owned_revert_strings(test_file: str, namespace: dict):
    """The first expect_revert string inside each test_revert_* function is the string it owns."""
    tree = ast.parse(Path(test_file).read_text(encoding="utf-8"))
    owned = {}
    for node in tree.body:
        if isinstance(node, ast.FunctionDef) and node.name.startswith("test_revert_"):
            calls = [c for c in ast.walk(node)
                     if isinstance(c, ast.Call) and getattr(c.func, "attr", "") == "expect_revert" and c.args]
            calls.sort(key=lambda c: (c.lineno, c.col_offset))
            value = None
            if calls:
                arg = calls[0].args[0]
                if isinstance(arg, ast.Constant):
                    value = arg.value
                elif isinstance(arg, ast.Name):
                    value = namespace.get(arg.id)
            owned[node.name] = value
    return owned


def check_revert_coverage(contract_path: str, test_file: str, namespace: dict, expected_count: int):
    strings = source_revert_strings(contract_path)
    assert len(strings) == expected_count, sorted(strings)
    owned = owned_revert_strings(test_file, namespace)
    assert None not in owned.values(), owned
    per_string = {}
    for test, s in owned.items():
        per_string.setdefault(s, []).append(test)
    assert sorted(set(per_string) - strings) == [], "tests own strings the contract does not have"
    assert sorted(strings - set(per_string)) == [], "revert strings without a dedicated test"
    for s, tests in per_string.items():
        assert len(tests) == 1, (s, tests)
