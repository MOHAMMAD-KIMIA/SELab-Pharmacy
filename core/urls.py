from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import home, signup, login, MedicineViewSet

router = DefaultRouter()
router.register('medicines', MedicineViewSet, basename='medicines')

urlpatterns = [
    path('', home),
    path('signup/', signup),
    path('login/', login),
    path('', include(router.urls)),
]
