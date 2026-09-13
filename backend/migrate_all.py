"""
Migration script: Syncs WalkinData from DailyUpdate records
and seeds rich mall data for all 4 malls.
Run: python migrate_all.py
"""
import os
import sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import app, db
from database.models import Mall, Brand, WalkinData, SalesData, RentData, DailyUpdate, User
from datetime import date, timedelta
import random

def sync_walkin_from_daily():
    """Sync WalkinData from every DailyUpdate record (no duplicates)."""
    daily_updates = DailyUpdate.query.all()
    synced = 0
    for du in daily_updates:
        if not du.mall_footfall or du.mall_footfall == 0:
            continue
        existing = WalkinData.query.filter_by(mall_id=du.mall_id, date=du.update_date).first()
        if existing:
            existing.footfall = du.mall_footfall
        else:
            db.session.add(WalkinData(
                mall_id=du.mall_id,
                date=du.update_date,
                footfall=du.mall_footfall,
                created_by=du.created_by
            ))
        synced += 1
    db.session.commit()
    print(f"[OK] Synced {synced} WalkinData records from DailyUpdates")

def seed_malls():
    """Ensure all 4 malls exist with rich details."""
    admin = User.query.filter_by(username='admin').first()
    admin_id = admin.id if admin else 1

    malls_data = [
        dict(name='Gopalan Signature Tower', location='Bannerghatta Road, Bangalore', total_area=500000, parking_capacity=2000, contact_person='Ramesh Kumar', contact_email='gst@gopalanmall.com', contact_phone='+91-80-12345678'),
        dict(name='Gopalan Arcade', location='Whitefield, Bangalore', total_area=350000, parking_capacity=1500, contact_person='Priya Sharma', contact_email='arcade@gopalanmall.com', contact_phone='+91-80-87654321'),
        dict(name='Gopalan Innovation Mall', location='ITPL Road, Bangalore', total_area=420000, parking_capacity=1800, contact_person='Suresh Nair', contact_email='innovation@gopalanmall.com', contact_phone='+91-80-11223344'),
        dict(name='Gopalan Grand Bazaar', location='Old Madras Road, Bangalore', total_area=300000, parking_capacity=1200, contact_person='Kavitha Rao', contact_email='grand@gopalanmall.com', contact_phone='+91-80-44332211'),
    ]

    created = 0
    for md in malls_data:
        m = Mall.query.filter(Mall.name.ilike(md['name'])).first()
        if not m:
            # Try to match existing partial names
            m = Mall.query.filter(Mall.name.ilike(f"%{md['name'].split()[1]}%")).first()
        
        if m:
            # Update details
            m.location = md['location']
            m.total_area = md['total_area']
            m.parking_capacity = md['parking_capacity']
            m.contact_person = md['contact_person']
            m.contact_email = md['contact_email']
            m.contact_phone = md['contact_phone']
        else:
            db.session.add(Mall(created_by=admin_id, **md))
            created += 1

    db.session.commit()
    print(f"[OK] Seeded malls: {created} new, rest updated")

def seed_brands_for_all_malls():
    """Seed brands for every mall."""
    admin = User.query.filter_by(username='admin').first()
    admin_id = admin.id if admin else 1

    brand_templates = [
        ('Zara', 'Fashion', 'Apparel'),
        ('H&M', 'Fashion', 'Apparel'),
        ('Nike', 'Sports', 'Footwear'),
        ('Adidas', 'Sports', 'Footwear'),
        ('McDonald\'s', 'Food & Beverage', 'QSR'),
        ('KFC', 'Food & Beverage', 'QSR'),
        ('Starbucks', 'Food & Beverage', 'Cafe'),
        ('PVR Cinemas', 'Entertainment', 'Multiplex'),
        ('Tanishq', 'Jewellery', 'Accessories'),
        ('Reliance Trends', 'Fashion', 'Apparel'),
        ('Westside', 'Fashion', 'Apparel'),
        ('Food Court', 'Food & Beverage', 'Multi Cuisine'),
    ]

    malls = Mall.query.all()
    created = 0
    for mall in malls:
        for name, cat, subcat in brand_templates:
            existing = Brand.query.filter_by(name=name, mall_id=mall.id).first()
            if not existing:
                db.session.add(Brand(
                    name=name,
                    category=cat,
                    sub_category=subcat,
                    mall_id=mall.id,
                    store_area=random.randint(500, 3000),
                    monthly_rent=random.randint(150000, 500000),
                    revenue_share_percentage=random.uniform(5, 15),
                    status='Active',
                    created_by=admin_id,
                    lease_start_date=date(2023, 1, 1),
                    lease_end_date=date(2026, 12, 31),
                ))
                created += 1

    db.session.commit()
    print(f"[OK] Seeded {created} brands across all malls")

def seed_daily_updates_for_all_malls():
    """Seed DailyUpdate records for all 4 malls for past 30 days (no duplicates)."""
    admin = User.query.filter_by(username='admin').first()
    admin_id = admin.id if admin else 1

    malls = Mall.query.all()
    today = date.today()
    created_du = 0
    created_wd = 0

    for mall in malls:
        for i in range(1, 32):  # last 31 days
            d = today - timedelta(days=i)

            # DailyUpdate
            exists_du = DailyUpdate.query.filter_by(mall_id=mall.id, update_date=d).first()
            footfall = random.randint(8000, 35000)
            cinema = random.randint(200, 1200)
            parking = round(random.uniform(20000, 80000), 2)
            two_wh = random.randint(500, 2000)
            four_wh = random.randint(300, 1200)

            if not exists_du:
                db.session.add(DailyUpdate(
                    mall_id=mall.id,
                    update_date=d,
                    mall_footfall=footfall,
                    cinema_walkin=cinema,
                    parking_collection=parking,
                    two_wheeler_count=two_wh,
                    four_wheeler_count=four_wh,
                    keb_usage_units=round(random.uniform(10000, 30000), 2),
                    dg_usage_units=round(random.uniform(0, 800), 2),
                    water_consumption_kl=round(random.uniform(50, 200), 2),
                    water_tankers_purchased=random.randint(0, 5),
                    stp_treated_water_kl=round(random.uniform(20, 100), 2),
                    diesel_consumption_ltr=round(random.uniform(50, 300), 2),
                    garbage_collected=True,
                    work_permits_raised=random.randint(0, 10),
                    customer_feedback_count=random.randint(0, 50),
                    remarks=f"Auto-seeded data for {mall.name}",
                    created_by=admin_id
                ))
                created_du += 1
            else:
                # Use existing footfall value for walkin sync
                footfall = exists_du.mall_footfall or footfall

            # WalkinData sync
            exists_wd = WalkinData.query.filter_by(mall_id=mall.id, date=d).first()
            if not exists_wd:
                db.session.add(WalkinData(
                    mall_id=mall.id,
                    date=d,
                    footfall=footfall,
                    peak_hour_visitors=int(footfall * 0.12),
                    average_dwell_time=random.randint(45, 120),
                    created_by=admin_id
                ))
                created_wd += 1

    db.session.commit()
    print(f"[OK] Seeded {created_du} DailyUpdate + {created_wd} WalkinData records")

def seed_sales_for_all_malls():
    """Seed SalesData for all brands across last 30 days (no duplicates)."""
    admin = User.query.filter_by(username='admin').first()
    admin_id = admin.id if admin else 1

    today = date.today()
    created = 0

    brands = Brand.query.all()
    for brand in brands:
        for i in range(1, 32):
            d = today - timedelta(days=i)
            existing = SalesData.query.filter_by(mall_id=brand.mall_id, brand_id=brand.id, date=d).first()
            if not existing:
                total_sales = round(random.uniform(50000, 500000), 2)
                transactions = random.randint(50, 500)
                returns = round(total_sales * random.uniform(0, 0.05), 2)
                discounts = round(total_sales * random.uniform(0, 0.1), 2)
                db.session.add(SalesData(
                    mall_id=brand.mall_id,
                    brand_id=brand.id,
                    date=d,
                    total_sales=total_sales,
                    transaction_count=transactions,
                    average_transaction_value=round(total_sales / transactions, 2),
                    customer_count=int(transactions * 0.85),
                    returns_amount=returns,
                    discount_amount=discounts,
                    net_sales=round(total_sales - returns - discounts, 2),
                    created_by=admin_id
                ))
                created += 1
    
    db.session.commit()
    print(f"[OK] Seeded {created} SalesData records")

def seed_rent_for_all_malls():
    """Seed RentData for all brands for last 6 months (no duplicates)."""
    admin = User.query.filter_by(username='admin').first()
    admin_id = admin.id if admin else 1

    today = date.today()
    created = 0

    brands = Brand.query.all()
    for brand in brands:
        for i in range(6):
            month_date = date(today.year, today.month, 1) - timedelta(days=i * 30)
            month_str = month_date.strftime('%Y-%m')
            
            existing = RentData.query.filter_by(mall_id=brand.mall_id, brand_id=brand.id, month=month_str).first()
            if not existing:
                base = float(brand.monthly_rent) if brand.monthly_rent else random.randint(150000, 500000)
                maintenance = round(base * 0.10, 2)
                other = round(base * 0.02, 2)
                total = base + maintenance + other
                status = 'Paid' if i > 0 else 'Pending'
                db.session.add(RentData(
                    mall_id=brand.mall_id,
                    brand_id=brand.id,
                    month=month_str,
                    base_rent=base,
                    maintenance_charges=maintenance,
                    other_charges=other,
                    total_rent=total,
                    payment_status=status,
                    payment_date=date(month_date.year, month_date.month, 5) if status == 'Paid' else None,
                    created_by=admin_id
                ))
                created += 1

    db.session.commit()
    print(f"[OK] Seeded {created} RentData records")

if __name__ == '__main__':
    with app.app_context():
        print("\n===== Mall Dashboard Migration Script =====\n")
        seed_malls()
        seed_brands_for_all_malls()
        seed_daily_updates_for_all_malls()
        sync_walkin_from_daily()
        seed_sales_for_all_malls()
        seed_rent_for_all_malls()

        # Final counts
        print("\n--- Final Record Counts ---")
        print(f"Malls:        {Mall.query.count()}")
        print(f"Brands:       {Brand.query.count()}")
        print(f"DailyUpdates: {DailyUpdate.query.count()}")
        print(f"WalkinData:   {WalkinData.query.count()}")
        print(f"SalesData:    {SalesData.query.count()}")
        print(f"RentData:     {RentData.query.count()}")
        print("\n[DONE] Migration complete!")
