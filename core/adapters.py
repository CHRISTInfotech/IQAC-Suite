from allauth.socialaccount.adapter import DefaultSocialAccountAdapter
from django.utils.text import slugify
from django.contrib.auth.models import User
from core.models import Profile

class SchoolSocialAccountAdapter(DefaultSocialAccountAdapter):
    def pre_social_login(self, request, sociallogin):
        """
        Prevents duplicate users by connecting to an existing user by email.
        Lets allauth handle the login flow (no login loop).
        """
        email = sociallogin.user.email
        if email:
            try:
                user = User.objects.get(email=email)
                sociallogin.connect(request, user)
                # Do NOT redirect or raise here! This lets allauth finish logging in.
                return
            except User.DoesNotExist:
                pass  # No user found, so this will be a new user

        # If new signup, set up default role and profile
        role = 'student'  # You can add logic for different roles if needed
        user = sociallogin.user
        user.save()
        profile, _ = Profile.objects.get_or_create(user=user)
        if getattr(profile, "role", None) != role:
            profile.role = role
            profile.save()
        request.session['role'] = role

    def is_auto_signup_allowed(self, request, sociallogin):
        return True

    def populate_user(self, request, sociallogin, data):
        user = super().populate_user(request, sociallogin, data)
        base_username = slugify(user.email.split('@')[0])
        username = base_username
        count = 0
        # Ensure the username is unique
        while User.objects.filter(username=username).exists():
            count += 1
            username = f"{base_username}{count}"
        user.username = username
        return user

    def login(self, request, sociallogin):
        return super().login(request, sociallogin)
