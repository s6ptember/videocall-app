# rooms/consumers.py - WebSocket consumer for WebRTC signaling
import json
import logging
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.utils import timezone
from apps.rooms.models import RoomManager

logger = logging.getLogger(__name__)


class VideoCallConsumer(AsyncWebsocketConsumer):
    """
    WebSocket consumer for handling WebRTC signaling and room management.
    Implements secure peer-to-peer connection establishment.
    """

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.room_id = None
        self.room_group_name = None
        self.participant_id = None

    async def connect(self):
        """Handle WebSocket connection"""
        try:
            # Extract room ID from URL
            self.room_id = self.scope['url_route']['kwargs']['room_id']
            self.room_group_name = f'room_{self.room_id}'

            # Get participant ID from session or generate one
            session = self.scope.get('session', {})
            self.participant_id = session.get('session_key') or f'temp_{timezone.now().timestamp()}'

            # Verify room exists and user can join
            room_data = await self.get_room_data(self.room_id)

            if not room_data:
                await self.close(code=4004)  # Room not found
                return

            # Check room capacity
            participants = room_data.get('participants', [])
            max_participants = room_data.get('max_participants', 2)

            if len(participants) >= max_participants and self.participant_id not in participants:
                await self.close(code=4003)  # Room is full
                return

            # Join the room group
            await self.channel_layer.group_add(
                self.room_group_name,
                self.channel_name
            )

            # Accept the WebSocket connection
            await self.accept()

            # Notify other participants about new user
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'user_joined',
                    'participant_id': self.participant_id,
                    'timestamp': timezone.now().isoformat()
                }
            )

            logger.info(f"User {self.participant_id} connected to room {self.room_id}")

        except Exception as e:
            logger.error(f"WebSocket connection error: {e}")
            await self.close(code=4000)

    async def disconnect(self, close_code):
        """Handle WebSocket disconnection"""
        try:
            if self.room_group_name and self.participant_id:
                # Notify other participants about user leaving
                await self.channel_layer.group_send(
                    self.room_group_name,
                    {
                        'type': 'user_left',
                        'participant_id': self.participant_id,
                        'timestamp': timezone.now().isoformat()
                    }
                )

                # Remove user from room group
                await self.channel_layer.group_discard(
                    self.room_group_name,
                    self.channel_name
                )

                # Update room data
                await self.leave_room(self.room_id, self.participant_id)

            logger.info(f"User {self.participant_id} disconnected from room {self.room_id}")

        except Exception as e:
            logger.error(f"WebSocket disconnect error: {e}")

    async def receive(self, text_data):
        """Handle incoming WebSocket messages"""
        try:
            data = json.loads(text_data)
            message_type = data.get('type')

            # Validate message structure
            if not message_type:
                await self.send_error('Message type is required')
                return

            # Handle different message types
            if message_type == 'offer':
                await self.handle_webrtc_offer(data)
            elif message_type == 'answer':
                await self.handle_webrtc_answer(data)
            elif message_type == 'ice_candidate':
                await self.handle_ice_candidate(data)
            elif message_type == 'ping':
                await self.handle_ping()
            elif message_type == 'media_state':
                await self.handle_media_state(data)
            else:
                await self.send_error(f'Unknown message type: {message_type}')

        except json.JSONDecodeError:
            await self.send_error('Invalid JSON format')
        except Exception as e:
            logger.error(f"WebSocket receive error: {e}")
            await self.send_error('Message processing failed')

    async def handle_webrtc_offer(self, data):
        """Handle WebRTC offer from peer"""
        try:
            target_participant = data.get('target')
            offer = data.get('offer')

            if not offer:
                await self.send_error('Offer data is required')
                return

            # Forward offer to target participant or broadcast to room
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'webrtc_offer',
                    'offer': offer,
                    'sender': self.participant_id,
                    'target': target_participant,
                    'timestamp': timezone.now().isoformat()
                }
            )

        except Exception as e:
            logger.error(f"WebRTC offer handling error: {e}")
            await self.send_error('Failed to process offer')

    async def handle_webrtc_answer(self, data):
        """Handle WebRTC answer from peer"""
        try:
            target_participant = data.get('target')
            answer = data.get('answer')

            if not answer:
                await self.send_error('Answer data is required')
                return

            # Forward answer to target participant
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'webrtc_answer',
                    'answer': answer,
                    'sender': self.participant_id,
                    'target': target_participant,
                    'timestamp': timezone.now().isoformat()
                }
            )

        except Exception as e:
            logger.error(f"WebRTC answer handling error: {e}")
            await self.send_error('Failed to process answer')

    async def handle_ice_candidate(self, data):
        """Handle ICE candidate exchange"""
        try:
            target_participant = data.get('target')
            candidate = data.get('candidate')

            if not candidate:
                await self.send_error('ICE candidate data is required')
                return

            # Forward ICE candidate to target participant
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'ice_candidate',
                    'candidate': candidate,
                    'sender': self.participant_id,
                    'target': target_participant,
                    'timestamp': timezone.now().isoformat()
                }
            )

        except Exception as e:
            logger.error(f"ICE candidate handling error: {e}")
            await self.send_error('Failed to process ICE candidate')

    async def handle_ping(self):
        """Handle ping message for connection health check"""
        await self.send(text_data=json.dumps({
            'type': 'pong',
            'timestamp': timezone.now().isoformat()
        }))

    async def handle_media_state(self, data):
        """Handle media state changes (mute/unmute, video on/off)"""
        try:
            media_state = data.get('state', {})

            # Broadcast media state to other participants
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'media_state_update',
                    'participant_id': self.participant_id,
                    'state': media_state,
                    'timestamp': timezone.now().isoformat()
                }
            )

        except Exception as e:
            logger.error(f"Media state handling error: {e}")
            await self.send_error('Failed to process media state')

    # Group message handlers
    async def user_joined(self, event):
        """Send user joined notification"""
        if event['participant_id'] != self.participant_id:
            await self.send(text_data=json.dumps({
                'type': 'user_joined',
                'participant_id': event['participant_id'],
                'timestamp': event['timestamp']
            }))

    async def user_left(self, event):
        """Send user left notification"""
        if event['participant_id'] != self.participant_id:
            await self.send(text_data=json.dumps({
                'type': 'user_left',
                'participant_id': event['participant_id'],
                'timestamp': event['timestamp']
            }))

    async def webrtc_offer(self, event):
        """Forward WebRTC offer to client"""
        # Only send to target participant or broadcast if no target specified
        if not event.get('target') or event['target'] == self.participant_id:
            if event['sender'] != self.participant_id:
                await self.send(text_data=json.dumps({
                    'type': 'webrtc_offer',
                    'offer': event['offer'],
                    'sender': event['sender'],
                    'timestamp': event['timestamp']
                }))

    async def webrtc_answer(self, event):
        """Forward WebRTC answer to client"""
        if event.get('target') == self.participant_id:
            await self.send(text_data=json.dumps({
                'type': 'webrtc_answer',
                'answer': event['answer'],
                'sender': event['sender'],
                'timestamp': event['timestamp']
            }))

    async def ice_candidate(self, event):
        """Forward ICE candidate to client"""
        # Only send to target participant or broadcast if no target specified
        if not event.get('target') or event['target'] == self.participant_id:
            if event['sender'] != self.participant_id:
                await self.send(text_data=json.dumps({
                    'type': 'ice_candidate',
                    'candidate': event['candidate'],
                    'sender': event['sender'],
                    'timestamp': event['timestamp']
                }))

    async def media_state_update(self, event):
        """Forward media state update to client"""
        if event['participant_id'] != self.participant_id:
            await self.send(text_data=json.dumps({
                'type': 'media_state_update',
                'participant_id': event['participant_id'],
                'state': event['state'],
                'timestamp': event['timestamp']
            }))

    # Helper methods
    async def send_error(self, error_message):
        """Send error message to client"""
        await self.send(text_data=json.dumps({
            'type': 'error',
            'message': error_message,
            'timestamp': timezone.now().isoformat()
        }))

    @database_sync_to_async
    def get_room_data(self, room_id):
        """Get room data from Redis"""
        return RoomManager.get_room_by_id(room_id)

    @database_sync_to_async
    def leave_room(self, room_id, participant_id):
        """Remove participant from room"""
        return RoomManager.leave_room(room_id, participant_id)
