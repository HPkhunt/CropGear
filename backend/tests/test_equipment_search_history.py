import pytest
from pydantic import ValidationError

from app.api.v1.endpoints.equipment import (
    SearchHistorySaveRequest,
    get_search_history,
    save_search_history,
)


@pytest.mark.asyncio
async def test_search_history_persists_full_filter_presets(db):
    current_user = {"sub": "farmer-1", "role": "farmer"}
    request = SearchHistorySaveRequest(
        query="",
        category="tractor",
        results_count=14,
        filters={
            "sort": "price_low",
            "available_only": True,
            "owner_verified_only": True,
            "min_rate": 120,
            "max_rate": 320,
            "latitude": 41.5868,
            "longitude": -93.625,
            "radius_km": 40,
            "location_label": "Des Moines, IA",
            "ignored": "skip-me",
        },
    )

    result = await save_search_history(request=request, current_user=current_user, db=db)
    history = await get_search_history(current_user=current_user, limit=5, db=db)

    assert result["ok"] is True
    assert len(history["history"]) == 1
    assert history["history"][0]["query"] == ""
    assert history["history"][0]["category"] == "tractor"
    assert history["history"][0]["results_count"] == 14
    assert history["history"][0]["filters"] == {
        "sort": "price_low",
        "available_only": True,
        "owner_verified_only": True,
        "min_rate": 120.0,
        "max_rate": 320.0,
        "latitude": 41.5868,
        "longitude": -93.625,
        "radius_km": 40.0,
        "location_label": "Des Moines, IA",
    }


def test_search_history_requires_keyword_category_or_filters():
    with pytest.raises(ValidationError):
        SearchHistorySaveRequest(query="   ", category=None, filters={})
