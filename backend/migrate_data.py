import sqlite3
import os
from app import app, db
from database.models import User, Mall, Brand, WalkinData, SalesData, RentData, UploadHistory, TemplateMaster, DailyUpdate
from sqlalchemy import text

def migrate():
    print("Starting migration from local SQLite to Neon PostgreSQL...")
    
    sqlite_db = sqlite3.connect("app.db")
    sqlite_db.row_factory = sqlite3.Row
    cursor = sqlite_db.cursor()

    with app.app_context():
        # Users
        cursor.execute("SELECT * FROM users")
        for row in cursor.fetchall():
            if not User.query.filter_by(username=row["username"]).first():
                user = User(
                    username=row["username"], email=row["email"],
                    password_hash=row["password_hash"], full_name=row["full_name"],
                    role=row["role"], is_active=row["is_active"],
                    created_at=row["created_at"], last_login=row["last_login"]
                )
                db.session.add(user)
        db.session.commit()
        print("Users migrated.")

        # Malls
        cursor.execute("SELECT * FROM malls")
        malls = cursor.fetchall()
        for row in malls:
            if not Mall.query.filter_by(name=row["name"]).first():
                mall = Mall(
                    id=row["id"], name=row["name"], location=row["location"],
                    total_area=row["total_area"], parking_capacity=row["parking_capacity"],
                    contact_person=row["contact_person"], contact_email=row["contact_email"],
                    contact_phone=row["contact_phone"], created_at=row["created_at"],
                    updated_at=row["updated_at"], created_by=row["created_by"]
                )
                db.session.add(mall)
        db.session.commit()
        print("Malls migrated.")

        # Brands
        cursor.execute("SELECT * FROM brands")
        for row in cursor.fetchall():
            if not Brand.query.filter_by(id=row["id"]).first():
                brand = Brand(
                    id=row["id"], name=row["name"], category=row["category"],
                    sub_category=row["sub_category"], mall_id=row["mall_id"],
                    store_area=row["store_area"], lease_start_date=row["lease_start_date"],
                    lease_end_date=row["lease_end_date"], monthly_rent=row["monthly_rent"],
                    revenue_share_percentage=row["revenue_share_percentage"],
                    contact_person=row["contact_person"], contact_email=row["contact_email"],
                    contact_phone=row["contact_phone"], status=row["status"],
                    created_at=row["created_at"], created_by=row["created_by"]
                )
                db.session.add(brand)
        db.session.commit()
        print("Brands migrated.")

        # Daily Updates
        cursor.execute("SELECT * FROM daily_updates")
        for row in cursor.fetchall():
            if not DailyUpdate.query.filter_by(id=row["id"]).first():
                update = DailyUpdate(
                    id=row["id"], mall_id=row["mall_id"], update_date=row["update_date"],
                    mall_footfall=row["mall_footfall"], cinema_walkin=row["cinema_walkin"],
                    parking_collection=row["parking_collection"], two_wheeler_count=row["two_wheeler_count"],
                    four_wheeler_count=row["four_wheeler_count"], keb_usage_units=row["keb_usage_units"],
                    dg_usage_units=row["dg_usage_units"], water_consumption_kl=row["water_consumption_kl"],
                    water_tankers_purchased=row["water_tankers_purchased"], stp_treated_water_kl=row["stp_treated_water_kl"],
                    diesel_consumption_ltr=row["diesel_consumption_ltr"], garbage_collected=row["garbage_collected"],
                    work_permits_raised=row["work_permits_raised"], customer_feedback_count=row["customer_feedback_count"],
                    remarks=row["remarks"], created_at=row["created_at"], created_by=row["created_by"]
                )
                db.session.add(update)
        db.session.commit()
        print("Daily Updates migrated.")
        
        # Reset PostgreSQL auto-increment sequences
        try:
            db.session.execute(text("SELECT setval('users_id_seq', COALESCE((SELECT MAX(id)+1 FROM users), 1), false)"))
            db.session.execute(text("SELECT setval('malls_id_seq', COALESCE((SELECT MAX(id)+1 FROM malls), 1), false)"))
            db.session.execute(text("SELECT setval('brands_id_seq', COALESCE((SELECT MAX(id)+1 FROM brands), 1), false)"))
            db.session.execute(text("SELECT setval('daily_updates_id_seq', COALESCE((SELECT MAX(id)+1 FROM daily_updates), 1), false)"))
            db.session.commit()
            print("Sequences reset.")
        except Exception as e:
            print("Failed to reset sequences:", e)

    sqlite_db.close()
    print("Migration completed successfully!")

if __name__ == "__main__":
    migrate()

