# rooms/models.py - Room management models
import uuid
import string
import secrets
from datetime import timedelta
from django.conf import settings
from django.utils import timezone


class RoomManager:
    """
    Manager class for room operations using Redis for temporary storage.
    Implements all CRUD operations for video call rooms.
    """

    @staticmethod
    def _get_redis_client():
        """Get Redis client instance"""
        from django.core.cache import cache
        return cache

    @classmethod
    def generate_short_code(cls, length=None):
        """Generate a unique short code for room access"""
        length = length or getattr(settings, 'SHORT_CODE_LENGTH', 6)
        characters = string.ascii_uppercase + string.digits

        # Ensure uniqueness by checking existing codes
        cache = cls._get_redis_client()
        max_attempts = 100

        for _ in range(max_attempts):
            code = ''.join(secrets.choice(characters) for _ in range(length))
            if not cache.get(f'room_code_{code}'):
                return code

        raise ValueError("Unable to generate unique short code")

    @classmethod
    def create_room(cls, creator_ip=None):
        """Create a new video call room"""
        cache = cls._get_redis_client()

        room_data = {
            'room_id': str(uuid.uuid4()),
            'short_code': cls.generate_short_code(),
            'created_at': timezone.now().isoformat(),
            'participants': [],
            'is_active': True,
            'expires_at': (
                timezone.now() +
                timedelta(hours=getattr(settings, 'ROOM_EXPIRY_HOURS', 24))
            ).isoformat(),
            'creator_ip': creator_ip,
            'max_participants': getattr(settings, 'MAX_PARTICIPANTS_PER_ROOM', 2)
        }

        # Store room data with expiration
        cache.set(
            f'room_{room_data["room_id"]}',
            room_data,
            timeout=getattr(settings, 'ROOM_EXPIRY_HOURS', 24) * 3600
        )

        # Create code mapping for easy lookup
        cache.set(
            f'room_code_{room_data["short_code"]}',
            room_data["room_id"],
            timeout=getattr(settings, 'ROOM_EXPIRY_HOURS', 24) * 3600
        )

        # Log room creation
        from apps.core.models import RoomActivityLog
        RoomActivityLog.objects.create(
            room_id=room_data["room_id"],
            action='created',
            ip_address=creator_ip
        )

        return room_data

    @classmethod
    def get_room_by_id(cls, room_id):
        """Retrieve room data by room ID"""
        cache = cls._get_redis_client()
        return cache.get(f'room_{room_id}')

    @classmethod
    def get_room_by_code(cls, short_code):
        """Retrieve room data by short code"""
        cache = cls._get_redis_client()
        room_id = cache.get(f'room_code_{short_code}')

        if room_id:
            return cls.get_room_by_id(room_id)
        return None

    @classmethod
    def join_room(cls, room_identifier, participant_id, participant_ip=None):
        """
        Add participant to room.
        room_identifier can be either room_id or short_code
        """
        cache = cls._get_redis_client()

        # Try to get room by ID first, then by code
        room_data = cls.get_room_by_id(room_identifier)
        if not room_data:
            room_data = cls.get_room_by_code(room_identifier)

        if not room_data:
            return None, "Room not found"

        # Check if room is active and not expired
        if not room_data.get('is_active', False):
            return None, "Room is not active"

        expires_at = timezone.datetime.fromisoformat(
            room_data['expires_at'].replace('Z', '+00:00')
        )
        if timezone.now() > expires_at:
            cls.delete_room(room_data['room_id'])
            return None, "Room has expired"

        # Check participant limit
        current_participants = room_data.get('participants', [])
        max_participants = room_data.get('max_participants', 2)

        if len(current_participants) >= max_participants:
            return None, "Room is full"

        # Add participant if not already in room
        if participant_id not in current_participants:
            current_participants.append(participant_id)
            room_data['participants'] = current_participants

            # Update room data
            cache.set(
                f'room_{room_data["room_id"]}',
                room_data,
                timeout=getattr(settings, 'ROOM_EXPIRY_HOURS', 24) * 3600
            )

            # Log participant join
            from apps.core.models import RoomActivityLog
            RoomActivityLog.objects.create(
                room_id=room_data["room_id"],
                action='joined',
                participant_count=len(current_participants),
                ip_address=participant_ip
            )

        return room_data, "Successfully joined room"

    @classmethod
    def leave_room(cls, room_id, participant_id):
        """Remove participant from room"""
        cache = cls._get_redis_client()
        room_data = cls.get_room_by_id(room_id)

        if not room_data:
            return False

        participants = room_data.get('participants', [])
        if participant_id in participants:
            participants.remove(participant_id)
            room_data['participants'] = participants

            # Update room data
            cache.set(
                f'room_{room_id}',
                room_data,
                timeout=getattr(settings, 'ROOM_EXPIRY_HOURS', 24) * 3600
            )

            # Log participant leave
            from apps.core.models import RoomActivityLog
            RoomActivityLog.objects.create(
                room_id=room_id,
                action='left',
                participant_count=len(participants)
            )

            # Delete room if no participants left
            if not participants:
                cls.delete_room(room_id)

            return True

        return False

    @classmethod
    def delete_room(cls, room_id):
        """Delete room and clean up all associated data"""
        cache = cls._get_redis_client()
        room_data = cls.get_room_by_id(room_id)

        if room_data:
            # Remove code mapping
            short_code = room_data.get('short_code')
            if short_code:
                cache.delete(f'room_code_{short_code}')

            # Remove room data
            cache.delete(f'room_{room_id}')

            # Log room deletion
            from apps.core.models import RoomActivityLog
            RoomActivityLog.objects.create(
                room_id=room_id,
                action='deleted'
            )

            return True

        return False

    @classmethod
    def cleanup_expired_rooms(cls):
        """Clean up expired rooms (to be called by scheduled task)"""
        # This would typically be implemented as a management command
        # or scheduled task using Django-Q or Celery
        pass
