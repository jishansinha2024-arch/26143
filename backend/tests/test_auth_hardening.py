"""Unit tests (no server/DB needed) for the login/guest hardening."""
import os
import sys
from pathlib import Path

os.environ.setdefault("MONGO_URL", "mongodb://localhost:27017")
os.environ.setdefault("DB_NAME", "varuna_test")
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from auth import hash_password, jwt_secret, verify_password  # noqa: E402


def test_verify_password_missing_hash_is_false_not_error():
    assert verify_password("whatever1", None) is False
    assert verify_password("whatever1", "") is False


def test_verify_password_garbage_hash_is_false_not_error():
    assert verify_password("whatever1", "not-a-bcrypt-hash") is False


def test_hash_roundtrip():
    h = hash_password("correct-horse-1")
    assert verify_password("correct-horse-1", h) is True
    assert verify_password("wrong-horse-1", h) is False


def test_jwt_secret_falls_back_instead_of_raising(monkeypatch):
    monkeypatch.delenv("JWT_SECRET", raising=False)
    assert len(jwt_secret()) >= 32
