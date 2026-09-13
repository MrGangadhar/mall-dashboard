import pandas as pd
from datetime import datetime
from database.models import db, DailyUpdate, WalkinData, Mall
import logging

logger = logging.getLogger(__name__)

class ExcelProcessor:
    
    @staticmethod
    def process_daily_updates(filepath, mall_id, month, user_id):
        """Process Excel/CSV file containing daily updates with flexible column mapping"""
        try:
            # Read file (handle CSV with proper encoding and date parsing)
            if filepath.endswith('.csv'):
                df = pd.read_csv(filepath, encoding='utf-8-sig', dayfirst=True)
            else:
                df = pd.read_excel(filepath, dayfirst=True)
            
            # Clean column names by stripping whitespace
            df.columns = [str(c).strip() for c in df.columns]
            
            # Helper to find column flexibly
            def find_col(candidates):
                for candidate in candidates:
                    for col in df.columns:
                        if col.lower() == candidate.lower() or candidate.lower() in col.lower():
                            return col
                return None

            date_col = find_col(['Date', 'update_date', 'Timestamp', 'time', 'day'])
            if not date_col:
                return {'success': False, 'error': 'Could not find a valid Date column in the uploaded file.'}

            footfall_col = find_col(['Foot fall Count', 'Footfall', 'Mall Footfall', 'footfall_count', 'Walkin'])
            cinema_col = find_col(['Cinema Walk-In Count', 'Cinema', 'Cinema Walkin', 'cinema_walkin'])
            parking_col = find_col(['Parking collection amount', 'Parking Collection', 'Parking', 'parking_collection'])
            two_wheeler_col = find_col(['Number of 2-Wheeler entry', '2-Wheeler', '2 Wheeler', 'two_wheeler'])
            four_wheeler_col = find_col(['Number of 4-wheeler entry', '4-Wheeler', '4 Wheeler', 'four_wheeler'])
            keb_col = find_col(['KEB usage (units)', 'KEB Usage', 'KEB', 'keb_usage'])
            dg_col = find_col(['DG Usage (Units)', 'DG Usage', 'DG', 'dg_usage'])
            water_col = find_col(['Water consumption (KL)', 'Water Consumption', 'Water', 'water_consumption'])
            tankers_col = find_col(['Number of water Tanker purchased', 'Water Tanker', 'Tanker', 'water_tankers'])
            stp_col = find_col(['STP treated water (KL)', 'STP Water', 'STP', 'stp_water'])
            diesel_col = find_col(['Diesel consumption', 'Diesel', 'diesel_consumption'])
            garbage_col = find_col(['Garbage collected', 'Garbage', 'garbage_collected'])
            work_permits_col = find_col(['Number of work permit raised', 'Work Permits', 'Permits', 'work_permits'])
            feedback_col = find_col(['Customer feedback count', 'Customer Feedback', 'Feedback', 'feedback'])
            email_col = find_col(['Email Address', 'Email', 'email'])

            processed = 0
            errors = []

            # Determine target mall ID
            target_mall_id = int(mall_id) if mall_id else None

            for index, row in df.iterrows():
                try:
                    # Parse date (handles YYYY-MM-DD or DD-MM-YYYY)
                    raw_date = row[date_col]
                    if pd.isna(raw_date):
                        continue

                    date_str = str(raw_date).strip()
                    update_date = pd.to_datetime(date_str, dayfirst=True, errors='coerce').date()
                    if update_date is None or pd.isna(update_date):
                        raise ValueError(f"Invalid date format: {date_str}")

                    # Helper conversions
                    def to_float(col_name):
                        if not col_name or col_name not in row or pd.isna(row[col_name]):
                            return 0.0
                        val = str(row[col_name]).strip().upper()
                        if val in ['NILL', 'NONE', '', 'NAN']:
                            return 0.0
                        try:
                            return float(row[col_name])
                        except:
                            return 0.0

                    def to_int(col_name):
                        if not col_name or col_name not in row or pd.isna(row[col_name]):
                            return 0
                        val = str(row[col_name]).strip().upper()
                        if val in ['NILL', 'NONE', '', 'NAN']:
                            return 0
                        try:
                            return int(float(row[col_name]))
                        except:
                            return 0

                    def to_bool(col_name):
                        if not col_name or col_name not in row or pd.isna(row[col_name]):
                            return False
                        s = str(row[col_name]).strip().upper()
                        return s in ['YES', 'TRUE', '1', 'Y']

                    # Extract values
                    mall_footfall = to_int(footfall_col)
                    cinema_walkin = to_int(cinema_col)
                    parking_collection = to_float(parking_col)
                    two_wheelers = to_int(two_wheeler_col)
                    four_wheelers = to_int(four_wheeler_col)
                    keb_usage = to_float(keb_col)
                    dg_usage = to_float(dg_col)
                    water_consumption = to_float(water_col)
                    water_tankers = to_int(tankers_col)
                    stp_water = to_float(stp_col)
                    diesel = to_float(diesel_col)
                    garbage = to_bool(garbage_col)
                    work_permits = to_int(work_permits_col)
                    feedback = to_int(feedback_col)
                    email = str(row[email_col]).strip() if email_col and email_col in row and pd.notna(row[email_col]) else ''

                    # Resolve mall ID if not set via form argument
                    current_mall_id = target_mall_id
                    if not current_mall_id:
                        row_mall_name = find_col(['Mall Name', 'Mall', 'mall_name'])
                        if row_mall_name and pd.notna(row[row_mall_name]):
                            m_name = str(row[row_mall_name]).strip()
                            mall_obj = Mall.query.filter(Mall.name.ilike(f"%{m_name}%")).first()
                            if not mall_obj:
                                mall_obj = Mall(name=m_name, created_by=user_id)
                                db.session.add(mall_obj)
                                db.session.flush()
                            current_mall_id = mall_obj.id

                    if not current_mall_id:
                        # Fallback to first available mall in DB or auto-create Default Mall
                        default_mall = Mall.query.first()
                        if not default_mall:
                            default_mall = Mall(name="Main Mall", created_by=user_id)
                            db.session.add(default_mall)
                            db.session.flush()
                        current_mall_id = default_mall.id

                    # Upsert DailyUpdate
                    existing = DailyUpdate.query.filter_by(
                        mall_id=current_mall_id,
                        update_date=update_date
                    ).first()

                    if existing:
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
                        update = DailyUpdate(
                            mall_id=current_mall_id,
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

                    # Also sync/upsert WalkinData for general Walkin dashboards
                    if mall_footfall > 0:
                        walkin_existing = WalkinData.query.filter_by(
                            mall_id=current_mall_id,
                            date=update_date
                        ).first()
                        if walkin_existing:
                            walkin_existing.footfall = mall_footfall
                        else:
                            db.session.add(WalkinData(
                                mall_id=current_mall_id,
                                date=update_date,
                                footfall=mall_footfall,
                                created_by=user_id
                            ))

                    processed += 1

                except Exception as e:
                    errors.append(f"Row {index + 2}: {str(e)}")
                    logger.error(f"Row {index + 2} error: {e}")

                if (index + 1) % 50 == 0:
                    db.session.commit()

            db.session.commit()

            return {
                'success': True,
                'processed': processed,
                'errors': errors[:10]
            }

        except Exception as e:
            db.session.rollback()
            logger.error(f"Excel processing error: {e}")
            return {
                'success': False,
                'error': str(e)
            }