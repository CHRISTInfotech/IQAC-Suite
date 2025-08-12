from django.conf import settings
from django.shortcuts import redirect
from django.urls import reverse
from core.models import RoleAssignment
from emt.models import Student
from django.contrib.auth.models import User
from django.contrib.auth import get_user_model
from django.contrib import messages  # Add this import
from .views import get_role_redirect_url  # Import the helper function

class RegistrationRequiredMiddleware:
    """Redirect authenticated users to the registration form until they register."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        user = request.user
        if user.is_authenticated and not user.is_superuser and not self._is_exempt_path(request.path):
            if not self._user_is_registered(user):
                return redirect('registration_form')
        return self.get_response(request)

    def _is_exempt_path(self, path):
        """Return True if the path should bypass registration enforcement."""
        exempt_paths = {
            reverse('registration_form'),
            reverse('logout'),
            reverse('login'),
            reverse('api_organizations'),
            reverse('api_roles'),
        }
        if path in exempt_paths:
            return True
        exempt_prefixes = (
            '/accounts/',
            '/admin/',
            '/core-admin/',
            settings.STATIC_URL,
            settings.MEDIA_URL,
        )
        return any(path.startswith(prefix) for prefix in exempt_prefixes)

    def _user_is_registered(self, user):
        """Check whether the user has completed registration."""
        domain = user.email.split('@')[-1].lower() if user.email else ''
        is_student = domain.endswith('christuniversity.in')
        if is_student:
            try:
                student = user.student_profile
            except Student.DoesNotExist:
                return False
            if not student.registration_number:
                return False
        return RoleAssignment.objects.filter(user=user).exists()

class RoleMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        return response

    def process_view(self, request, view_func, view_args, view_kwargs):
        if not request.user.is_authenticated:
            return None

        current_role = request.session.get('impersonated_role')
        if not current_role:
            return None

        # Define role-specific URL patterns
        role_patterns = {
            'student': ['/dashboard/', '/student/'],
            'faculty': ['/dashboard/', '/faculty/'],
            'tutor': ['/dashboard/', '/tutor/'],
            'admin': ['/core-admin/', '/dashboard/'],
        }

        # Always allow these URLs
        always_allowed = [
            '/accounts/logout/',
            '/media/',
            '/static/',
            '/favicon.ico',
            '/role-impersonation/',
        ]

        current_path = request.path
        
        # Allow access to always-allowed URLs
        if any(current_path.startswith(pattern) for pattern in always_allowed):
            return None

        # Get allowed patterns for current role
        allowed_patterns = role_patterns.get(current_role, [])
        
        # Check if current path is allowed
        if not any(current_path.startswith(pattern) for pattern in allowed_patterns):
            messages.warning(request, "Access restricted based on current role.")
            return redirect('user_dashboard')

        return None