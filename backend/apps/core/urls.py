# core/urls.py - Core application URL patterns
from django.urls import path
from . import views

app_name = 'core'

urlpatterns = [
    path('health/', views.health_check, name='health'),
    path('csrf/', views.get_csrf_token, name='csrf'),
]
