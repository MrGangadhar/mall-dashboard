from sqlalchemy import func, and_, or_, desc, extract
from datetime import datetime, timedelta
from .models import db, User, Mall, Brand, SalesData, WalkinData, RentData, UploadHistory, DailyUpdate
import pandas as pd
import numpy as np

class DatabaseManager:
    
    @staticmethod
    def get_dashboard_overview():
        """Get overall dashboard statistics combining all data sources"""
        try:
            total_malls = Mall.query.count()
            total_brands = Brand.query.count()
            active_brands = Brand.query.filter_by(status='Active').count()
            
            # Total sales from SalesData
            total_sales = db.session.query(func.sum(SalesData.total_sales)).scalar() or 0
            
            # Total footfall from both WalkinData and DailyUpdate
            walkin_footfall = db.session.query(func.sum(WalkinData.footfall)).scalar() or 0
            daily_footfall = db.session.query(func.sum(DailyUpdate.mall_footfall)).scalar() or 0
            total_footfall = max(walkin_footfall, daily_footfall) or (walkin_footfall + daily_footfall)
            
            # Rent calculations
            total_rent = db.session.query(func.sum(RentData.total_rent)).scalar() or 0
            pending_rent = db.session.query(func.sum(RentData.total_rent))\
                .filter(RentData.payment_status.in_(['Pending', 'Overdue']))\
                .scalar() or 0
            collected_rent = db.session.query(func.sum(RentData.total_rent))\
                .filter(RentData.payment_status == 'Paid')\
                .scalar() or 0
            
            stats = {
                'total_malls': total_malls,
                'total_brands': total_brands,
                'active_brands': active_brands,
                'total_sales': float(total_sales),
                'total_footfall': int(total_footfall),
                'total_rent': float(total_rent),
                'pending_rent': float(pending_rent),
                'collected_rent': float(collected_rent)
            }
            return stats
        except Exception as e:
            print(f"Error getting dashboard overview: {e}")
            return {}
    
    @staticmethod
    def get_mall_performance(mall_id=None, period='month'):
        """Get performance metrics for malls cleanly without Cartesian product joins"""
        try:
            malls_query = Mall.query
            if mall_id:
                malls_query = malls_query.filter(Mall.id == mall_id)
            malls = malls_query.all()
            
            performance = []
            current_year = datetime.now().year
            current_month = datetime.now().month
            current_month_str = datetime.now().strftime('%Y-%m')
            
            current_week_start = datetime.now().date() - timedelta(days=datetime.now().weekday())
            current_week_end = current_week_start + timedelta(days=6)

            for mall in malls:
                total_brands = Brand.query.filter_by(mall_id=mall.id).count()
                
                # Sales query
                sales_q = db.session.query(func.sum(SalesData.total_sales)).filter(SalesData.mall_id == mall.id)
                # Footfall queries
                walkin_q = db.session.query(func.sum(WalkinData.footfall)).filter(WalkinData.mall_id == mall.id)
                daily_q = db.session.query(func.sum(DailyUpdate.mall_footfall)).filter(DailyUpdate.mall_id == mall.id)
                # Rent query
                rent_q = db.session.query(func.sum(RentData.total_rent)).filter(RentData.mall_id == mall.id)
                
                if period == 'month':
                    sales_q = sales_q.filter(extract('year', SalesData.date) == current_year, extract('month', SalesData.date) == current_month)
                    walkin_q = walkin_q.filter(extract('year', WalkinData.date) == current_year, extract('month', WalkinData.date) == current_month)
                    daily_q = daily_q.filter(extract('year', DailyUpdate.update_date) == current_year, extract('month', DailyUpdate.update_date) == current_month)
                    rent_q = rent_q.filter(RentData.month == current_month_str)
                elif period == 'week':
                    sales_q = sales_q.filter(SalesData.date.between(current_week_start, current_week_end))
                    walkin_q = walkin_q.filter(WalkinData.date.between(current_week_start, current_week_end))
                    daily_q = daily_q.filter(DailyUpdate.update_date.between(current_week_start, current_week_end))
                
                t_sales = float(sales_q.scalar() or 0)
                w_footfall = int(walkin_q.scalar() or 0)
                d_footfall = int(daily_q.scalar() or 0)
                t_footfall = max(w_footfall, d_footfall) or (w_footfall + d_footfall)
                t_rent = float(rent_q.scalar() or 0)
                
                performance.append({
                    'mall_id': mall.id,
                    'mall_name': mall.name,
                    'total_brands': total_brands,
                    'total_sales': t_sales,
                    'total_footfall': t_footfall,
                    'total_rent': t_rent
                })
            
            return performance
        except Exception as e:
            print(f"Error getting mall performance: {e}")
            return []
    
    @staticmethod
    def get_tenant_performance(mall_id=None, brand_id=None):
        """Get tenant/brand performance metrics"""
        try:
            query = db.session.query(
                Brand.id,
                Brand.name,
                Brand.category,
                Mall.name.label('mall_name'),
                func.coalesce(func.sum(SalesData.total_sales), 0).label('total_sales'),
                func.coalesce(func.sum(SalesData.transaction_count), 0).label('transactions'),
                func.coalesce(func.avg(SalesData.average_transaction_value), 0).label('avg_ticket')
            ).join(Mall, Brand.mall_id == Mall.id)\
             .outerjoin(SalesData, Brand.id == SalesData.brand_id)
            
            if mall_id:
                query = query.filter(Brand.mall_id == mall_id)
            if brand_id:
                query = query.filter(Brand.id == brand_id)
            
            query = query.group_by(Brand.id, Mall.id)
            results = query.all()
            
            performance = []
            for r in results:
                performance.append({
                    'brand_id': r[0],
                    'brand_name': r[1],
                    'category': r[2],
                    'mall_name': r[3],
                    'total_sales': float(r[4] or 0),
                    'transactions': int(r[5] or 0),
                    'avg_ticket': float(r[6] or 0)
                })
            
            return performance
        except Exception as e:
            print(f"Error getting tenant performance: {e}")
            return []

    @staticmethod
    def validate_mall_brand(mall_name, brand_name):
        """Validate if mall and brand exist; auto-create if missing to ensure data is saved"""
        try:
            m_name = str(mall_name).strip()
            mall = Mall.query.filter(Mall.name.ilike(m_name)).first()
            if not mall:
                mall = Mall(name=m_name)
                db.session.add(mall)
                db.session.commit()
            
            b_name = str(brand_name).strip() if brand_name else None
            if b_name:
                brand = Brand.query.filter(Brand.name.ilike(b_name), Brand.mall_id == mall.id).first()
                if not brand:
                    brand = Brand(name=b_name, mall_id=mall.id, status='Active')
                    db.session.add(brand)
                    db.session.commit()
                return True, (mall.id, brand.id)
            
            return True, mall.id
        except Exception as e:
            db.session.rollback()
            return False, str(e)

    @staticmethod
    def validate_template_columns(df, template_type):
        """Validate if dataframe has required columns for template type"""
        templates = {
            'walkin': ['Mall Name', 'Date', 'Footfall'],
            'sales': ['Mall Name', 'Brand Name', 'Date', 'Total Sales', 'Transaction Count'],
            'rent': ['Mall Name', 'Brand Name', 'Month', 'Base Rent', 'Total Rent']
        }
        
        required_columns = templates.get(template_type, [])
        missing_columns = set(required_columns) - set([str(c).strip() for c in df.columns])
        
        if missing_columns:
            return False, f"Missing required columns: {', '.join(missing_columns)}"
        return True, "Valid"
    
    @staticmethod
    def get_daily_updates_summary(mall_id=None, start_date=None, end_date=None):
        """Get summary of daily updates data"""
        try:
            query = db.session.query(
                DailyUpdate.mall_id,
                Mall.name.label('mall_name'),
                func.count(DailyUpdate.id).label('total_records'),
                func.sum(DailyUpdate.mall_footfall).label('total_footfall'),
                func.sum(DailyUpdate.cinema_walkin).label('total_cinema'),
                func.sum(DailyUpdate.parking_collection).label('total_parking'),
                func.avg(DailyUpdate.keb_usage_units).label('avg_keb'),
                func.avg(DailyUpdate.water_consumption_kl).label('avg_water'),
                func.max(DailyUpdate.update_date).label('last_update')
            ).join(Mall, DailyUpdate.mall_id == Mall.id)
            
            if mall_id:
                query = query.filter(DailyUpdate.mall_id == mall_id)
            if start_date:
                query = query.filter(DailyUpdate.update_date >= start_date)
            if end_date:
                query = query.filter(DailyUpdate.update_date <= end_date)
            
            query = query.group_by(DailyUpdate.mall_id, Mall.name)
            results = query.all()
            
            summary = []
            for r in results:
                summary.append({
                    'mall_id': r[0],
                    'mall_name': r[1],
                    'total_records': r[2] or 0,
                    'total_footfall': int(r[3] or 0),
                    'total_cinema': int(r[4] or 0),
                    'total_parking': float(r[5] or 0),
                    'avg_keb': float(r[6] or 0),
                    'avg_water': float(r[7] or 0),
                    'last_update': r[8].isoformat() if r[8] else None
                })
            
            return summary
        except Exception as e:
            print(f"Error getting daily updates summary: {e}")
            return []