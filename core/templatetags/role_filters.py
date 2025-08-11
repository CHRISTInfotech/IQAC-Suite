from django import template
from core.models import OrganizationRole

register = template.Library()

@register.filter(name='filter_by_id')
def filter_by_id(queryset, role_id):
    """
    Filter a queryset of roles by ID
    Usage: {{ available_roles|filter_by_id:role_id }}
    """
    try:
        return queryset.get(id=role_id)
    except (OrganizationRole.DoesNotExist, AttributeError):
        return None