from flask import Blueprint, jsonify, request

from auth_utils import require_auth
from models import Progress, db

progress_bp = Blueprint('progress', __name__, url_prefix='/api/progress')


def _progress_map(user_id):
    rows = Progress.query.filter_by(user_id=user_id).all()
    return {row.lecture_id: True for row in rows}


@progress_bp.get('')
@require_auth
def get_progress():
    return jsonify({'progress': _progress_map(request.user_id)}), 200


@progress_bp.put('/<lecture_id>')
@require_auth
def set_progress(lecture_id):
    data = request.get_json(silent=True) or {}
    done = bool(data.get('done'))

    existing = Progress.query.filter_by(user_id=request.user_id, lecture_id=lecture_id).first()
    if done and not existing:
        db.session.add(Progress(user_id=request.user_id, lecture_id=lecture_id))
        db.session.commit()
    elif not done and existing:
        db.session.delete(existing)
        db.session.commit()

    return jsonify({'progress': _progress_map(request.user_id)}), 200
