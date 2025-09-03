# authentication/urls.py - Authentication URL patterns
from django.urls import path
from . import views

app_name = 'authentication'

urlpatterns = [
    path('login/', views.login_view, name='login'),
    path('logout/', views.logout_view, name='logout'),
    path('check/', views.check_auth_view, name='check'),
]
