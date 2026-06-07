import json
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.database import supabase_client
from app.services.encryption import decrypt_api_key
from app.services.icp_engine import run_analysis

router = APIRouter()


# In-memory connection manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: dict[str, WebSocket] = {}

    async def connect(self, analysis_id: str, websocket: WebSocket):
        await websocket.accept()
        self.active_connections[analysis_id] = websocket

    def disconnect(self, analysis_id: str):
        self.active_connections.pop(analysis_id, None)

    async def send(self, analysis_id: str, data: dict):
        ws = self.active_connections.get(analysis_id)
        if ws:
            try:
                await ws.send_text(json.dumps(data))
            except Exception:
                self.disconnect(analysis_id)


manager = ConnectionManager()


@router.websocket("/analysis/{analysis_id}")
async def analysis_websocket(websocket: WebSocket, analysis_id: str):
    await manager.connect(analysis_id, websocket)

    try:
        # Fetch analysis from DB
        result = supabase_client.table("analyses").select("*").eq("id", analysis_id).single().execute()

        if not result.data:
            await websocket.send_text(json.dumps({"type": "error", "message": "Analysis not found"}))
            return

        analysis = result.data

        if analysis["status"] == "completed":
            await websocket.send_text(json.dumps({"type": "complete", "result": analysis.get("result")}))
            return

        if analysis["status"] != "pending":
            await websocket.send_text(json.dumps({"type": "status", "status": analysis["status"]}))
            return

        # Mark as running
        supabase_client.table("analyses").update({"status": "running"}).eq("id", analysis_id).execute()

        # Decrypt API key
        try:
            api_key = decrypt_api_key(analysis["encrypted_api_key"])
        except Exception as e:
            await websocket.send_text(json.dumps({"type": "error", "message": f"Failed to decrypt API key: {str(e)}"}))
            supabase_client.table("analyses").update({"status": "failed"}).eq("id", analysis_id).execute()
            return

        # Progress callback
        async def on_progress(stage: str, step: int, total: int, message: str):
            await manager.send(analysis_id, {
                "type": "progress",
                "stage": stage,
                "step": step,
                "total": total,
                "message": message,
            })

        # Run the engine
        try:
            analysis_result = await run_analysis(
                analysis_id=analysis_id,
                product_name=analysis["product_name"],
                problem=analysis["problem"],
                target_customer=analysis["target_customer"],
                solution=analysis["solution"],
                price_point=analysis["price_point"],
                openai_api_key=api_key,
                progress_callback=on_progress,
                ai_provider=analysis.get("ai_provider", "openai"),
            )

            # Save results
            supabase_client.table("analyses").update({
                "status": "completed",
                "result": analysis_result.model_dump(),
                "completed_at": "now()",
            }).eq("id", analysis_id).execute()

            await websocket.send_text(json.dumps({
                "type": "complete",
                "result": analysis_result.model_dump(),
            }))

        except Exception as e:
            error_msg = str(e)
            supabase_client.table("analyses").update({"status": "failed"}).eq("id", analysis_id).execute()
            await websocket.send_text(json.dumps({"type": "error", "message": error_msg}))

    except WebSocketDisconnect:
        manager.disconnect(analysis_id)
    except Exception as e:
        try:
            await websocket.send_text(json.dumps({"type": "error", "message": str(e)}))
        except Exception:
            pass
    finally:
        manager.disconnect(analysis_id)
