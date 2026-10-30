from django.apps import apps
from django.contrib.auth import get_user_model
from django.db.models.signals import post_delete, post_save

from interview_sessions.models import CodingRound, HrRound, Session, TechnicalRound
from .utils.cache_utils import invalidate_user_caches

User = get_user_model()


def _user_id_of(instance):
    if isinstance(instance, User):
        return instance.pk
    if isinstance(instance, Session):
        return instance.user_id
    if getattr(instance, "user_id", None):          # education, experience, etc.
        return instance.user_id
    session = getattr(instance, "session", None)     # CodingRound / TechnicalRound / HrRound
    return getattr(session, "user_id", None)


def _invalidate(sender, instance, **kwargs):
    user_id = _user_id_of(instance)
    if not user_id:
        return
    platform_id = instance.platform_id if isinstance(instance, User) else None
    invalidate_user_caches(user_id, platform_id)


# interview models
INTERVIEW_MODELS = [Session, CodingRound, TechnicalRound, HrRound]

# every model in the users app (User, education, experience, projects, skills...)
USER_APP_MODELS = list(apps.get_app_config("users").get_models())

for model in INTERVIEW_MODELS + USER_APP_MODELS:
    post_save.connect(_invalidate, sender=model, weak=False,
                      dispatch_uid=f"inv_save_{model._meta.label}")
    post_delete.connect(_invalidate, sender=model, weak=False,
                        dispatch_uid=f"inv_del_{model._meta.label}")