# apps/core/views.py - Core application views including health check
from django.http import JsonResponse
from django.views.decorators.http import require_http_methods
from django.views.decorators.csrf import csrf_exempt, ensure_csrf_cookie
from django.utils import timezone
from django.db import connection
from django.core.cache import cache
from django.conf import settings
from django.middleware.csrf import get_token
import logging
import sys

logger = logging.getLogger(__name__)


@require_http_methods(["GET"])
@csrf_exempt
def health_check(request):
    """
    Health check endpoint for monitoring system status.
    Returns detailed health information about various components.
    """
    try:
        health_data = {
            'status': 'healthy',
            'timestamp': timezone.now().isoformat(),
            'version': getattr(settings, 'VERSION', '1.0.0'),
            'environment': 'production' if not settings.DEBUG else 'development',
            'checks': {}
        }

        overall_status = True

        # Database health check
        try:
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1")
                cursor.fetchone()
            health_data['checks']['database'] = {
                'status': 'healthy',
                'message': 'Database connection successful'
            }
        except Exception as e:
            logger.error(f"Database health check failed: {e}")
            health_data['checks']['database'] = {
                'status': 'unhealthy',
                'message': f'Database connection failed: {str(e)}'
            }
            overall_status = False

        # Redis/Cache health check
        try:
            cache.set('health_check', 'test', 30)
            cached_value = cache.get('health_check')
            if cached_value == 'test':
                health_data['checks']['cache'] = {
                    'status': 'healthy',
                    'message': 'Cache (Redis) connection successful'
                }
            else:
                raise Exception("Cache test failed")
        except Exception as e:
            logger.error(f"Cache health check failed: {e}")
            health_data['checks']['cache'] = {
                'status': 'unhealthy',
                'message': f'Cache connection failed: {str(e)}'
            }
            overall_status = False

        # System resources check
        try:
            import psutil
            memory_usage = psutil.virtual_memory().percent
            cpu_usage = psutil.cpu_percent(interval=1)
            disk_usage = psutil.disk_usage('/').percent

            health_data['checks']['system'] = {
                'status': 'healthy' if memory_usage < 90 and cpu_usage < 90 and disk_usage < 90 else 'warning',
                'memory_usage': f"{memory_usage}%",
                'cpu_usage': f"{cpu_usage}%",
                'disk_usage': f"{disk_usage}%"
            }

            if memory_usage > 95 or cpu_usage > 95 or disk_usage > 95:
                overall_status = False
        except ImportError:
            health_data['checks']['system'] = {
                'status': 'unavailable',
                'message': 'psutil not installed - system metrics unavailable'
            }
        except Exception as e:
            logger.error(f"System health check failed: {e}")
            health_data['checks']['system'] = {
                'status': 'unhealthy',
                'message': f'System check failed: {str(e)}'
            }

        # WebSocket/Channels check
        try:
            from channels.layers import get_channel_layer
            channel_layer = get_channel_layer()
            if channel_layer:
                health_data['checks']['websocket'] = {
                    'status': 'healthy',
                    'message': 'WebSocket layer available'
                }
            else:
                raise Exception("Channel layer not configured")
        except Exception as e:
            logger.error(f"WebSocket health check failed: {e}")
            health_data['checks']['websocket'] = {
                'status': 'unhealthy',
                'message': f'WebSocket check failed: {str(e)}'
            }
            overall_status = False

        # Update overall status
        health_data['status'] = 'healthy' if overall_status else 'unhealthy'

        # Return appropriate HTTP status code
        status_code = 200 if overall_status else 503

        return JsonResponse(health_data, status=status_code)

    except Exception as e:
        logger.error(f"Health check endpoint failed: {e}")
        return JsonResponse({
            'status': 'error',
            'message': 'Health check failed',
            'error': str(e),
            'timestamp': timezone.now().isoformat()
        }, status=500)


@require_http_methods(["GET"])
@csrf_exempt
def system_info(request):
    """
    System information endpoint for monitoring and debugging.
    Only available in DEBUG mode or to authenticated users.
    """
    # Security check - only allow in development or for authenticated requests
    if not settings.DEBUG and not request.session.get('authenticated'):
        return JsonResponse({'error': 'Access denied'}, status=403)

    try:
        system_data = {
            'python_version': sys.version,
            'django_version': __import__('django').get_version(),
            'debug_mode': settings.DEBUG,
            'timezone': str(timezone.get_current_timezone()),
            'database_engine': settings.DATABASES['default']['ENGINE'],
            'installed_apps': list(settings.INSTALLED_APPS),
            'middleware': list(settings.MIDDLEWARE),
        }

        # Add more detailed info in DEBUG mode
        if settings.DEBUG:
            system_data.update({
                'secret_key_length': len(settings.SECRET_KEY),
                'allowed_hosts': settings.ALLOWED_HOSTS,
                'static_url': settings.STATIC_URL,
                'media_url': settings.MEDIA_URL,
            })

        return JsonResponse(system_data)

    except Exception as e:
        logger.error(f"System info endpoint failed: {e}")
        return JsonResponse({
            'error': 'Failed to retrieve system information',
            'message': str(e)
        }, status=500)


@require_http_methods(["GET"])
@csrf_exempt
def metrics(request):
    """
    Basic metrics endpoint for monitoring.
    """
    try:
        from apps.core.models import RoomActivityLog
        from datetime import timedelta

        # Calculate basic metrics
        now = timezone.now()
        last_hour = now - timedelta(hours=1)
        last_day = now - timedelta(days=1)

        metrics_data = {
            'timestamp': now.isoformat(),
            'rooms': {
                'created_last_hour': RoomActivityLog.objects.filter(
                    action='created',
                    timestamp__gte=last_hour
                ).count(),
                'created_last_day': RoomActivityLog.objects.filter(
                    action='created',
                    timestamp__gte=last_day
                ).count(),
                'total_created': RoomActivityLog.objects.filter(
                    action='created'
                ).count(),
            },
            'users': {
                'joined_last_hour': RoomActivityLog.objects.filter(
                    action='joined',
                    timestamp__gte=last_hour
                ).count(),
                'joined_last_day': RoomActivityLog.objects.filter(
                    action='joined',
                    timestamp__gte=last_day
                ).count(),
            }
        }

        return JsonResponse(metrics_data)

    except Exception as e:
        logger.error(f"Metrics endpoint failed: {e}")
        return JsonResponse({
            'error': 'Failed to retrieve metrics',
            'message': str(e)
        }, status=500)


@ensure_csrf_cookie
@require_http_methods(["GET"])
def get_csrf_token(request):
    """Get CSRF token for API requests"""
    token = get_token(request)
    return JsonResponse({'csrfToken': token})


def get_client_ip(request):
    """Extract client IP address from request"""
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0].strip()
    else:
        ip = request.META.get('REMOTE_ADDR')
    return ip
