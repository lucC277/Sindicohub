import os
from datetime import datetime, timedelta, timezone
from typing import Optional
import bcrypt
import jwt

JWT_SECRET_KEY = os.getenv(
    "JWT_SECRET_KEY",
    "sindicohub-dev-secret-key-change-in-production-2026",
)
JWT_ALGORITHM = "HS256"
JWT_EXPIRE_HOURS = int(os.getenv("JWT_EXPIRE_HOURS", "12"))


def gerar_hash_senha(senha: str) -> str:
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(senha.encode("utf-8"), salt).decode("utf-8")


def verificar_senha(senha_pura: str, senha_hash: str) -> bool:
    try:
        senha_bytes = senha_pura.encode("utf-8")
        hash_bytes = senha_hash.encode("utf-8") if isinstance(senha_hash, str) else senha_hash
        return bcrypt.checkpw(senha_bytes, hash_bytes)
    except Exception:
        return False


def criar_token_acesso(usuario_id: int, email: str, perfil: str) -> str:
    agora = datetime.now(timezone.utc)
    payload = {
        "sub": str(usuario_id),
        "email": email,
        "perfil": perfil,
        "iat": agora,
        "exp": agora + timedelta(hours=JWT_EXPIRE_HOURS),
    }
    return jwt.encode(payload, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)


def decodificar_token(token: str) -> Optional[dict]:
    try:
        return jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
    except jwt.PyJWTError:
        return None
