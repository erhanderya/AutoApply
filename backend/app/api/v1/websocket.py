from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.core.security import safe_decode_token


router = APIRouter(tags=["websocket"])

AGENT_NAMES = ("scout", "analyzer", "writer", "apply", "tracker")


@router.websocket("/ws/agent-feed")
async def websocket_agent_feed(websocket: WebSocket) -> None:
    token = websocket.query_params.get("token")
    user_id = safe_decode_token(token) if token else None

    if user_id is None:
        await websocket.close(code=1008)
        return

    await websocket.accept()

    for agent_name in AGENT_NAMES:
        await websocket.send_json(
            {
                "type": "agent_status",
                "payload": {
                    "agentName": agent_name,
                    "status": "idle",
                },
            }
        )

    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        return
