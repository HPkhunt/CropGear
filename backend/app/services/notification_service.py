from typing import Set
from fastapi import WebSocket
import json


class NotificationManager:
    def __init__(self):
        self.active_connections: Set[WebSocket] = set()

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.add(websocket)

    async def disconnect(self, websocket: WebSocket):
        self.active_connections.discard(websocket)

    async def broadcast(self, message: dict, user_id: str = None):
        """Broadcast a message to all connected clients, optionally filtering by user_id"""
        message_json = json.dumps(message)
        disconnected = set()
        
        for websocket in self.active_connections:
            try:
                # For now, send to all. In production, you'd filter by user_id
                await websocket.send_text(message_json)
            except Exception:
                # Connection is dead, mark for removal
                disconnected.add(websocket)
        
        # Clean up dead connections
        self.active_connections -= disconnected
