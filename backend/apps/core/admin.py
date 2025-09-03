# apps/core/admin.py - Админка для управления системными настройками
from django import forms
from django.contrib import admin
from django.contrib import messages
from django.contrib.auth.hashers import make_password
from django.utils.html import format_html
from django.urls import reverse
from django.utils.safestring import mark_safe
from django.core.exceptions import ValidationError
from .models import SystemSettings, RoomActivityLog


class SystemSettingsForm(forms.ModelForm):
    """Кастомная форма для системных настроек"""
    new_password = forms.CharField(
        widget=forms.PasswordInput,
        required=False,
        label='Новый пароль',
        help_text='Введите новый пароль для входа в систему (минимум 6 символов)'
    )
    confirm_password = forms.CharField(
        widget=forms.PasswordInput,
        required=False,
        label='Подтвердите пароль',
        help_text='Повторите новый пароль'
    )

    class Meta:
        model = SystemSettings
        fields = ['is_active']

    def clean(self):
        """Валидация формы"""
        cleaned_data = super().clean()
        new_password = cleaned_data.get('new_password')
        confirm_password = cleaned_data.get('confirm_password')

        if new_password or confirm_password:
            if not new_password:
                raise ValidationError('Введите новый пароль')

            if not confirm_password:
                raise ValidationError('Подтвердите пароль')

            if new_password != confirm_password:
                raise ValidationError('Пароли не совпадают')

            if len(new_password) < 6:
                raise ValidationError('Пароль должен содержать минимум 6 символов')

        return cleaned_data


@admin.register(SystemSettings)
class SystemSettingsAdmin(admin.ModelAdmin):
    """
    Админ-интерфейс для управления системными настройками
    """
    form = SystemSettingsForm
    list_display = ('id', 'is_active', 'created_at', 'updated_at', 'password_status')
    list_filter = ('is_active', 'created_at', 'updated_at')
    readonly_fields = ('created_at', 'updated_at', 'password_hash_preview')

    fieldsets = (
        ('Основные настройки', {
            'fields': ('is_active',)
        }),
        ('Безопасность', {
            'fields': ('new_password', 'confirm_password', 'password_hash_preview'),
            'description': 'Установите новый пароль для доступа к системе'
        }),
        ('Информация', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        })
    )

    def save_model(self, request, obj, form, change):
        """Обработка сохранения с проверкой пароля"""
        new_password = form.cleaned_data.get('new_password')

        if new_password:
            obj.set_password(new_password)
            self.message_user(
                request,
                'Пароль успешно изменен',
                level=messages.SUCCESS
            )

        super().save_model(request, obj, form, change)

    def password_status(self, obj):
        """Статус пароля"""
        if obj.access_password_hash:
            return format_html(
                '<span style="color: green;">✓ Установлен</span>'
            )
        return format_html(
            '<span style="color: red;">✗ Не установлен</span>'
        )
    password_status.short_description = 'Статус пароля'

    def password_hash_preview(self, obj):
        """Превью хеша пароля"""
        if obj.access_password_hash:
            hash_preview = obj.access_password_hash[:20] + '...' if len(obj.access_password_hash) > 20 else obj.access_password_hash
            return format_html(
                '<code style="background: #f8f9fa; padding: 2px 6px; border-radius: 3px;">{}</code>',
                hash_preview
            )
        return 'Пароль не установлен'
    password_hash_preview.short_description = 'Хеш пароля'

    def has_add_permission(self, request):
        """Ограничиваем создание - должен быть только один экземпляр настроек"""
        if SystemSettings.objects.exists():
            return False
        return True

    def has_delete_permission(self, request, obj=None):
        """Запрещаем удаление системных настроек"""
        return False

    def get_queryset(self, request):
        """Возвращаем queryset"""
        return super().get_queryset(request)

    class Media:
        css = {
            'all': ('admin/css/custom_admin.css',)
        }


@admin.register(RoomActivityLog)
class RoomActivityLogAdmin(admin.ModelAdmin):
    """
    Админ-интерфейс для просмотра логов активности комнат
    """
    list_display = ('room_id_short', 'action', 'participant_count', 'timestamp', 'ip_address')
    list_filter = ('action', 'timestamp')
    search_fields = ('room_id',)
    readonly_fields = ('room_id', 'action', 'timestamp', 'participant_count', 'ip_address', 'user_agent_hash')
    date_hierarchy = 'timestamp'
    ordering = ('-timestamp',)

    def room_id_short(self, obj):
        """Короткое отображение ID комнаты"""
        if obj.room_id:
            return f"{obj.room_id[:8]}..."
        return 'N/A'
    room_id_short.short_description = 'Room ID'

    def has_add_permission(self, request):
        """Запрещаем ручное добавление логов"""
        return False

    def has_change_permission(self, request, obj=None):
        """Запрещаем изменение логов"""
        return False

    def has_delete_permission(self, request, obj=None):
        """Разрешаем удаление только суперпользователям"""
        return request.user.is_superuser

    # Дополнительные действия
    actions = ['delete_old_logs']

    def delete_old_logs(self, request, queryset):
        """Удаление старых логов"""
        from datetime import datetime, timedelta
        old_date = datetime.now() - timedelta(days=30)
        count = RoomActivityLog.objects.filter(timestamp__lt=old_date).delete()[0]
        self.message_user(request, f'Удалено {count} старых записей (старше 30 дней)')
    delete_old_logs.short_description = 'Удалить логи старше 30 дней'


# Кастомизация админки
admin.site.site_header = 'Video Call Administration'
admin.site.site_title = 'Video Call Admin'
admin.site.index_title = 'Управление системой видеозвонков'
