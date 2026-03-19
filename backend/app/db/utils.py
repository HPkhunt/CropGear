from __future__ import annotations

from typing import Any, Dict, Iterable, List, Optional, Tuple

from bson import ObjectId


def to_object_id(value: Any) -> Optional[ObjectId]:
    if value is None:
        return None
    if isinstance(value, ObjectId):
        return value
    try:
        return ObjectId(str(value))
    except Exception:
        return None


def split_object_ids(values: Iterable[Any]) -> Tuple[List[ObjectId], List[str]]:
    object_ids: List[ObjectId] = []
    string_ids: List[str] = []
    for value in values:
        if value is None:
            continue
        oid = to_object_id(value)
        if oid is not None:
            object_ids.append(oid)
        else:
            string_ids.append(str(value))
    return object_ids, string_ids


def _normalize_value(value: Any) -> Any:
    if isinstance(value, ObjectId):
        return str(value)
    if isinstance(value, dict):
        return {key: _normalize_value(val) for key, val in value.items()}
    if isinstance(value, list):
        return [_normalize_value(item) for item in value]
    return value


def serialize_doc(doc: Optional[Dict[str, Any]]) -> Dict[str, Any]:
    if not doc:
        return {}
    data = {}
    for key, value in dict(doc).items():
        if key == "_id":
            continue
        data[key] = _normalize_value(value)
    oid = doc.get("_id")
    if oid is not None:
        data["id"] = str(oid)
    return data


def serialize_docs(docs: Iterable[Dict[str, Any]]) -> List[Dict[str, Any]]:
    return [serialize_doc(doc) for doc in docs]
