import asyncio

import redis.asyncio as redis_async
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.core.config import settings
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
    redis_client = redis_async.from_url(settings.redis_url, decode_responses=True)
    pubsub = redis_client.pubsub()
    channel = f"agent_events:{user_id}"
    await pubsub.subscribe(channel)

    try:
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

        while True:
            message = await pubsub.get_message(ignore_subscribe_messages=True, timeout=1.0)
            if message and message.get("data"):
                await websocket.send_text(str(message["data"]))
            await asyncio.sleep(0.1)
    except WebSocketDisconnect:
        return
    finally:
        await pubsub.unsubscribe(channel)
        await pubsub.aclose()
        await redis_client.aclose()
