from django.core.cache import cache

CACHE_TTL_PROFILE = 900  # 15 minutes
CACHE_TTL_HISTORY = 300  # 5 minutes

def get_profile_cache_key(user_id):
    return f"user_profile_details_{user_id}"

def get_history_cache_key(user_id):
    return f"user_interview_history_{user_id}"

def invalidate_user_profile_cache(user_id):
    if user_id:
        cache.delete(get_profile_cache_key(user_id))

def invalidate_user_history_cache(user_id):
    if user_id:
        cache.delete(get_history_cache_key(user_id))

def invalidate_user_caches(user_id):
    invalidate_user_profile_cache(user_id)
    invalidate_user_history_cache(user_id)
