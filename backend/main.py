import os
from contextlib import asynccontextmanager
from typing import List, Optional

from fastapi import Depends, FastAPI, HTTPException, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from backend import models, schemas, security
from backend.database import engine, get_db

STATUS_OCORRENCIA_VALIDOS = {"aberto", "em_analise", "resolvido"}


@asynccontextmanager
async def lifespan(_app: FastAPI):
    models.Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(
    title="SíndicoHub - API Integrada",
    description="Plataforma SaaS de gestão integrada de condomínios residenciais",
    version="4.0.0",
    lifespan=lifespan,
)

default_origins = (
    "http://localhost:5173,"
    "http://127.0.0.1:5173,"
    "http://localhost:8080,"
    "http://127.0.0.1:8080,"
    "http://localhost"
)
cors_origins = [
    origin.strip()
    for origin in os.getenv("CORS_ORIGINS", default_origins).split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)

bearer_scheme = HTTPBearer(auto_error=False)


# --- DEPENDÊNCIAS DE AUTENTICAÇÃO E RBAC ---
def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> models.Usuario:
    if not credentials or not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Autenticação obrigatória. Faça login para continuar.",
        )

    payload = security.decodificar_token(credentials.credentials)
    if not payload or not payload.get("sub"):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Sessão inválida ou expirada. Faça login novamente.",
        )

    try:
        usuario_id = int(payload["sub"])
    except (TypeError, ValueError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token de autenticação inválido.",
        )

    usuario = db.query(models.Usuario).filter(models.Usuario.id == usuario_id).first()
    if not usuario:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuário não encontrado ou removido.",
        )
    return usuario


def require_roles(*allowed_roles: str):
    def _checker(usuario: models.Usuario = Depends(get_current_user)) -> models.Usuario:
        if usuario.perfil not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Seu perfil não possui permissão para executar esta ação.",
            )
        return usuario

    return _checker


# --- TRATAMENTO GLOBAL DE EXCEÇÕES ---
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "status": "erro_validacao",
            "mensagem": "Parâmetros inválidos enviados na requisição.",
            "detalhes": exc.errors(),
        },
    )


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={"status": "erro", "mensagem": exc.detail},
    )


@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"status": "erro_interno", "mensagem": "Erro interno no servidor."},
    )


# --- ROTAS BASE ---
@app.get("/")
def raiz():
    return {"mensagem": "API SíndicoHub Operacional", "versao": "4.0.0"}


# 1. Autenticação
@app.post("/login")
def login(dados: schemas.UsuarioLogin, db: Session = Depends(get_db)):
    usuario = db.query(models.Usuario).filter(models.Usuario.email == dados.email).first()
    if not usuario or not security.verificar_senha(dados.senha, usuario.senha_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="E-mail ou senha incorretos.",
        )

    token = security.criar_token_acesso(
        usuario_id=usuario.id,
        email=usuario.email,
        perfil=usuario.perfil,
    )

    return {
        "access_token": token,
        "token_type": "bearer",
        "usuario": {
            "id": usuario.id,
            "nome": usuario.nome,
            "email": usuario.email,
            "perfil": usuario.perfil,
        },
    }


# 2. Encomendas
@app.get("/encomendas", response_model=List[schemas.EncomendaResponse])
def listar_encomendas(
    _usuario: models.Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return db.query(models.Encomenda).order_by(models.Encomenda.id.desc()).all()


@app.post(
    "/encomendas",
    response_model=schemas.EncomendaResponse,
    status_code=status.HTTP_201_CREATED,
)
def criar_encomenda(
    dados: schemas.EncomendaCreate,
    _usuario: models.Usuario = Depends(require_roles("sindico", "porteiro")),
    db: Session = Depends(get_db),
):
    nova = models.Encomenda(**dados.model_dump())
    db.add(nova)
    db.commit()
    db.refresh(nova)
    return nova


@app.put("/encomendas/{encomenda_id}/retirar")
def dar_baixa_encomenda(
    encomenda_id: int,
    _usuario: models.Usuario = Depends(require_roles("sindico", "porteiro")),
    db: Session = Depends(get_db),
):
    encomenda = db.query(models.Encomenda).filter(models.Encomenda.id == encomenda_id).first()
    if not encomenda:
        raise HTTPException(status_code=404, detail="Encomenda não encontrada.")
    encomenda.retirado = True
    db.commit()
    return {"mensagem": "Encomenda marcada como retirada com sucesso."}


# 3. Mural Informativo & Regimento
@app.get("/avisos", response_model=List[schemas.AvisoResponse])
def listar_avisos(
    tipo: Optional[str] = None,
    _usuario: models.Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = db.query(models.Aviso)
    if tipo:
        query = query.filter(models.Aviso.tipo == tipo)
    return query.order_by(models.Aviso.fixado.desc(), models.Aviso.data_publicacao.desc()).all()


@app.post(
    "/avisos",
    response_model=schemas.AvisoResponse,
    status_code=status.HTTP_201_CREATED,
)
def criar_aviso(
    dados: schemas.AvisoCreate,
    _usuario: models.Usuario = Depends(require_roles("sindico")),
    db: Session = Depends(get_db),
):
    novo = models.Aviso(**dados.model_dump())
    db.add(novo)
    db.commit()
    db.refresh(novo)
    return novo


# 4. Escala de Plantão
@app.get("/plantao", response_model=List[schemas.EscalaPlantaoResponse])
def listar_plantoes(
    somente_ativos: bool = True,
    _usuario: models.Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = db.query(models.EscalaPlantao)
    if somente_ativos:
        query = query.filter(models.EscalaPlantao.em_servico.is_(True))
    return query.all()


@app.post(
    "/plantao",
    response_model=schemas.EscalaPlantaoResponse,
    status_code=status.HTTP_201_CREATED,
)
def cadastrar_plantao(
    dados: schemas.EscalaPlantaoCreate,
    _usuario: models.Usuario = Depends(require_roles("sindico", "porteiro")),
    db: Session = Depends(get_db),
):
    novo = models.EscalaPlantao(**dados.model_dump())
    db.add(novo)
    db.commit()
    db.refresh(novo)
    return novo


# 5. Motor Anti-Conflito de Reservas
@app.get("/reservas", response_model=List[schemas.ReservaAreaResponse])
def listar_reservas(
    _usuario: models.Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return db.query(models.ReservaArea).order_by(models.ReservaArea.data_reserva.asc()).all()


@app.post(
    "/reservas",
    response_model=schemas.ReservaAreaResponse,
    status_code=status.HTTP_201_CREATED,
)
def criar_reserva(
    dados: schemas.ReservaAreaCreate,
    _usuario: models.Usuario = Depends(require_roles("sindico", "morador")),
    db: Session = Depends(get_db),
):
    conflito = (
        db.query(models.ReservaArea)
        .filter(
            models.ReservaArea.area == dados.area,
            models.ReservaArea.data_reserva == dados.data_reserva,
            models.ReservaArea.periodo == dados.periodo,
        )
        .first()
    )

    if conflito:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"A área '{dados.area}' já está reservada para o dia {dados.data_reserva} no período {dados.periodo}.",
        )

    nova_reserva = models.ReservaArea(**dados.model_dump())
    db.add(nova_reserva)
    db.commit()
    db.refresh(nova_reserva)
    return nova_reserva


# 6. Ocorrências e Chamados
@app.get("/ocorrencias", response_model=List[schemas.OcorrenciaResponse])
def listar_ocorrencias(
    _usuario: models.Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return db.query(models.Ocorrencia).order_by(models.Ocorrencia.id.desc()).all()


@app.post(
    "/ocorrencias",
    response_model=schemas.OcorrenciaResponse,
    status_code=status.HTTP_201_CREATED,
)
def registrar_ocorrencia(
    dados: schemas.OcorrenciaCreate,
    _usuario: models.Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    nova = models.Ocorrencia(**dados.model_dump())
    db.add(nova)
    db.commit()
    db.refresh(nova)
    return nova


@app.put("/ocorrencias/{ocorrencia_id}/status")
def atualizar_status_ocorrencia(
    ocorrencia_id: int,
    dados: schemas.OcorrenciaUpdateStatus,
    _usuario: models.Usuario = Depends(require_roles("sindico")),
    db: Session = Depends(get_db),
):
    if dados.status not in STATUS_OCORRENCIA_VALIDOS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Status inválido. Utilize: aberto, em_analise ou resolvido.",
        )

    ocorrencia = db.query(models.Ocorrencia).filter(models.Ocorrencia.id == ocorrencia_id).first()
    if not ocorrencia:
        raise HTTPException(status_code=404, detail="Ocorrência não encontrada.")
    ocorrencia.status = dados.status
    db.commit()
    return {"mensagem": "Status da ocorrência atualizado com sucesso."}
