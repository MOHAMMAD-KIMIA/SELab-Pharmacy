from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import search_patient
from .views import home, signup, login, MedicineViewSet, PrescriptionViewSet
from .views import patient_prescriptions
from .views import create_order, patient_orders, all_orders

router = DefaultRouter()
router.register('medicines', MedicineViewSet, basename='medicines')
router.register('prescriptions', PrescriptionViewSet, basename='prescriptions')

urlpatterns = [
    path('', home),
    path('signup/', signup),
    path('login/', login),
    path('', include(router.urls)),
    path('patients/search/', search_patient),
    path('patients/<int:patient_id>/prescriptions/', patient_prescriptions),
    path('orders/create/', create_order),
    path('patients/<int:patient_id>/orders/', patient_orders),
    path('orders/', all_orders),

]