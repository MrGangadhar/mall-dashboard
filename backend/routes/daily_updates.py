from flask import Blueprint, request, jsonify
from flask_cors import cross_origin
from services.auth_service import token_required
from database.models import db, DailyUpdate, Mall
from datetime import datetime, timedelta
import logging

daily_updates_bp = Blueprint('daily_updates', __name__)
logger = logging.getLogger(__name__)


@daily_updates_bp.route('/daily-updates', methods=['POST'])
@cross_origin(supports_credentials=True)
@token_required
def create_daily_update():
    """Create a new daily update (manual entry)"""
    try:
        data = request.json
        user_id = request.current_user.id

        # Required fields
        if not data.get('mall_id'):
            return jsonify({'error': 'mall_id is required'}), 400
        if not data.get('update_date'):
            return jsonify({'error': 'update_date is required'}), 400

        # Parse date
        try:
            update_date = datetime.strptime(data['update_date'], '%Y-%m-%d').date()
        except ValueError:
            return jsonify({'error': 'Invalid date format. Use YYYY-MM-DD'}), 400

        # Check for existing record
        existing = DailyUpdate.query.filter_by(
            mall_id=data['mall_id'],
            update_date=update_date
        ).first()
        if existing:
            return jsonify({'error': 'Update already exists for this mall on this date'}), 400

        # Create new record
        update = DailyUpdate(
            mall_id=data['mall_id'],
            update_date=update_date,
            mall_footfall=data.get('mall_footfall', 0),
            cinema_walkin=data.get('cinema_walkin', 0),
            parking_collection=data.get('parking_collection', 0.0),
            two_wheeler_count=data.get('two_wheeler_count', 0),
            four_wheeler_count=data.get('four_wheeler_count', 0),
            keb_usage_units=data.get('keb_usage_units', 0.0),
            dg_usage_units=data.get('dg_usage_units', 0.0),
            water_consumption_kl=data.get('water_consumption_kl', 0.0),
            water_tankers_purchased=data.get('water_tankers_purchased', 0),
            stp_treated_water_kl=data.get('stp_treated_water_kl', 0.0),
            diesel_consumption_ltr=data.get('diesel_consumption_ltr', 0.0),
            garbage_collected=data.get('garbage_collected', False),
            work_permits_raised=data.get('work_permits_raised', 0),
            customer_feedback_count=data.get('customer_feedback_count', 0),
            remarks=data.get('remarks', ''),
            created_by=user_id
        )
        db.session.add(update)
        db.session.commit()

        # Return the new record (using to_dict if available)
        if hasattr(update, 'to_dict'):
            response_data = update.to_dict()
        else:
            response_data = {'id': update.id, 'message': 'Created'}

        return jsonify({
            'success': True,
            'message': 'Daily update saved successfully',
            'data': response_data
        }), 201

    except Exception as e:
        db.session.rollback()
        logger.error(f"Error creating daily update: {e}", exc_info=True)
        return jsonify({'error': str(e)}), 500


@daily_updates_bp.route('/daily-updates', methods=['GET'])
@cross_origin(supports_credentials=True)
@token_required
def get_daily_updates():
    """Get daily updates with optional filters (mall, date range)"""
    try:
        mall_id = request.args.get('mall_id', type=int)
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        limit = request.args.get('limit', 100, type=int)

        # Base query with explicit outerjoin to avoid excluding records if mall link fails
        query = db.session.query(DailyUpdate).outerjoin(
            Mall, DailyUpdate.mall_id == Mall.id
        ).order_by(DailyUpdate.update_date.desc())

        if mall_id:
            query = query.filter(DailyUpdate.mall_id == mall_id)

        if start_date:
            try:
                start = datetime.strptime(start_date, '%Y-%m-%d').date()
                query = query.filter(DailyUpdate.update_date >= start)
            except ValueError:
                pass

        if end_date:
            try:
                end = datetime.strptime(end_date, '%Y-%m-%d').date()
                query = query.filter(DailyUpdate.update_date <= end)
            except ValueError:
                pass

        if limit and limit > 0:
            query = query.limit(limit)

        updates = query.all()

        # Convert to list of dicts (safe fallback if to_dict missing)
        result = []
        for u in updates:
            if hasattr(u, 'to_dict'):
                result.append(u.to_dict())
            else:
                # Manual serialization (fallback)
                mall_name = u.mall.name if u.mall else None
                result.append({
                    'id': u.id,
                    'mall_id': u.mall_id,
                    'mall_name': mall_name,
                    'update_date': u.update_date.isoformat() if u.update_date else None,
                    'mall_footfall': u.mall_footfall,
                    'cinema_walkin': u.cinema_walkin,
                    'parking_collection': float(u.parking_collection) if u.parking_collection else 0,
                    'two_wheeler_count': u.two_wheeler_count,
                    'four_wheeler_count': u.four_wheeler_count,
                    'keb_usage_units': float(u.keb_usage_units) if u.keb_usage_units else 0,
                    'dg_usage_units': float(u.dg_usage_units) if u.dg_usage_units else 0,
                    'water_consumption_kl': float(u.water_consumption_kl) if u.water_consumption_kl else 0,
                    'water_tankers_purchased': u.water_tankers_purchased,
                    'stp_treated_water_kl': float(u.stp_treated_water_kl) if u.stp_treated_water_kl else 0,
                    'diesel_consumption_ltr': float(u.diesel_consumption_ltr) if u.diesel_consumption_ltr else 0,
                    'garbage_collected': u.garbage_collected,
                    'work_permits_raised': u.work_permits_raised,
                    'customer_feedback_count': u.customer_feedback_count,
                    'remarks': u.remarks,
                    'created_at': u.created_at.isoformat() if u.created_at else None,
                    'created_by': u.created_by
                })

        return jsonify(result), 200

    except Exception as e:
        logger.error(f"Error in get_daily_updates: {e}", exc_info=True)
        return jsonify({'error': str(e)}), 500


@daily_updates_bp.route('/daily-updates/comparison', methods=['GET'])
@cross_origin(supports_credentials=True)
@token_required
def get_comparison_data():
    """Get aggregated time‑series data for charts"""
    try:
        mall_id = request.args.get('mall_id', type=int)
        period = request.args.get('period', 'daily')
        start_date_param = request.args.get('start_date')
        end_date_param = request.args.get('end_date')

        query = DailyUpdate.query

        if mall_id:
            query = query.filter(DailyUpdate.mall_id == mall_id)

        # Handle explicit date range params if provided
        if start_date_param or end_date_param:
            if start_date_param:
                try:
                    start = datetime.strptime(start_date_param, '%Y-%m-%d').date()
                    query = query.filter(DailyUpdate.update_date >= start)
                except ValueError:
                    pass
            if end_date_param:
                try:
                    end = datetime.strptime(end_date_param, '%Y-%m-%d').date()
                    query = query.filter(DailyUpdate.update_date <= end)
                except ValueError:
                    pass
        elif period == 'all':
            # No date filter - return all records
            pass
        else:
            today = datetime.now().date()
            if period == 'daily':
                start_date = today - timedelta(days=7)
            elif period == 'weekly':
                start_date = today - timedelta(weeks=8)
            elif period == 'monthly':
                start_date = today - timedelta(days=365)
            else:
                start_date = today - timedelta(days=30)

            # Check if records exist in this relative window
            period_query = query.filter(DailyUpdate.update_date >= start_date)
            if period_query.count() > 0:
                query = period_query
            else:
                # Fallback: if no records exist in the recent window (e.g. system date vs data date mismatch),
                # return available records so visual analytics are displayed
                logger.info("No records in recent window, returning available records as fallback")

        updates = query.order_by(DailyUpdate.update_date).all()

        result = {
            'dates': [],
            'mall_footfall': [],
            'cinema_walkin': [],
            'parking_collection': [],
            'two_wheelers': [],
            'four_wheelers': [],
            'keb_usage': [],
            'dg_usage': [],
            'water_consumption': [],
            'diesel_consumption': []
        }

        for u in updates:
            result['dates'].append(u.update_date.strftime('%Y-%m-%d'))
            result['mall_footfall'].append(u.mall_footfall or 0)
            result['cinema_walkin'].append(u.cinema_walkin or 0)
            result['parking_collection'].append(float(u.parking_collection or 0))
            result['two_wheelers'].append(u.two_wheeler_count or 0)
            result['four_wheelers'].append(u.four_wheeler_count or 0)
            result['keb_usage'].append(float(u.keb_usage_units or 0))
            result['dg_usage'].append(float(u.dg_usage_units or 0))
            result['water_consumption'].append(float(u.water_consumption_kl or 0))
            result['diesel_consumption'].append(float(u.diesel_consumption_ltr or 0))

        return jsonify(result), 200

    except Exception as e:
        logger.error(f"Error in get_comparison_data: {e}", exc_info=True)
        return jsonify({'error': str(e)}), 500


@daily_updates_bp.route('/daily-updates/summary', methods=['GET'])
@cross_origin(supports_credentials=True)
@token_required
def get_mall_summary():
    """Get summary statistics per mall"""
    try:
        from sqlalchemy import func
        mall_id = request.args.get('mall_id', type=int)
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')

        query = db.session.query(
            Mall.id,
            Mall.name,
            func.count(DailyUpdate.id).label('total_updates'),
            func.sum(DailyUpdate.mall_footfall).label('total_footfall'),
            func.sum(DailyUpdate.cinema_walkin).label('total_cinema'),
            func.sum(DailyUpdate.parking_collection).label('total_parking'),
            func.avg(DailyUpdate.keb_usage_units).label('avg_keb'),
            func.avg(DailyUpdate.water_consumption_kl).label('avg_water')
        ).outerjoin(DailyUpdate, Mall.id == DailyUpdate.mall_id)

        if mall_id:
            query = query.filter(Mall.id == mall_id)

        if start_date:
            try:
                start = datetime.strptime(start_date, '%Y-%m-%d').date()
                query = query.filter(DailyUpdate.update_date >= start)
            except ValueError:
                pass

        if end_date:
            try:
                end = datetime.strptime(end_date, '%Y-%m-%d').date()
                query = query.filter(DailyUpdate.update_date <= end)
            except ValueError:
                pass

        query = query.group_by(Mall.id)

        results = query.all()
        summaries = []
        for r in results:
            summaries.append({
                'mall_id': r[0],
                'mall_name': r[1],
                'total_updates': r[2] or 0,
                'total_footfall': int(r[3] or 0),
                'total_cinema': int(r[4] or 0),
                'total_parking': float(r[5] or 0),
                'avg_keb': float(r[6] or 0),
                'avg_water': float(r[7] or 0)
            })

        return jsonify(summaries), 200

    except Exception as e:
        logger.error(f"Error in get_mall_summary: {e}", exc_info=True)
        return jsonify({'error': str(e)}), 500