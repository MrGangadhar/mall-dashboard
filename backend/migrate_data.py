import sqlite3
import os
from app import app, db
from database.models import User, Mall, Brand, WalkinData, SalesData, RentData, UploadHistory, TemplateMaster, DailyUpdate
from sqlalchemy import text

def migrate():
    print("Starting migration from local SQLite to Neon PostgreSQL...")
    
    if not os.path.exists("app.db"):
        print("No local app.db found. Ensuring PostgreSQL schema initialized...")
        with app.app_context():
            db.create_all()
            print("Schema initialized.")
        return

    sqlite_db = sqlite3.connect("app.db")
    sqlite_db.row_factory = sqlite3.Row
    cursor = sqlite_db.cursor()

    with app.app_context():
        db.create_all()
        print("Database schema created/verified in PostgreSQL.")

        # 1. Users
        cursor.execute("SELECT * FROM users")
        for row in cursor.fetchall():
            if not User.query.filter_by(id=row["id"]).first():
                user = User(
                    id=row["id"],
                    username=row["username"], email=row["email"],
                    password_hash=row["password_hash"], full_name=row["full_name"],
                    role=row["role"], is_active=bool(row["is_active"]),
                    created_at=row["created_at"], last_login=row["last_login"]
                )
                db.session.add(user)
        db.session.commit()
        print("[OK] Users migrated.")

        # 2. Template Master
        cursor.execute("SELECT * FROM template_master")
        for row in cursor.fetchall():
            if not TemplateMaster.query.filter_by(id=row["id"]).first():
                tmpl = TemplateMaster(
                    id=row["id"], template_type=row["template_type"],
                    template_name=row["template_name"], column_mapping=row["column_mapping"],
                    required_columns=row["required_columns"], sample_data=row["sample_data"],
                    created_at=row["created_at"], updated_at=row["updated_at"]
                )
                db.session.add(tmpl)
        db.session.commit()
        print("[OK] Template Master migrated.")

        # 3. Malls
        cursor.execute("SELECT * FROM malls")
        for row in cursor.fetchall():
            if not Mall.query.filter_by(id=row["id"]).first():
                mall = Mall(
                    id=row["id"], name=row["name"], location=row["location"],
                    total_area=row["total_area"], parking_capacity=row["parking_capacity"],
                    contact_person=row["contact_person"], contact_email=row["contact_email"],
                    contact_phone=row["contact_phone"], created_at=row["created_at"],
                    updated_at=row["updated_at"], created_by=row["created_by"]
                )
                db.session.add(mall)
        db.session.commit()
        print("[OK] Malls migrated.")

        # 4. Brands
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
        print("[OK] Brands migrated.")

        # 5. Walkin Data
        cursor.execute("SELECT * FROM walkin_data")
        for row in cursor.fetchall():
            if not WalkinData.query.filter_by(id=row["id"]).first():
                w = WalkinData(
                    id=row["id"], mall_id=row["mall_id"], date=row["date"],
                    footfall=row["footfall"], peak_hour_visitors=row["peak_hour_visitors"],
                    peak_hour_start=row["peak_hour_start"], peak_hour_end=row["peak_hour_end"],
                    average_dwell_time=row["average_dwell_time"], visitor_demographics=row["visitor_demographics"],
                    weather_condition=row["weather_condition"], special_event=row["special_event"],
                    created_at=row["created_at"], created_by=row["created_by"]
                )
                db.session.add(w)
        db.session.commit()
        print("[OK] Walkin Data migrated.")

        # 6. Sales Data
        cursor.execute("SELECT * FROM sales_data")
        for row in cursor.fetchall():
            if not SalesData.query.filter_by(id=row["id"]).first():
                s = SalesData(
                    id=row["id"], mall_id=row["mall_id"], brand_id=row["brand_id"], date=row["date"],
                    total_sales=row["total_sales"], transaction_count=row["transaction_count"],
                    average_transaction_value=row["average_transaction_value"], customer_count=row["customer_count"],
                    returns_amount=row["returns_amount"], discount_amount=row["discount_amount"],
                    net_sales=row["net_sales"], tax_amount=row["tax_amount"],
                    created_at=row["created_at"], created_by=row["created_by"]
                )
                db.session.add(s)
        db.session.commit()
        print("[OK] Sales Data migrated.")

        # 7. Rent Data
        cursor.execute("SELECT * FROM rent_data")
        for row in cursor.fetchall():
            if not RentData.query.filter_by(id=row["id"]).first():
                r = RentData(
                    id=row["id"], mall_id=row["mall_id"], brand_id=row["brand_id"], month=row["month"],
                    base_rent=row["base_rent"], revenue_share=row["revenue_share"],
                    revenue_share_amount=row["revenue_share_amount"], maintenance_charges=row["maintenance_charges"],
                    other_charges=row["other_charges"], total_rent=row["total_rent"],
                    payment_status=row["payment_status"], payment_date=row["payment_date"],
                    payment_method=row["payment_method"], invoice_number=row["invoice_number"],
                    remarks=row["remarks"], created_at=row["created_at"], created_by=row["created_by"]
                )
                db.session.add(r)
        db.session.commit()
        print("[OK] Rent Data migrated.")

        # 8. Upload History
        cursor.execute("SELECT * FROM upload_history")
        for row in cursor.fetchall():
            if not UploadHistory.query.filter_by(id=row["id"]).first():
                u = UploadHistory(
                    id=row["id"], file_name=row["file_name"], file_type=row["file_type"],
                    mall_id=row["mall_id"], month=row["month"], records_processed=row["records_processed"],
                    success_count=row["success_count"], error_count=row["error_count"],
                    error_log=row["error_log"], status=row["status"],
                    uploaded_at=row["uploaded_at"], uploaded_by=row["uploaded_by"],
                    completion_time=row["completion_time"]
                )
                db.session.add(u)
        db.session.commit()
        print("[OK] Upload History migrated.")

        # 9. Daily Updates
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
                    diesel_consumption_ltr=row["diesel_consumption_ltr"], garbage_collected=bool(row["garbage_collected"]),
                    work_permits_raised=row["work_permits_raised"], customer_feedback_count=row["customer_feedback_count"],
                    remarks=row["remarks"], created_at=row["created_at"], created_by=row["created_by"]
                )
                db.session.add(update)
        db.session.commit()
        print("[OK] Daily Updates migrated.")
        
        # Reset PostgreSQL auto-increment sequences if engine is PostgreSQL
        if "postgresql" in str(db.engine.url):
            tables = [
                ("users", "users_id_seq"),
                ("template_master", "template_master_id_seq"),
                ("malls", "malls_id_seq"),
                ("brands", "brands_id_seq"),
                ("walkin_data", "walkin_data_id_seq"),
                ("sales_data", "sales_data_id_seq"),
                ("rent_data", "rent_data_id_seq"),
                ("upload_history", "upload_history_id_seq"),
                ("daily_updates", "daily_updates_id_seq")
            ]
            
            for table, seq in tables:
                try:
                    db.session.execute(text(f"SELECT setval('{seq}', COALESCE((SELECT MAX(id)+1 FROM {table}), 1), false)"))
                    db.session.commit()
                    print(f"✓ Sequence {seq} reset.")
                except Exception as e:
                    db.session.rollback()
                    print(f"Notice: sequence {seq} reset skipped or handled: {e}")

    sqlite_db.close()
    print("Migration to target database completed successfully!")

if __name__ == "__main__":
    migrate()


