from django.views.decorators.csrf import ensure_csrf_cookie
from django.shortcuts import render, redirect
from django.contrib.auth import logout
from django.views.decorators.http import require_http_methods
from django.http import JsonResponse
from django.contrib.auth.decorators import login_required


@login_required
@require_http_methods(["GET"])
def patient_prescriptions_api(request, patient_id):
    return JsonResponse([], safe=False)


@login_required
@require_http_methods(["GET"])
def orders_api(request):
    return JsonResponse([], safe=False)


@require_http_methods(["GET"])
def logout_view(request):
    logout(request)
    return redirect("signin")


def landing(request):
    return render(request, "pages/landing.html")


@ensure_csrf_cookie
def signin(request):
    return render(request, "pages/signin.html")


def pharmacist_dashboard(request):
    return render(request, "dashboards/pharmacist.html")


def doctor_dashboard(request):
    return render(request, "dashboards/doctor.html")


def patient_dashboard(request):
    return render(request, "dashboards/patient.html")


def contact(request):
    if request.method == "POST":
        return render(request, "pages/contact.html", {"success": True})

    return render(request, "pages/contact.html")