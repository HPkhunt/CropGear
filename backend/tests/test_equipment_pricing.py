import pytest

from app.api.v1.endpoints.equipment import PredictivePricingRequest, predictive_pricing


@pytest.mark.asyncio
async def test_predictive_pricing_returns_market_guidance(db):
    await db.equipment.insert_many(
        [
            {
                "_id": "eq-1",
                "category": "tractor",
                "daily_rate": 200,
                "location": "Des Moines, IA",
                "is_visible_to_farmers": True,
            },
            {
                "_id": "eq-2",
                "category": "tractor",
                "daily_rate": 240,
                "location": "Des Moines, IA",
                "is_visible_to_farmers": True,
            },
            {
                "_id": "eq-3",
                "category": "tractor",
                "daily_rate": 180,
                "location": "Lincoln, NE",
                "is_visible_to_farmers": True,
            },
        ]
    )
    await db.bookings.insert_many(
        [
            {"equipment_id": "eq-1", "booking_status": "completed"},
            {"equipment_id": "eq-1", "booking_status": "confirmed"},
            {"equipment_id": "eq-2", "booking_status": "in_progress"},
        ]
    )

    result = await predictive_pricing(
        payload=PredictivePricingRequest(
            category="tractor",
            location="Des Moines",
            current_rate=150,
        ),
        db=db,
    )

    assert result["suggested_rate"] > 0
    assert result["recommended_range"]["min"] < result["recommended_range"]["max"]
    assert result["comparison_to_current"] == "below"
    assert result["signals"]["sample_size"] == 3
