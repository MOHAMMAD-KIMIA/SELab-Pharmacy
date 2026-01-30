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
    path("api/prescriptions/patient/", api_views.patient_prescriptions_api, name="api_patient_prescriptions"),
    path("api/prescriptions/", api_views.prescriptions_api, name="api_prescriptions"),
    path("api/orders/create/", api_views.create_order_api, name="api_create_order"),
    path("api/users/", api_views.users_api, name="api_users"),
    path("api/medicines/", api_views.medicines_api, name="api_medicines"),
    path("contact/", views.contact, name="contact"),
    path("api/medicines/<int:pk>/", api_views.medicine_detail_api, name="api_medicine_detail"),
    path("api/wallet/balance/", api_views.wallet_balance_api, name="api_wallet_balance"),
    path("api/wallet/deposit/", api_views.wallet_deposit_api, name="api_wallet_deposit"),
    path("api/wallet/transactions/", api_views.wallet_transactions_api, name="api_wallet_transactions"),
    path("api/revenue/total/", api_views.total_revenue_api, name="api_total_revenue"),
    path("api/patient/stats/", api_views.patient_stats_api, name="api_patient_stats"),

]