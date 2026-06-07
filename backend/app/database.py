from supabase import create_client, Client
from app.config import settings
import logging

logger = logging.getLogger(__name__)


def get_supabase() -> Client:
    if not settings.supabase_url or not settings.supabase_service_key:
        logger.error("SUPABASE_URL or SUPABASE_SERVICE_KEY not set!")
        raise RuntimeError("Supabase not configured. Set SUPABASE_URL and SUPABASE_SERVICE_KEY.")
    return create_client(settings.supabase_url, settings.supabase_service_key)


try:
    supabase_client: Client = get_supabase()
except Exception as e:
    logger.error(f"Failed to initialize Supabase client: {e}")
    supabase_client = None  # type: ignore
