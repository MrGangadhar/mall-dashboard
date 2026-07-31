from flask_sqlalchemy import SQLAlchemy
from flask_login import UserMixin
from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash
from sqlalchemy import Numeric, Enum  # explicit imports for clarity

db = SQLAlchemy()

class User(UserMixin, db.Model):
    __tablename__ = 'users'

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(200), nullable=False)
    full_name = db.Column(db.String(100))
    role = db.Column(db.String(50), default='user')
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    last_login = db.Column(db.DateTime)

    # Relationships
    uploads = db.relationship('UploadHistory', backref='uploaded_by_user', lazy=True)
    created_malls = db.relationship('Mall', backref='creator', lazy=True, foreign_keys='Mall.created_by')
    created_brands = db.relationship('Brand', backref='creator', lazy=True, foreign_keys='Brand.created_by')

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    def __repr__(self):
        return f'<User {self.username}>'


class Mall(db.Model):
    __tablename__ = 'malls'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), unique=True, nullable=False)
    location = db.Column(db.String(200))
    total_area = db.Column(db.Float)
    parking_capacity = db.Column(db.Integer)
    contact_person = db.Column(db.String(100))
    contact_email = db.Column(db.String(120))
    contact_phone = db.Column(db.String(20))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'))

    # Relationships
    brands = db.relationship('Brand', backref='mall', lazy='dynamic', cascade='all, delete-orphan')
    walkin_data = db.relationship('WalkinData', backref='mall', lazy='dynamic', cascade='all, delete-orphan')
    rent_data = db.relationship('RentData', backref='mall', lazy='dynamic', cascade='all, delete-orphan')
    daily_updates = db.relationship('DailyUpdate', backref='mall', lazy='dynamic', cascade='all, delete-orphan')

    def __repr__(self):
        return f'<Mall {self.name}>'


class Brand(db.Model):
    __tablename__ = 'brands'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    category = db.Column(db.String(50))
    sub_category = db.Column(db.String(50))
    mall_id = db.Column(db.Integer, db.ForeignKey('malls.id', ondelete='CASCADE'))
    store_area = db.Column(db.Float)
    lease_start_date = db.Column(db.Date)
    lease_end_date = db.Column(db.Date)
    monthly_rent = db.Column(Numeric(15, 2))
    revenue_share_percentage = db.Column(Numeric(5, 2))
    contact_person = db.Column(db.String(100))
    contact_email = db.Column(db.String(120))
    contact_phone = db.Column(db.String(20))
    status = db.Column(db.String(20), default='Active')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'))

    __table_args__ = (
        db.UniqueConstraint('mall_id', 'name', name='unique_mall_brand'),
    )

    # Relationships
    sales_data = db.relationship('SalesData', backref='brand', lazy='dynamic', cascade='all, delete-orphan')
    rent_data = db.relationship('RentData', backref='brand', lazy='dynamic', cascade='all, delete-orphan')

    def __repr__(self):
        return f'<Brand {self.name}>'


class WalkinData(db.Model):
    __tablename__ = 'walkin_data'

    id = db.Column(db.Integer, primary_key=True)
    mall_id = db.Column(db.Integer, db.ForeignKey('malls.id', ondelete='CASCADE'))
    date = db.Column(db.Date, nullable=False)
    footfall = db.Column(db.Integer)
    peak_hour_visitors = db.Column(db.Integer)
    peak_hour_start = db.Column(db.String(10))
    peak_hour_end = db.Column(db.String(10))
    average_dwell_time = db.Column(db.Integer)
    visitor_demographics = db.Column(db.JSON)
    weather_condition = db.Column(db.String(50))
    special_event = db.Column(db.String(100))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'))

    __table_args__ = (
        db.UniqueConstraint('mall_id', 'date', name='unique_walkin_record'),
    )

    def __repr__(self):
        return f'<WalkinData {self.date} - Mall {self.mall_id}>'


class SalesData(db.Model):
    __tablename__ = 'sales_data'

    id = db.Column(db.Integer, primary_key=True)
    mall_id = db.Column(db.Integer, db.ForeignKey('malls.id', ondelete='CASCADE'))
    brand_id = db.Column(db.Integer, db.ForeignKey('brands.id', ondelete='CASCADE'))
    date = db.Column(db.Date, nullable=False)
    total_sales = db.Column(Numeric(15, 2))
    transaction_count = db.Column(db.Integer)
    average_transaction_value = db.Column(Numeric(15, 2))
    customer_count = db.Column(db.Integer)
    returns_amount = db.Column(Numeric(15, 2), default=0)
    discount_amount = db.Column(Numeric(15, 2), default=0)
    net_sales = db.Column(Numeric(15, 2))
    tax_amount = db.Column(Numeric(15, 2), default=0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'))

    __table_args__ = (
        db.UniqueConstraint('mall_id', 'brand_id', 'date', name='unique_sales_record'),
    )

    def __repr__(self):
        return f'<SalesData {self.date} - Brand {self.brand_id}>'


class RentData(db.Model):
    __tablename__ = 'rent_data'

    id = db.Column(db.Integer, primary_key=True)
    mall_id = db.Column(db.Integer, db.ForeignKey('malls.id', ondelete='CASCADE'))
    brand_id = db.Column(db.Integer, db.ForeignKey('brands.id', ondelete='CASCADE'))
    month = db.Column(db.String(7), nullable=False)
    base_rent = db.Column(Numeric(15, 2))
    revenue_share = db.Column(Numeric(5, 2))
    revenue_share_amount = db.Column(Numeric(15, 2))
    maintenance_charges = db.Column(Numeric(15, 2))
    other_charges = db.Column(Numeric(15, 2), default=0)
    total_rent = db.Column(Numeric(15, 2))
    payment_status = db.Column(Enum('Paid', 'Pending', 'Overdue', 'Partial', name='payment_status_enum'), default='Pending')
    payment_date = db.Column(db.Date)
    payment_method = db.Column(db.String(50))
    invoice_number = db.Column(db.String(50))
    remarks = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'))

    __table_args__ = (
        db.UniqueConstraint('mall_id', 'brand_id', 'month', name='unique_rent_record'),
    )

    def __repr__(self):
        return f'<RentData {self.month} - Brand {self.brand_id}>'


class UploadHistory(db.Model):
    __tablename__ = 'upload_history'

    id = db.Column(db.Integer, primary_key=True)
    file_name = db.Column(db.String(255))
    file_type = db.Column(db.String(50))
    mall_id = db.Column(db.Integer, db.ForeignKey('malls.id'))
    month = db.Column(db.String(7))
    records_processed = db.Column(db.Integer)
    success_count = db.Column(db.Integer)
    error_count = db.Column(db.Integer)
    error_log = db.Column(db.Text)
    status = db.Column(db.String(50))
    uploaded_at = db.Column(db.DateTime, default=datetime.utcnow)
    uploaded_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    completion_time = db.Column(db.DateTime)

    def __repr__(self):
        return f'<UploadHistory {self.file_name} - {self.status}>'


class TemplateMaster(db.Model):
    __tablename__ = 'template_master'

    id = db.Column(db.Integer, primary_key=True)
    template_type = db.Column(db.String(50), unique=True)
    template_name = db.Column(db.String(100))
    column_mapping = db.Column(db.JSON)
    required_columns = db.Column(db.JSON)
    sample_data = db.Column(db.JSON)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def __repr__(self):
        return f'<TemplateMaster {self.template_type}>'


# ==================== DAILY UPDATE MODEL ====================
class DailyUpdate(db.Model):
    __tablename__ = 'daily_updates'

    id = db.Column(db.Integer, primary_key=True)
    mall_id = db.Column(db.Integer, db.ForeignKey('malls.id', ondelete='CASCADE'))
    update_date = db.Column(db.Date, nullable=False, default=datetime.utcnow)

    # Walk-in Data
    mall_footfall = db.Column(db.Integer, default=0)
    cinema_walkin = db.Column(db.Integer, default=0)

    # Parking Data
    parking_collection = db.Column(Numeric(15, 2), default=0.00)
    two_wheeler_count = db.Column(db.Integer, default=0)
    four_wheeler_count = db.Column(db.Integer, default=0)

    # Utility Usage
    keb_usage_units = db.Column(Numeric(10, 2), default=0.00)
    dg_usage_units = db.Column(Numeric(10, 2), default=0.00)
    water_consumption_kl = db.Column(Numeric(10, 2), default=0.00)
    water_tankers_purchased = db.Column(db.Integer, default=0)
    stp_treated_water_kl = db.Column(Numeric(10, 2), default=0.00)
    diesel_consumption_ltr = db.Column(Numeric(10, 2), default=0.00)

    # Operations
    garbage_collected = db.Column(db.Boolean, default=False)
    work_permits_raised = db.Column(db.Integer, default=0)
    customer_feedback_count = db.Column(db.Integer, default=0)

    # Metadata
    remarks = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'))

    # Relationships
    creator = db.relationship('User', backref='daily_updates_created', foreign_keys=[created_by])
    # Note: 'mall' relationship is provided by the backref in Mall

    __table_args__ = (db.UniqueConstraint('mall_id', 'update_date', name='unique_daily_update'),)

    def to_dict(self):
        """Convert to dictionary for JSON response."""
        return {
            'id': self.id,
            'mall_id': self.mall_id,
            'mall_name': self.mall.name if self.mall else None,
            'update_date': self.update_date.isoformat() if self.update_date else None,
            'mall_footfall': self.mall_footfall,
            'cinema_walkin': self.cinema_walkin,
            'parking_collection': float(self.parking_collection) if self.parking_collection else 0,
            'two_wheeler_count': self.two_wheeler_count,
            'four_wheeler_count': self.four_wheeler_count,
            'keb_usage_units': float(self.keb_usage_units) if self.keb_usage_units else 0,
            'dg_usage_units': float(self.dg_usage_units) if self.dg_usage_units else 0,
            'water_consumption_kl': float(self.water_consumption_kl) if self.water_consumption_kl else 0,
            'water_tankers_purchased': self.water_tankers_purchased,
            'stp_treated_water_kl': float(self.stp_treated_water_kl) if self.stp_treated_water_kl else 0,
            'diesel_consumption_ltr': float(self.diesel_consumption_ltr) if self.diesel_consumption_ltr else 0,
            'garbage_collected': self.garbage_collected,
            'work_permits_raised': self.work_permits_raised,
            'customer_feedback_count': self.customer_feedback_count,
            'remarks': self.remarks,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'created_by': self.created_by
        }

    def __repr__(self):
        return f'<DailyUpdate {self.update_date} - Mall {self.mall_id}>'