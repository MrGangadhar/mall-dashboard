from app import app
from database.models import db, DailyUpdate, WalkinData, SalesData, RentData, UploadHistory

with app.app_context():
    print(f"Daily Updates: {DailyUpdate.query.delete()}")
    print(f"Walk-in Data: {WalkinData.query.delete()}")
    print(f"Sales Data: {SalesData.query.delete()}")
    print(f"Rent Data: {RentData.query.delete()}")
    print(f"Upload History: {UploadHistory.query.delete()}")
    db.session.commit()
    print("All transaction data cleared!")