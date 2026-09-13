from app import app
from database.models import Mall, Brand, DailyUpdate, WalkinData, SalesData, RentData
from database.db_manager import DatabaseManager

with app.app_context():
    print("=== Record Counts ===")
    print("Malls:", Mall.query.count())
    print("Brands:", Brand.query.count())
    print("DailyUpdates:", DailyUpdate.query.count())
    print("WalkinData:", WalkinData.query.count())
    print("SalesData:", SalesData.query.count())
    print("RentData:", RentData.query.count())

    print("\n=== Dashboard Overview ===")
    ov = DatabaseManager.get_dashboard_overview()
    for k, v in ov.items():
        print(f"  {k}: {v}")

    print("\n=== Mall Performance (all malls, current month) ===")
    perf = DatabaseManager.get_mall_performance()
    for p in perf:
        name = p['mall_name']
        ff = p['total_footfall']
        s = p['total_sales']
        r = p['total_rent']
        print(f"  Mall: {name} | Footfall={ff} | Sales={s:.0f} | Rent={r:.0f}")
