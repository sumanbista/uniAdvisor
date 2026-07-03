from fastapi.testclient import TestClient

from backend.app.main import app


def test_health_endpoint_is_lightweight_and_ok() -> None:
    with TestClient(app) as client:
        response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
