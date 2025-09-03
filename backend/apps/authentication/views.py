# authentication/views.py - Authentication API views
import hashlib
from django.contrib.auth import login, logout
from django.contrib.auth.models import User
from django.contrib.sessions.models import Session
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from django.utils import timezone
from datetime import timedelta
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from django_ratelimit.decorators import ratelimit
from apps.core.models import SystemSettings
import logging

logger = logging.getLogger(__name__)


def get_client_ip(request):
    """Extract client IP address from request"""
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0].strip()
    else:
        ip = request.META.get('REMOTE_ADDR')
    return ip


@api_view(['POST'])
@permission_classes([AllowAny])
@csrf_exempt
@ratelimit(key='ip', rate='10/min', method='POST', block=True)
def login_view(request):
    """
    Authenticate user with system password.
    Rate limited to prevent brute force attacks.
    """
    try:
        password = request.data.get('password')

        if not password:
            return Response(
                {'error': 'Password is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        settings_obj = SystemSettings.get_settings()

        if settings_obj.check_password(password):
            # Create or get session
            if not request.session.session_key:
                request.session.create()

            # Store authentication in session
            request.session['authenticated'] = True
            request.session['auth_timestamp'] = timezone.now().isoformat()
            request.session['client_ip'] = get_client_ip(request)
            request.session.save()

            logger.info(f"Successful login from IP: {get_client_ip(request)}")

            return Response({
                'success': True,
                'message': 'Authentication successful',
                'session_key': request.session.session_key
            })
        else:
            logger.warning(f"Failed login attempt from IP: {get_client_ip(request)}")
            return Response(
                {'error': 'Invalid password'},
                status=status.HTTP_401_UNAUTHORIZED
            )

    except Exception as e:
        logger.error(f"Login failed: {e}")
        return Response(
            {'error': 'Authentication failed'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([AllowAny])
@csrf_exempt
def logout_view(request):
    """Clear user session and log out"""
    try:
        request.session.flush()
        logger.info("User logged out successfully")
        return Response({
            'success': True,
            'message': 'Logged out successfully'
        })
    except Exception as e:
        logger.error(f"Logout failed: {e}")
        return Response(
            {'error': 'Logout failed'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([AllowAny])
@csrf_exempt
def check_auth_view(request):
    """Check if user is authenticated"""
    is_authenticated = request.session.get('authenticated', False)

    if is_authenticated:
        # Optional: Check session age for additional security
        auth_timestamp = request.session.get('auth_timestamp')
        if auth_timestamp:
            try:
                auth_time = timezone.datetime.fromisoformat(auth_timestamp)
                if timezone.now() - auth_time > timedelta(hours=24):
                    request.session.flush()
                    is_authenticated = False
            except (ValueError, TypeError):
                request.session.flush()
                is_authenticated = False

    return Response({
        'authenticated': is_authenticated,
        'session_key': request.session.session_key if is_authenticated else None
    })
