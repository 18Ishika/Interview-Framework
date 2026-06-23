import json
import time
import requests
import jwt
from jwt.algorithms import RSAAlgorithm
from django.conf import settings
from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed
from .models import User
from datetime import timedelta

_jwks_cache = None
_jwks_cache_time = None
JWKS_CACHE_TTL = 3600  # 1 hour

def get_clerk_jwks():
    global _jwks_cache, _jwks_cache_time
    
    if _jwks_cache and _jwks_cache_time and (time.time() - _jwks_cache_time < JWKS_CACHE_TTL):
        return _jwks_cache
    
    url = f"{settings.CLERK_FRONTEND_API}/.well-known/jwks.json"
    try:
        resp = requests.get(url, timeout=5)
        resp.raise_for_status()
        _jwks_cache = resp.json()
        _jwks_cache_time = time.time()
        return _jwks_cache
    except Exception as e:
        raise AuthenticationFailed(f"Could not fetch Clerk JWKS: {e}")

def verify_clerk_token(token):
    jwks = get_clerk_jwks()
    
    try:
        header = jwt.get_unverified_header(token)
    except Exception:
        raise AuthenticationFailed("Invalid token header")
    
    kid = header.get("kid")
    if not kid:
        raise AuthenticationFailed("Token missing kid")

    key_data = next((k for k in jwks["keys"] if k["kid"] == kid), None)
    if not key_data:
        raise AuthenticationFailed("No matching key found in JWKS")

    public_key = RSAAlgorithm.from_jwk(json.dumps(key_data))

    try:
        payload = jwt.decode(
            token,
            public_key,
            algorithms=["RS256"],
            options={"verify_aud": False},
            leeway=timedelta(seconds=60)  # moved outside options
        )
    except jwt.ExpiredSignatureError:
        raise AuthenticationFailed("Token has expired")
    except jwt.InvalidTokenError as e:
        raise AuthenticationFailed(f"Invalid token: {e}")

    return payload


class ClerkAuthentication(BaseAuthentication):
    def authenticate(self, request):
        auth_header = request.headers.get("Authorization", "")
        
        if not auth_header.startswith("Bearer "):
            return None  # No token — let permission classes handle it

        token = auth_header.split(" ")[1]


        payload = verify_clerk_token(token)
        print(payload)

        clerk_user_id = payload.get("sub")
        if not clerk_user_id:
            raise AuthenticationFailed("Token missing sub claim")

        # Sync user to your DB
        user, created = User.objects.get_or_create(clerk_user_id=clerk_user_id,defaults={"email": payload.get("email"), "first_name": payload.get("first_name"),"last_name": payload.get("last_name")})
        if not created:
            user.email = payload.get("email") or user.email
            user.first_name = payload.get("first_name") or user.first_name
            user.last_name = payload.get("last_name") or user.last_name
            user.save()

        return (user, token)