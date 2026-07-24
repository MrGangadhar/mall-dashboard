import pandas as pd
from datetime import datetime
from database.models import db, DailyUpdate, Mall
import logging

logger = logging.getLogger(__name__)

class ExcelProcessor:
    
    @staticmethod
    def process_daily_updates(filepath, mall_id, month, user_id):
        """Process Excel file containing daily updates"""
        try:
            # Read file (handle CSV with proper encoding and date parsing)
            if filepath.endswith('.csv'):
                df = pd.read_csv(filepath, encoding='utf-8-sig', dayfirst=True)
            else:
                df = pd.read_excel(filepath, dayfirst=True)
            
            # Expected columns mapping (adjust if column names differ)
            column_mapping = {
                'Timestamp': 'timestamp',
                'Mall Name': 'mall_name',
                'Foot fall Count': 'mall_footfall',
                'Cinema Walk-In Count': 'cinema_walkin',
                'Parking collection amount': 'parking_collection',
                'Number of 2-Wheeler entry': 'two_wheeler_count',
                'Number of 4-wheeler entry': 'four_wheeler_count',
                'KEB usage (units)': 'keb_usage_units',
                'DG Usage (Units)': 'dg_usage_units',
                'Water consumption (KL)': 'water_consumption_kl',
                'Number of water Tanker purchased': 'water_tankers_purchased',
                'STP treated water (KL)': 'stp_treated_water_kl',
                'Diesel consumption': 'diesel_consumption_ltr',
                'Garbage collected': 'garbage_collected',
                'Number of work permit raised': 'work_permits_raised',
                'Customer feedback count': 'customer_feedback_count',
                'Email Address': 'email',
                'Date': 'update_date',
                'Month': 'month'
            }
            
            # Validate required columns
            missing = set(column_mapping.keys()) - set(df.columns)
            if missing:
                return {'success': False, 'error': f'Missing columns: {missing}'}
            
            processed = 0
            errors = []
            
            for index, row in df.iterrows():
                try:
                    # Parse date (handles DD-MM-YYYY)
                    date_str = str(row['Date']).strip()
                    update_date = pd.to_datetime(date_str, dayfirst=True, errors='coerce').date()
                    if update_date is None:
                        raise ValueError(f"Invalid date: {date_str}")
                    
                    # Check for existing record
                    existing = DailyUpdate.query.filter_by(
                        mall_id=mall_id,
                        update_date=update_date
                    ).first()
                    
                    # Helper to convert "Nill" or empty to 0
                    def to_float(val):
                        if pd.isna(val) or str(val).strip().upper() in ['NILL', '']:
                            return 0.0
                        try:
                            return float(val)
                        except:
                            return 0.0
                    
                    def to_int(val):
                        if pd.isna(val) or str(val).strip().upper() in ['NILL', '']:
                            return 0
                        try:
                            return int(float(val))
                        except:
                            return 0
                    
                    def to_bool(val):
                        if pd.isna(val):
                            return False
                        s = str(val).strip().upper()
                        return s in ['YES', 'TRUE', '1', 'Y']
                    
                    # Extract values with Nill handling
                    mall_footfall = to_int(row['Foot fall Count'])
                    cinema_walkin = to_int(row['Cinema Walk-In Count'])
                    parking_collection = to_float(row['Parking collection amount'])
                    two_wheelers = to_int(row['Number of 2-Wheeler entry'])
                    four_wheelers = to_int(row['Number of 4-wheeler entry'])
                    keb_usage = to_float(row['KEB usage (units)'])
                    dg_usage = to_float(row['DG Usage (Units)'])  # "Nill" becomes 0
                    water_consumption = to_float(row['Water consumption (KL)'])
                    water_tankers = to_int(row['Number of water Tanker purchased'])
                    stp_water = to_float(row['STP treated water (KL)'])
                    diesel = to_float(row['Diesel consumption'])
                    garbage = to_bool(row['Garbage collected'])
                    work_permits = to_int(row['Number of work permit raised'])
                    feedback = to_int(row['Customer feedback count'])
                    email = str(row['Email Address']).strip() if pd.notna(row['Email Address']) else ''
                    
                    if existing:
                        # Update existing record
                        existing.mall_footfall = mall_footfall
                        existing.cinema_walkin = cinema_walkin
                        existing.parking_collection = parking_collection
                        existing.two_wheeler_count = two_wheelers
                        existing.four_wheeler_count = four_wheelers
                        existing.keb_usage_units = keb_usage
                        existing.dg_usage_units = dg_usage
                        existing.water_consumption_kl = water_consumption
                        existing.water_tankers_purchased = water_tankers
                        existing.stp_treated_water_kl = stp_water
                        existing.diesel_consumption_ltr = diesel
                        existing.garbage_collected = garbage
                        existing.work_permits_raised = work_permits
                        existing.customer_feedback_count = feedback
                        existing.remarks = f"Updated via Excel - {month}"
                    else:
                        # Create new
                        update = DailyUpdate(
                            mall_id=mall_id,
                            update_date=update_date,
                            mall_footfall=mall_footfall,
                            cinema_walkin=cinema_walkin,
                            parking_collection=parking_collection,
                            two_wheeler_count=two_wheelers,
                            four_wheeler_count=four_wheelers,
                            keb_usage_units=keb_usage,
                            dg_usage_units=dg_usage,
                            water_consumption_kl=water_consumption,
                            water_tankers_purchased=water_tankers,
                            stp_treated_water_kl=stp_water,
                            diesel_consumption_ltr=diesel,
                            garbage_collected=garbage,
                            work_permits_raised=work_permits,
                            customer_feedback_count=feedback,
                            remarks=f"Imported via Excel - {month}",
                            created_by=user_id
                        )
                        db.session.add(update)
                    
                    processed += 1
                    
                except Exception as e:
                    errors.append(f"Row {index + 2}: {str(e)}")
                    logger.error(f"Row {index + 2} error: {e}")
                
                # Commit every 50 rows
                if (index + 1) % 50 == 0:
                    db.session.commit()
            
            db.session.commit()
            
            return {
                'success': True,
                'processed': processed,
                'errors': errors[:10]
            }
            
        except Exception as e:
            logger.error(f"Excel processing error: {e}")
            return {
                'success': False,
                'error': str(e)
            }