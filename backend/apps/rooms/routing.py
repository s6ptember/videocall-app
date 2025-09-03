# rooms/routing.py - WebSocket URL routing
from django.urls import path
from apps.rooms import consumers

websocket_urlpatterns = [
    path('ws/room/<str:room_id>/', consumers.VideoCallConsumer.as_asgi()),
]
