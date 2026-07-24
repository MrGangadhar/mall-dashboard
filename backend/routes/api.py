from flask import Blueprint, request, jsonify, send_file
from flask_cors import cross_origin
from database.db_manager import DatabaseManager
from database.models import db, Mall, Brand, SalesData, WalkinData, RentData, UploadHistory
from services.analytics import AnalyticsService
from services.template_generator import TemplateGenerator
from services.auth_service import token_required
from datetime import datetime, timedelta
import logging

api_bp = Blueprint('api', __name__)
logger = logging.getLogger(__name__)


# ==================== DASHBOARD ENDPOINTS ====================

@api_bp.route('/dashboard/overview', methods=['GET'])
@cross_origin(supports_credentials=True)
@token_required
def get_dashboard_overview():
    """Get overall dashboard overview"""
    try:
        overview = DatabaseManager.get_dashboard_overview()
        return jsonify(overview), 200
    except Exception as e:
        logger.error(f"Error in /dashboard/overview: {e}", exc_info=True)
        return jsonify({'error': str(e)}), 500


@api_bp.route('/dashboard/mall-performance', methods=['GET'])
@cross_origin(supports_credentials=True)
@token_required
def get_mall_performance():
    """Get mall performance metrics"""
    try:
        mall_id = request.args.get('mall_id')
        period = request.args.get('period', 'month')
        performance = DatabaseManager.get_mall_performance(mall_id, period)
        return jsonify(performance), 200
    except Exception as e:
        logger.error(f"Error in /dashboard/mall-performance: {e}", exc_info=True)
        return jsonify({'error': str(e)}), 500


@api_bp.route('/dashboard/tenant-performance', methods=['GET'])
@cross_origin(supports_credentials=True)
@token_required
def get_tenant_performance():
    """Get tenant performance metrics"""
    try:
        mall_id = request.args.get('mall_id')
        brand_id = request.args.get('brand_id')
        performance = DatabaseManager.get_tenant_performance(mall_id, brand_id)
        return jsonify(performance), 200
    except Exception as e:
        logger.error(f"Error in /dashboard/tenant-performance: {e}", exc_info=True)
        return jsonify({'error': str(e)}), 500


# ==================== MALL ENDPOINTS ====================

@api_bp.route('/malls', methods=['GET'])
@cross_origin(supports_credentials=True)
@token_required
def get_malls():
    """Get all malls"""
    try:
        malls = Mall.query.order_by(Mall.name).all()
        result = []
        for mall in malls:
            # Safely count brands
            try:
                brand_count = mall.brands.count() if hasattr(mall.brands, 'count') else len(mall.brands or [])
            except:
                brand_count = 0

            result.append({
                'id': mall.id,
                'name': mall.name or '',
                'location': mall.location or '',
                'total_area': float(mall.total_area) if mall.total_area else 0,
                'parking_capacity': mall.parking_capacity or 0,
                'contact_person': mall.contact_person or '',
                'contact_email': mall.contact_email or '',
                'contact_phone': mall.contact_phone or '',
                'total_brands': brand_count,
                'created_at': mall.created_at.isoformat() if mall.created_at else None
            })
        return jsonify(result), 200
    except Exception as e:
        logger.error(f"Error in /malls GET: {e}", exc_info=True)
        return jsonify({'error': str(e)}), 500


@api_bp.route('/malls', methods=['POST'])
@cross_origin()
@token_required
def add_mall():
    """Add new mall"""
    try:
        data = request.json
        name = data.get('name')
        if not name:
            return jsonify({'error': 'Mall name is required'}), 400

        if Mall.query.filter_by(name=name).first():
            return jsonify({'error': 'Mall with this name already exists'}), 400

        mall = Mall(
            name=name,
            location=data.get('location'),
            total_area=data.get('total_area'),
            parking_capacity=data.get('parking_capacity'),
            contact_person=data.get('contact_person'),
            contact_email=data.get('contact_email'),
            contact_phone=data.get('contact_phone'),
            created_by=request.current_user.id
        )
        db.session.add(mall)
        db.session.commit()

        return jsonify({
            'success': True,
            'message': 'Mall added successfully',
            'mall': {'id': mall.id, 'name': mall.name}
        }), 201
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error in /malls POST: {e}", exc_info=True)
        return jsonify({'error': str(e)}), 500


# ==================== BRAND ENDPOINTS ====================

@api_bp.route('/brands', methods=['GET'])
@cross_origin(supports_credentials=True)
@token_required
def get_brands():
    """Get all brands with optional mall filter"""
    try:
        mall_id = request.args.get('mall_id')
        query = Brand.query.order_by(Brand.name)
        if mall_id:
            query = query.filter_by(mall_id=mall_id)
        brands = query.all()

        result = []
        for b in brands:
            result.append({
                'id': b.id,
                'name': b.name or '',
                'category': b.category or '',
                'sub_category': b.sub_category or '',
                'mall_id': b.mall_id,
                'mall_name': b.mall.name if b.mall else None,
                'store_area': float(b.store_area) if b.store_area else 0,
                'lease_start_date': b.lease_start_date.isoformat() if b.lease_start_date else None,
                'lease_end_date': b.lease_end_date.isoformat() if b.lease_end_date else None,
                'monthly_rent': float(b.monthly_rent) if b.monthly_rent else 0,
                'revenue_share_percentage': float(b.revenue_share_percentage) if b.revenue_share_percentage else 0,
                'status': b.status or 'Active',
                'contact_person': b.contact_person or '',
                'contact_email': b.contact_email or '',
                'contact_phone': b.contact_phone or ''
            })
        return jsonify(result), 200
    except Exception as e:
        logger.error(f"Error in /brands GET: {e}", exc_info=True)
        return jsonify({'error': str(e)}), 500


@api_bp.route('/brands', methods=['POST'])
@cross_origin()
@token_required
def add_brand():
    """Add new brand"""
    try:
        data = request.json
        name = data.get('name')
        mall_id = data.get('mall_id')
        if not name or not mall_id:
            return jsonify({'error': 'Brand name and Mall ID are required'}), 400

        if Brand.query.filter_by(name=name, mall_id=mall_id).first():
            return jsonify({'error': 'Brand already exists in this mall'}), 400

        brand = Brand(
            name=name,
            category=data.get('category'),
            sub_category=data.get('sub_category'),
            mall_id=mall_id,
            store_area=data.get('store_area'),
            lease_start_date=datetime.strptime(data.get('lease_start_date'), '%Y-%m-%d') if data.get('lease_start_date') else None,
            lease_end_date=datetime.strptime(data.get('lease_end_date'), '%Y-%m-%d') if data.get('lease_end_date') else None,
            monthly_rent=data.get('monthly_rent'),
            revenue_share_percentage=data.get('revenue_share_percentage'),
            contact_person=data.get('contact_person'),
            contact_email=data.get('contact_email'),
            contact_phone=data.get('contact_phone'),
            status='Active',
            created_by=request.current_user.id
        )
        db.session.add(brand)
        db.session.commit()

        return jsonify({
            'success': True,
            'message': 'Brand added successfully',
            'brand': {'id': brand.id, 'name': brand.name, 'mall_id': brand.mall_id}
        }), 201
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error in /brands POST: {e}", exc_info=True)
        return jsonify({'error': str(e)}), 500


@api_bp.route('/brands/bulk', methods=['POST'])
@cross_origin()
@token_required
def bulk_add_brands():
    """Bulk add brands"""
    try:
        data = request.json
        brands_data = data.get('brands', [])
        if not brands_data:
            return jsonify({'error': 'No brand data provided'}), 400

        success_count = 0
        errors = []

        for brand_info in brands_data:
            try:
                name = brand_info.get('brand_name')
                mall_id = brand_info.get('mall_id')
                if not name or not mall_id:
                    errors.append("Missing required fields (brand_name or mall_id)")
                    continue

                if Brand.query.filter_by(name=name, mall_id=mall_id).first():
                    errors.append(f"Brand '{name}' already exists in this mall")
                    continue

                brand = Brand(
                    name=name,
                    category=brand_info.get('category'),
                    mall_id=mall_id,
                    store_area=brand_info.get('store_area'),
                    lease_start_date=datetime.strptime(brand_info.get('lease_start_date'), '%Y-%m-%d') if brand_info.get('lease_start_date') else None,
                    lease_end_date=datetime.strptime(brand_info.get('lease_end_date'), '%Y-%m-%d') if brand_info.get('lease_end_date') else None,
                    monthly_rent=brand_info.get('monthly_rent'),
                    status='Active',
                    created_by=request.current_user.id
                )
                db.session.add(brand)
                success_count += 1
            except Exception as e:
                errors.append(str(e))

        db.session.commit()
        return jsonify({
            'success': True,
            'message': f'Successfully added {success_count} brands',
            'success_count': success_count,
            'error_count': len(errors),
            'errors': errors[:10]
        }), 201
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error in /brands/bulk: {e}", exc_info=True)
        return jsonify({'error': str(e)}), 500


# ==================== TEMPLATE ENDPOINTS ====================

@api_bp.route('/templates/download/<template_type>', methods=['GET'])
@cross_origin()
@token_required
def download_template(template_type):
    """Download data upload template"""
    try:
        template_generators = {
            'walkin': TemplateGenerator.generate_walkin_template,
            'sales': TemplateGenerator.generate_sales_template,
            'rent': TemplateGenerator.generate_rent_template,
            'brands': TemplateGenerator.generate_bulk_brand_template
        }
        if template_type not in template_generators:
            return jsonify({'error': 'Invalid template type'}), 400

        template_path = template_generators[template_type]()
        return send_file(
            template_path,
            mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            as_attachment=True,
            download_name=f'{template_type}_template.xlsx'
        )
    except Exception as e:
        logger.error(f"Error downloading template {template_type}: {e}", exc_info=True)
        return jsonify({'error': str(e)}), 500


# ==================== UPLOAD HISTORY ENDPOINTS ====================

@api_bp.route('/upload-history', methods=['GET'])
@cross_origin()
@token_required
def get_upload_history():
    """Get upload history"""
    try:
        mall_id = request.args.get('mall_id')
        days = request.args.get('days', 30, type=int)

        query = UploadHistory.query
        if mall_id:
            query = query.filter_by(mall_id=mall_id)

        cutoff_date = datetime.utcnow() - timedelta(days=days)
        query = query.filter(UploadHistory.uploaded_at >= cutoff_date)
        history = query.order_by(UploadHistory.uploaded_at.desc()).limit(50).all()

        result = []
        for h in history:
            result.append({
                'id': h.id,
                'file_name': h.file_name or '',
                'file_type': h.file_type or '',
                'mall_name': h.mall.name if h.mall else None,
                'month': h.month or '',
                'records_processed': h.records_processed or 0,
                'success_count': h.success_count or 0,
                'error_count': h.error_count or 0,
                'status': h.status or 'Unknown',
                'uploaded_at': h.uploaded_at.isoformat() if h.uploaded_at else None,
                'uploaded_by': h.uploaded_by_user.username if h.uploaded_by_user else None
            })
        return jsonify(result), 200
    except Exception as e:
        logger.error(f"Error in /upload-history: {e}", exc_info=True)
        return jsonify({'error': str(e)}), 500