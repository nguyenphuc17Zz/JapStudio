async def test_health_returns_ok(client) -> None:
    response = await client.get("/health")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok"
    assert body["app"] == "AI Japanese Writing Tutor API"
    assert body["environment"] == "test"
    assert body["database"] == "unchecked"


async def test_health_with_db_check(client) -> None:
    response = await client.get("/health?check_db=true")
    assert response.status_code == 200
    assert response.json()["database"] == "ok"


async def test_health_validation_error_envelope(client) -> None:
    response = await client.get("/health?check_db=notabool")
    assert response.status_code == 422
    body = response.json()
    assert body["error"]["code"] == "validation_error"
    assert "details" in body["error"]


async def test_unknown_route_returns_error_envelope(client) -> None:
    response = await client.get("/api/v1/does-not-exist")
    assert response.status_code == 404
    body = response.json()
    assert body["error"]["code"] == "http_error"
    assert body["error"]["message"]


async def test_root_returns_app_info(client) -> None:
    response = await client.get("/")
    assert response.status_code == 200
    assert response.json()["app"] == "AI Japanese Writing Tutor API"
