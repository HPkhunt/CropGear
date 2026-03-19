import asyncio
import logging
from datetime import datetime, timedelta
import random

from app.db.client import connect_db, close_db, get_db

logger = logging.getLogger(__name__)

owners = [
    {"_id": "seed_owner1", "email": "noah@example.com", "full_name": "Noah Equipment", "phone_number": "555-0101", "role": "equipment_owner", "hashed_password": "mock", "created_at": datetime.utcnow(), "updated_at": datetime.utcnow(), "is_active": True},
    {"_id": "seed_owner2", "email": "liam@example.com", "full_name": "Liam TractorWorks", "phone_number": "555-0102", "role": "equipment_owner", "hashed_password": "mock", "created_at": datetime.utcnow(), "updated_at": datetime.utcnow(), "is_active": True},
    {"_id": "seed_owner3", "email": "sophia@example.com", "full_name": "Sophia HarvestTech", "phone_number": "555-0103", "role": "equipment_owner", "hashed_password": "mock", "created_at": datetime.utcnow(), "updated_at": datetime.utcnow(), "is_active": True},
    {"_id": "seed_owner4", "email": "ethan@example.com", "full_name": "Ethan FieldMachines", "phone_number": "555-0104", "role": "equipment_owner", "hashed_password": "mock", "created_at": datetime.utcnow(), "updated_at": datetime.utcnow(), "is_active": True},
]

farmers = [
    {"_id": "seed_farmer1", "email": "farmer1@example.com", "full_name": "Farmer Joe", "phone_number": "555-0201", "role": "farmer", "hashed_password": "mock", "created_at": datetime.utcnow(), "updated_at": datetime.utcnow(), "is_active": True},
    {"_id": "seed_farmer2", "email": "farmer2@example.com", "full_name": "Farmer Jane", "phone_number": "555-0202", "role": "farmer", "hashed_password": "mock", "created_at": datetime.utcnow(), "updated_at": datetime.utcnow(), "is_active": True},
]

async def seed():
    db = get_db()
    if db is None:
        logger.error("MongoDB is not available; cannot seed.")
        return
    
    # Insert users
    existing_users = await db.users.count_documents({"_id": {"$in": [o["_id"] for o in owners]}})
    if existing_users == 0:
        await db.users.insert_many(owners + farmers)
        logger.info(f"Seeded {len(owners + farmers)} users.")
        
    # Get some equipments
    equipments = await db.equipment.find().to_list(length=20)
    
    existing_bookings = await db.bookings.count_documents({})
    if existing_bookings < 50:
        bookings = []
        for i in range(150):
            equip = random.choice(equipments)
            farmer = random.choice(farmers)
            start_date = datetime.utcnow() - timedelta(days=random.randint(1, 60))
            end_date = start_date + timedelta(days=random.randint(1, 10))
            bookings.append({
                "_id": f"seed_booking_{i}",
                "equipment_id": equip["_id"],
                "renter_id": farmer["_id"],
                "owner_id": equip["owner_id"],
                "start_date": start_date,
                "end_date": end_date,
                "base_rate": equip.get("daily_rate", 100.0),
                "total_amount": equip.get("daily_rate", 100.0) * (end_date - start_date).days,
                "booking_status": random.choice(["confirmed", "completed"]),
                "payment_status": "completed",
                "created_at": start_date - timedelta(days=2),
                "updated_at": start_date,
            })
        await db.bookings.insert_many(bookings)
        logger.info(f"Seeded {len(bookings)} bookings.")

async def main():
    await connect_db()
    try:
        await seed()
    finally:
        await close_db()

if __name__ == "__main__":
    asyncio.run(main())
