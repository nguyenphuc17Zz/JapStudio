import pytest


@pytest.mark.asyncio
async def test_furigana_batch_returns_tokens_per_key(client):
    res = await client.post(
        "/api/v1/immersion/furigana",
        json={"texts": [
            {"key": "1", "text": "日本語を勉強します。"},
            {"key": "2", "text": "こんにちは。"},
        ]},
    )
    assert res.status_code == 200
    data = res.json()
    assert len(data["items"]) == 2
    by_key = {item["key"]: item for item in data["items"]}
    for key in ("1", "2"):
        tokens = by_key[key]["tokens"]
        assert len(tokens) > 0
        joined = "".join(t["text"] for t in tokens)
        assert len(joined) > 0
        for t in tokens:
            assert "text" in t and "is_kanji" in t


@pytest.mark.asyncio
async def test_furigana_batch_empty_text_falls_back(client):
    res = await client.post(
        "/api/v1/immersion/furigana",
        json={"texts": [{"key": "9", "text": ""}]},
    )
    assert res.status_code == 200
    assert res.json()["items"][0]["tokens"] == []
