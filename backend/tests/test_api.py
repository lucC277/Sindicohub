import os

os.environ["DATABASE_URL"] = "sqlite:///:memory:"

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from backend import models, security
from backend.database import Base, get_db
from backend.main import app


@pytest.fixture()
def client():
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    Base.metadata.create_all(bind=engine)

    db = TestingSessionLocal()
    db.add_all(
        [
            models.Usuario(
                nome="Lucas Mendes",
                email="sindico@sindicohub.com",
                senha_hash=security.gerar_hash_senha("senhaSegura123"),
                perfil="sindico",
            ),
            models.Usuario(
                nome="Carlos Portaria",
                email="porteiro@sindicohub.com",
                senha_hash=security.gerar_hash_senha("senhaSegura123"),
                perfil="porteiro",
            ),
            models.Usuario(
                nome="Mariana Souza",
                email="mariana@sindicohub.com",
                senha_hash=security.gerar_hash_senha("senhaSegura123"),
                perfil="morador",
            ),
        ]
    )
    db.commit()
    db.close()

    def override_get_db():
        session = TestingSessionLocal()
        try:
            yield session
        finally:
            session.close()

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()
    Base.metadata.drop_all(bind=engine)


def auth_headers(client: TestClient, email: str, senha: str = "senhaSegura123") -> dict:
    resp = client.post("/login", json={"email": email, "senha": senha})
    assert resp.status_code == 200
    token = resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_healthcheck(client: TestClient):
    resp = client.get("/")
    assert resp.status_code == 200
    assert resp.json()["versao"] == "4.0.0"


def test_login_sucesso_e_erro(client: TestClient):
    ok = client.post(
        "/login",
        json={"email": "sindico@sindicohub.com", "senha": "senhaSegura123"},
    )
    assert ok.status_code == 200
    body = ok.json()
    assert body["token_type"] == "bearer"
    assert body["usuario"]["perfil"] == "sindico"
    assert len(body["access_token"].split(".")) == 3  # JWT válido

    fail = client.post(
        "/login",
        json={"email": "sindico@sindicohub.com", "senha": "errada"},
    )
    assert fail.status_code == 401
    assert fail.json()["status"] == "erro"


def test_rotas_protegidas_exigem_autenticacao(client: TestClient):
    assert client.get("/encomendas").status_code == 401
    assert client.get("/reservas").status_code == 401
    assert client.get("/avisos").status_code == 401
    assert client.get("/plantao").status_code == 401
    assert client.get("/ocorrencias").status_code == 401


def test_rbac_encomendas_e_baixa(client: TestClient):
    morador = auth_headers(client, "mariana@sindicohub.com")
    porteiro = auth_headers(client, "porteiro@sindicohub.com")

    payload = {
        "destinatario": "Mariana Souza",
        "apartamento": "101",
        "bloco": "A",
        "codigo_rastreio": "BR123456789SP",
    }

    # Morador não pode cadastrar encomenda
    assert client.post("/encomendas", json=payload, headers=morador).status_code == 403

    # Porteiro cadastra e dá baixa
    created = client.post("/encomendas", json=payload, headers=porteiro)
    assert created.status_code == 201
    encomenda_id = created.json()["id"]

    # Morador não pode dar baixa
    assert client.put(f"/encomendas/{encomenda_id}/retirar", headers=morador).status_code == 403

    baixa = client.put(f"/encomendas/{encomenda_id}/retirar", headers=porteiro)
    assert baixa.status_code == 200

    lista = client.get("/encomendas", headers=morador).json()
    assert lista[0]["retirado"] is True


def test_reservas_anti_conflito_e_rbac(client: TestClient):
    morador = auth_headers(client, "mariana@sindicohub.com")
    porteiro = auth_headers(client, "porteiro@sindicohub.com")

    reserva = {
        "area": "Salão de Festas",
        "morador_nome": "Mariana Souza",
        "apartamento": "101",
        "bloco": "A",
        "data_reserva": "2026-12-20",
        "periodo": "Noturno",
    }

    # Porteiro não cria reserva
    assert client.post("/reservas", json=reserva, headers=porteiro).status_code == 403

    # Primeira reserva passa
    first = client.post("/reservas", json=reserva, headers=morador)
    assert first.status_code == 201

    # Duplicada no mesmo dia/período retorna 409 Conflict
    dup = client.post("/reservas", json=reserva, headers=morador)
    assert dup.status_code == 409
    assert dup.json()["status"] == "erro"


def test_ocorrencias_e_rbac_status(client: TestClient):
    morador = auth_headers(client, "mariana@sindicohub.com")
    porteiro = auth_headers(client, "porteiro@sindicohub.com")
    sindico = auth_headers(client, "sindico@sindicohub.com")

    created = client.post(
        "/ocorrencias",
        json={
            "titulo": "Lâmpada queimada no 3º andar",
            "descricao": "Corredor próximo ao elevador de serviço sem iluminação.",
            "morador_nome": "Mariana Souza",
            "apartamento": "101",
            "bloco": "A",
        },
        headers=morador,
    )
    assert created.status_code == 201
    oc_id = created.json()["id"]

    # Apenas síndico altera status
    assert (
        client.put(f"/ocorrencias/{oc_id}/status", json={"status": "resolvido"}, headers=morador).status_code
        == 403
    )
    assert (
        client.put(f"/ocorrencias/{oc_id}/status", json={"status": "resolvido"}, headers=porteiro).status_code
        == 403
    )

    # Status inválido retorna 400
    assert (
        client.put(f"/ocorrencias/{oc_id}/status", json={"status": "invalido"}, headers=sindico).status_code
        == 400
    )

    # Síndico atualiza com sucesso
    ok = client.put(
        f"/ocorrencias/{oc_id}/status",
        json={"status": "resolvido"},
        headers=sindico,
    )
    assert ok.status_code == 200


def test_avisos_e_plantao_rbac(client: TestClient):
    morador = auth_headers(client, "mariana@sindicohub.com")
    porteiro = auth_headers(client, "porteiro@sindicohub.com")
    sindico = auth_headers(client, "sindico@sindicohub.com")

    aviso_payload = {
        "titulo": "Limpeza da caixa d'água",
        "conteudo": "Abastecimento interrompido das 08h às 13h.",
        "tipo": "comunicado",
        "fixado": True,
    }
    assert client.post("/avisos", json=aviso_payload, headers=morador).status_code == 403
    assert client.post("/avisos", json=aviso_payload, headers=porteiro).status_code == 403
    assert client.post("/avisos", json=aviso_payload, headers=sindico).status_code == 201

    plantao_payload = {
        "funcionario_nome": "Carlos Portaria",
        "cargo": "Porteiro Líder",
        "turno": "Diurno (07:00 - 19:00)",
        "telefone_contato": "Ramal 100 / (11) 98888-0001",
        "em_servico": True,
    }
    assert client.post("/plantao", json=plantao_payload, headers=morador).status_code == 403
    assert client.post("/plantao", json=plantao_payload, headers=porteiro).status_code == 201
    ativos = client.get("/plantao", headers=morador).json()
    assert len(ativos) == 1
    assert ativos[0]["telefone_contato"] == "Ramal 100 / (11) 98888-0001"
