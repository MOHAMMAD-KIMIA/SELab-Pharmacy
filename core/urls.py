from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import home, signup, login, MedicineViewSet, PrescriptionViewSet

router = DefaultRouter()
router.register('medicines', MedicineViewSet, basename='medicines')
router.register('prescriptions', PrescriptionViewSet, basename='prescriptions')

urlpatterns = [
    path('', home),
    path('signup/', signup),
    path('login/', login),
    path('', include(router.urls)),
]