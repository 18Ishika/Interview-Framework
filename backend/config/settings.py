from pathlib import Path
from decouple import config
from .cloudinary_config import *


# Build paths inside the project like this: BASE_DIR / 'subdir'.
import os
BASE_DIR = Path(__file__).resolve().parent.parent

# --- Security ---
SECRET_KEY = config("SECRET_KEY")
DEBUG = True
ALLOWED_HOSTS = ["*"]

# --- Apps ---
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    "corsheaders",
    "rest_framework",
    "users",
    "cloudinary",
    "resume",
    "interview_sessions",
    "tech_int",
    "hr_int",
]

# --- Middleware ---
MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',  # must be FIRST
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'config.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'config.wsgi.application'

# --- Database (NeonDB) ---
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": config("DB_NAME"),
        "USER": config("DB_USER"),
        "PASSWORD": config("DB_PASSWORD"),
        "HOST": config("DB_HOST"),
        "PORT": config("DB_PORT"),
        "OPTIONS": {
            "connect_timeout": 10,
        },
        "CONN_MAX_AGE": 60,
    }
}

# --- DRF ---
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'users.authentication.ClerkAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
}

# --- CORS ---
CORS_ALLOWED_ORIGINS = [
    "http://localhost:5173",  # Vite
    "http://localhost:3000",  # CRA
]
CORS_ALLOW_CREDENTIALS = True

# --- Clerk ---
CLERK_FRONTEND_API = config("CLERK_FRONTEND_API")

# --- Password Validation ---
AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

# --- i18n ---
LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True

# --- Static ---
STATIC_URL = 'static/'
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

CSRF_TRUSTED_ORIGINS = [
    "http://localhost:5173",
]
CORS_ALLOW_ALL_ORIGINS = True  # temporary for development
MEDIA_URL = '/media/'
MEDIA_ROOT = os.path.join(BASE_DIR, 'media')

# --- Celery ---
CELERY_BROKER_URL = 'redis://localhost:6379/0'
CELERY_RESULT_BACKEND = 'redis://localhost:6379/0'
CELERY_ACCEPT_CONTENT = ['json']
CELERY_TASK_SERIALIZER = 'json'
CELERY_RESULT_SERIALIZER = 'json'
CELERY_TIMEZONE = TIME_ZONE