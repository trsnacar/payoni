from pydantic import BaseModel, EmailStr, field_validator
import re


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str

    # Şirket bilgileri
    business_name: str
    company_type: str
    tax_id: str
    tax_office: str
    trade_registry_no: str
    company_address: str

    # Yetkili kişi
    authorized_name: str
    authorized_title: str
    authorized_tc: str
    authorized_phone: str

    phone: str | None = None

    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Şifre en az 8 karakter olmalıdır")
        return v

    @field_validator("tax_id")
    @classmethod
    def validate_tax_id(cls, v: str) -> str:
        if not re.match(r"^\d{10}$", v.strip()):
            raise ValueError("Vergi numarası 10 haneli sayı olmalıdır")
        return v.strip()

    @field_validator("authorized_tc")
    @classmethod
    def validate_tc(cls, v: str) -> str:
        if not re.match(r"^\d{11}$", v.strip()):
            raise ValueError("TC kimlik numarası 11 haneli sayı olmalıdır")
        return v.strip()


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int  # saniye


class RefreshRequest(BaseModel):
    refresh_token: str
