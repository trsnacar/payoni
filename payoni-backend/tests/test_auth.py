"""Auth endpoint testleri: register, login, şifre değiştirme."""
import pytest
from httpx import AsyncClient


REGISTER_PAYLOAD = {
    "email": "test@payoni.com",
    "password": "TestPass123",
    "business_name": "Test İşletme",
}


@pytest.mark.asyncio
async def test_register_success(client: AsyncClient):
    resp = await client.post("/api/v1/auth/register", json=REGISTER_PAYLOAD)
    assert resp.status_code == 201
    data = resp.json()
    assert "access_token" in data


@pytest.mark.asyncio
async def test_register_duplicate_email(client: AsyncClient):
    await client.post("/api/v1/auth/register", json=REGISTER_PAYLOAD)
    resp = await client.post("/api/v1/auth/register", json=REGISTER_PAYLOAD)
    assert resp.status_code == 409


@pytest.mark.asyncio
async def test_login_success(client: AsyncClient):
    await client.post("/api/v1/auth/register", json=REGISTER_PAYLOAD)
    resp = await client.post("/api/v1/auth/login", json={
        "email": REGISTER_PAYLOAD["email"],
        "password": REGISTER_PAYLOAD["password"],
    })
    assert resp.status_code == 200
    assert "access_token" in resp.json()


@pytest.mark.asyncio
async def test_login_wrong_password(client: AsyncClient):
    await client.post("/api/v1/auth/register", json=REGISTER_PAYLOAD)
    resp = await client.post("/api/v1/auth/login", json={
        "email": REGISTER_PAYLOAD["email"],
        "password": "WrongPassword",
    })
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_change_password(client: AsyncClient):
    reg = await client.post("/api/v1/auth/register", json=REGISTER_PAYLOAD)
    token = reg.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    resp = await client.put("/api/v1/merchants/me/password", json={
        "current_password": REGISTER_PAYLOAD["password"],
        "new_password": "NewPass456!",
    }, headers=headers)
    assert resp.status_code == 200

    # Yeni şifre ile login
    login_resp = await client.post("/api/v1/auth/login", json={
        "email": REGISTER_PAYLOAD["email"],
        "password": "NewPass456!",
    })
    assert login_resp.status_code == 200


@pytest.mark.asyncio
async def test_change_password_wrong_current(client: AsyncClient):
    reg = await client.post("/api/v1/auth/register", json=REGISTER_PAYLOAD)
    token = reg.json()["access_token"]

    resp = await client.put("/api/v1/merchants/me/password", json={
        "current_password": "WrongCurrent",
        "new_password": "NewPass456!",
    }, headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 400
