from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
import core.views

urlpatterns = [
    path('admin/', admin.site.urls),  # Built-in Django admin
    path('', include('core.urls')),  # core: dashboard, login, etc.
    path('accounts/', include('allauth.urls')),  # login/logout
    path('suite/', include(('emt.urls', 'emt'), namespace='emt')),  # emt app
    path('transcript/', include('transcript.urls')),  # transcript module
    path('core-admin/', include('core.urls')),  # optional alternate route
    path('emt/', include('emt.urls')),
]

# ✅ This line enables media file serving (for student photos) in development:
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
