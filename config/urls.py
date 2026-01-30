from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.http import HttpResponse

def well_known_chrome_devtools_json(_request):
    return HttpResponse(status=204)

urlpatterns = [
    path(
        ".well-known/appspecific/com.chrome.devtools.json",
        well_known_chrome_devtools_json,
    ),
    path("admin/", admin.site.urls),
    path("", include("core.urls")),
] + static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
