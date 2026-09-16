from flask import Flask, jsonify
from flask_cors import CORS

from auth import auth_bp
from config import Config
from models import db
from progress import progress_bp


def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    db.init_app(app)
    CORS(app, resources={r'/api/*': {'origins': app.config['ALLOWED_ORIGINS']}})

    app.register_blueprint(auth_bp)
    app.register_blueprint(progress_bp)

    with app.app_context():
        db.create_all()

    @app.get('/api/health')
    def health():
        return jsonify({'status': 'ok'}), 200

    @app.get('/')
    def root():
        return jsonify({
            'service': 'epi-stats-api',
            'status': 'ok',
            'endpoints': ['/api/health', '/api/auth/register', '/api/auth/login', '/api/auth/me', '/api/progress']
        }), 200

    return app


app = create_app()

if __name__ == '__main__':
    app.run(debug=True, port=5000)
