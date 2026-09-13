import os
import sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import app, db
from database.models import Mall, DailyUpdate, WalkinData, Brand, SalesData, RentData

with app.app_context():
    malls = Mall.query.all()
    print("--- Current Malls in Database ---")
    for m in malls:
        print(f"ID: {m.id}, Name: {m.name}")
    
    print("\n--- Current Record Counts ---")
    print(f"DailyUpdates: {DailyUpdate.query.count()}")
    print(f"WalkinData:   {WalkinData.query.count()}")
    print(f"Brands:       {Brand.query.count()}")
    print(f"SalesData:    {SalesData.query.count()}")
    print(f"RentData:     {RentData.query.count()}")
