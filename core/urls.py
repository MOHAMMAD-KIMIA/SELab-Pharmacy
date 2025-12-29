from django.urls import path
from . import views
from . import api_views

urlpatterns = [
    path("", views.landing, name="home"),
    path("signin/", views.signin, name="signin"),

    path("dashboard/pharmacist/", views.pharmacist_dashboard, name="pharmacist"),
    path("dashboard/doctor/", views.doctor_dashboard, name="doctor"),
    path("dashboard/patient/", views.patient_dashboard, name="patient"),

    path("api/signup/", api_views.signup_api, name="api_signup"),
    path("api/login/", api_views.login_api, name="api_login"),
    path("api/logout/", api_views.logout_api, name="api_logout"),
    path("logout/", views.logout_view, name="logout"),
    path("api/orders/", views.orders_api, name="api_orders"),
    path("api/patients/<int:patient_id>/prescriptions/", views.patient_prescriptions_api, name="api_patient_prescriptions"),

    path("api/users/", api_views.users_api, name="api_users"),
    path("api/medicines/", api_views.medicines_api, name="api_medicines"),
    path("contact/", views.contact, name="contact"),
    path("api/medicines/<int:pk>/", api_views.medicine_detail_api, name="api_medicine_detail"),

]