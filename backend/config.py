import os

from dotenv import load_dotenv

load_dotenv()


def _database_uri():
    uri = os.environ.get('DATABASE_URL', 'sqlite:///dev.db')
    # Render/Heroku-style URLs use postgres://, SQLAlchemy 1.4+/psycopg2 need postgresql://
    if uri.startswith('postgres://'):
        uri = uri.replace('postgres://', 'postgresql://', 1)
    return uri


class Config:
    SQLALCHEMY_DATABASE_URI = _database_uri()
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'dev-secret-change-me')
    JWT_EXPIRY_DAYS = int(os.environ.get('JWT_EXPIRY_DAYS', '30'))
    ALLOWED_ORIGINS = [
        origin.strip()
        for origin in os.environ.get(
            'ALLOWED_ORIGINS',
            'https://robertkutwa.github.io,http://localhost:5500,http://127.0.0.1:5500'
        ).split(',')
        if origin.strip()
    ]
