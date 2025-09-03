# core/models.py - Core system models for video call application
from django.db import models
from django.contrib.auth.hashers import make_password, check_password
from django.utils import timezone


class SystemSettings(models.Model):
    """
    Model for storing system-wide settings like access password.
    Follows singleton pattern - only one instance should exist.
    """
    access_password_hash = models.CharField(
        max_length=255,
        help_text="Hashed password for system access"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        verbose_name = "System Settings"
        verbose_name_plural = "System Settings"

    def set_password(self, raw_password):
        """Set and hash the access password"""
        self.access_password_hash = make_password(raw_password)

    def check_password(self, raw_password):
        """Check if provided password matches stored hash"""
        return check_password(raw_password, self.access_password_hash)

    @classmethod
    def get_settings(cls):
        """Get or create system settings instance"""
        settings, created = cls.objects.get_or_create(
            pk=1,
            defaults={
                'access_password_hash': make_password('admin123'),
                'is_active': True
            }
        )
        return settings

    def save(self, *args, **kwargs):
        """Ensure only one settings instance exists"""
        self.pk = 1
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        """Prevent deletion of system settings"""
        pass

    def __str__(self):
        return f"System Settings (Updated: {self.updated_at.strftime('%Y-%m-%d %H:%M')})"


class RoomActivityLog(models.Model):
    """
    Model for logging room activities without storing personal data.
    Used for analytics and system monitoring.
    """
    ACTION_CHOICES = [
        ('created', 'Room Created'),
        ('joined', 'User Joined'),
        ('left', 'User Left'),
        ('expired', 'Room Expired'),
        ('deleted', 'Room Deleted'),
    ]

    room_id = models.CharField(max_length=36, db_index=True)  # UUID
    action = models.CharField(max_length=20, choices=ACTION_CHOICES)
    timestamp = models.DateTimeField(auto_now_add=True)
    participant_count = models.PositiveIntegerField(default=0)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent_hash = models.CharField(
        max_length=64,
        null=True,
        blank=True,
        help_text="Hashed user agent for basic analytics"
    )

    class Meta:
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['room_id', '-timestamp']),
            models.Index(fields=['action', '-timestamp']),
        ]
        verbose_name = "Room Activity Log"
        verbose_name_plural = "Room Activity Logs"

    def __str__(self):
        return f"{self.get_action_display()} - {self.room_id[:8]}... at {self.timestamp.strftime('%Y-%m-%d %H:%M:%S')}"
