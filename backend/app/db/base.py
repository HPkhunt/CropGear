from typing import Any, Dict, List, Optional


class BaseRepository:
    async def get_by_id(self, _id: str) -> Optional[Dict[str, Any]]:
        raise NotImplementedError

    async def create(self, data: Dict[str, Any]) -> str:
        raise NotImplementedError

    async def update(self, _id: str, data: Dict[str, Any]) -> bool:
        raise NotImplementedError

    async def find(self, query: Dict[str, Any]) -> List[Dict[str, Any]]:
        raise NotImplementedError
