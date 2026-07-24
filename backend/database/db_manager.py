from sqlalchemy import func, and_, or_, desc, extract
from datetime import datetime, timedelta
from .models import db, User, Mall, Brand, SalesData, WalkinData, RentData, UploadHistory
import pandas as pd
import numpy as np
from sqlalchemy.sql import case

class DatabaseManager:
    
    @staticmethod
    def get_dashboard_overview():
        """Get overall dashboard statistics"""
        try:
            # Get total malls count
            total_malls = Mall.query.count()
            
            # Get total brands count
            total_brands = Brand.query.count()
            
            # Get active brands count
            active_brands = Brand.query.filter_by(status='Active').count()
            
            # Get total sales (sum of all sales)
            total_sales = db.session.query(func.sum(SalesData.total_sales)).scalar() or 0
            
            # Get total footfall (sum of all walk-in footfall)
            total_footfall = db.session.query(func.sum(WalkinData.footfall)).scalar() or 0
            
            # Get total rent (sum of all rent)
            total_rent = db.session.query(func.sum(RentData.total_rent)).scalar() or 0
            
            # Get pending rent (Pending or Overdue)
            pending_rent = db.session.query(func.sum(RentData.total_rent))\
                .filter(RentData.payment_status.in_(['Pending', 'Overdue']))\
                .scalar() or 0
            
            # Get collected rent (Paid)
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
        """Get performance metrics for malls"""
        try:
            query = db.session.query(
                Mall.id,
                Mall.name,
                func.count(func.distinct(Brand.id)).label('total_brands'),
                func.coalesce(func.sum(SalesData.total_sales), 0).label('total_sales'),
                func.coalesce(func.sum(WalkinData.footfall), 0).label('total_footfall'),
                func.coalesce(func.sum(RentData.total_rent), 0).label('total_rent')
            ).outerjoin(Brand, Mall.id == Brand.mall_id)\
             .outerjoin(SalesData, Mall.id == SalesData.mall_id)\
             .outerjoin(WalkinData, Mall.id == WalkinData.mall_id)\
             .outerjoin(RentData, Mall.id == RentData.mall_id)
            
            if mall_id:
                query = query.filter(Mall.id == mall_id)
            
            if period == 'month':
                current_month = datetime.now().strftime('%Y-%m')
                query = query.filter(
                    or_(
                        SalesData.date.like(f"{current_month}-%"),
                        WalkinData.date.like(f"{current_month}-%"),
                        RentData.month == current_month
                    )
                )
            elif period == 'week':
                current_week_start = datetime.now() - timedelta(days=datetime.now().weekday())
                current_week_end = current_week_start + timedelta(days=6)
                query = query.filter(
                    or_(
                        SalesData.date.between(current_week_start, current_week_end),
                        WalkinData.date.between(current_week_start, current_week_end)
                    )
                )
            
            query = query.group_by(Mall.id)
            results = query.all()
            
            performance = []
            for r in results:
                performance.append({
                    'mall_id': r[0],
                    'mall_name': r[1],
                    'total_brands': r[2] or 0,
                    'total_sales': float(r[3] or 0),
                    'total_footfall': int(r[4] or 0),
                    'total_rent': float(r[5] or 0)
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
        """Validate if mall and brand exist and are onboarded"""
        try:
            mall = Mall.query.filter_by(name=mall_name).first()
            if not mall:
                return False, f"Mall '{mall_name}' not found. Please onboard the mall first."
            
            brand = Brand.query.filter_by(name=brand_name, mall_id=mall.id).first()
            if not brand:
                return False, f"Brand '{brand_name}' not found in {mall_name}. Please onboard the brand first."
            
            return True, (mall.id, brand.id)
        except Exception as e:
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
        missing_columns = set(required_columns) - set(df.columns)
        
        if missing_columns:
            return False, f"Missing required columns: {', '.join(missing_columns)}"
        return True, "Valid"
    
    @staticmethod
    def get_daily_updates_summary(mall_id=None, start_date=None, end_date=None):
        """Get summary of daily updates data"""
        try:
            from .models import DailyUpdate
            
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