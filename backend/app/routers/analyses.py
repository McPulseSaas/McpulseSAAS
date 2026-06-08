from fastapi import APIRouter, Depends, HTTPException
from app.models.schemas import CreateAnalysisRequest, AnalysisOut, AnalysisStatus
from app.middleware.auth import get_current_user
from app.database import supabase_client
from app.services.encryption import encrypt_api_key
import uuid
import logging

logger = logging.getLogger(__name__)

# Analysis is triggered via WebSocket /ws/analysis/{analysis_id}
# The client connects after creation to get real-time progress

router = APIRouter()


def check_usage_limit(user_id: str, plan: str) -> bool:
    """Returns True if user can create more analyses."""
    limits = {"free": 1, "starter": 5, "growth": 999999}
    limit = limits.get(plan, 1)
    result = supabase_client.table("analyses").select("id", count="exact").eq("user_id", user_id).execute()
    count = result.count or 0
    return count < limit


@router.post("/")
async def create_analysis(
    request: CreateAnalysisRequest,
    user: dict = Depends(get_current_user)
):
    user_id = user["sub"]
    logger.info(f"create_analysis called for user_id={user_id}")

    # Check supabase is available
    if supabase_client is None:
        logger.error("supabase_client is None — check SUPABASE_URL and SUPABASE_SERVICE_KEY secrets")
        raise HTTPException(500, detail="Database not configured. Check SUPABASE_URL and SUPABASE_SERVICE_KEY in HF Space secrets.")

    # TEST MODE: skip plan check and DB profile lookup
    if user_id == "00000000-0000-0000-0000-000000000000":
        plan = "growth"  # unlimited during testing
    else:
        profile = supabase_client.table("profiles").select("plan").eq("id", user_id).single().execute()
        plan = profile.data.get("plan", "free") if profile.data else "free"

        if not check_usage_limit(user_id, plan):
            raise HTTPException(402, detail="Analysis limit reached for your plan. Please upgrade.")

    # Encrypt the API key before storage
    try:
        encrypted_key = encrypt_api_key(request.idea.api_key)
        logger.info("API key encrypted successfully")
    except Exception as e:
        logger.error(f"Encryption failed: {e}")
        raise HTTPException(500, detail=f"Encryption error: {str(e)}")

    analysis_id = str(uuid.uuid4())

    # Insert analysis record
    try:
        result = supabase_client.table("analyses").insert({
            "id": analysis_id,
            "user_id": user_id,
            "product_name": request.idea.product_name,
            "problem": request.idea.problem,
            "target_customer": request.idea.target_customer,
            "solution": request.idea.solution,
            "price_point": request.idea.price_point,
            "encrypted_api_key": encrypted_key,
            "ai_provider": request.idea.ai_provider.value if hasattr(request.idea.ai_provider, 'value') else request.idea.ai_provider,
            "status": "pending",
        }).execute()
        logger.info(f"Analysis inserted: {analysis_id}, result: {result}")
    except Exception as e:
        logger.error(f"DB insert failed: {e}")
        raise HTTPException(500, detail=f"Database error: {str(e)}")

    # Increment usage count (skip for test user)
    if user_id != "00000000-0000-0000-0000-000000000000":
        supabase_client.rpc("increment_analyses_count", {"user_id": user_id}).execute()

    return {"analysis_id": analysis_id, "status": "pending"}


@router.get("/")
async def list_analyses(user: dict = Depends(get_current_user)):
    user_id = user["sub"]
    result = supabase_client.table("analyses").select(
        "id, product_name, status, created_at, result"
    ).eq("user_id", user_id).order("created_at", desc=True).execute()

    analyses = []
    for a in (result.data or []):
        item = {
            "id": a["id"],
            "product_name": a["product_name"],
            "status": a["status"],
            "created_at": a["created_at"],
            "validation_score": None,
        }
        if a.get("result") and isinstance(a["result"], dict):
            item["validation_score"] = a["result"].get("validation_score")
        analyses.append(item)

    return analyses


@router.get("/share/{share_token}")
async def get_shared_analysis(share_token: str):
    result = supabase_client.table("analyses").select("*").eq("share_token", share_token).single().execute()
    if not result.data:
        raise HTTPException(404, detail="Analysis not found")
    a = result.data
    return {
        "id": a["id"],
        "product_name": a["product_name"],
        "status": a["status"],
        "result": a.get("result"),
        "created_at": a["created_at"],
    }


@router.get("/{analysis_id}")
async def get_analysis(analysis_id: str, user: dict = Depends(get_current_user)):
    user_id = user["sub"]
    result = supabase_client.table("analyses").select("*").eq("id", analysis_id).eq("user_id", user_id).single().execute()
    if not result.data:
        raise HTTPException(404, detail="Analysis not found")
    a = result.data
    return {
        "id": a["id"],
        "user_id": a["user_id"],
        "product_name": a["product_name"],
        "status": a["status"],
        "result": a.get("result"),
        "share_token": a.get("share_token"),
        "created_at": a["created_at"],
        "completed_at": a.get("completed_at"),
    }


@router.delete("/{analysis_id}")
async def delete_analysis(analysis_id: str, user: dict = Depends(get_current_user)):
    user_id = user["sub"]
    result = supabase_client.table("analyses").delete().eq("id", analysis_id).eq("user_id", user_id).execute()
    if not result.data:
        raise HTTPException(404, detail="Analysis not found or unauthorized")
    return {"deleted": True}
