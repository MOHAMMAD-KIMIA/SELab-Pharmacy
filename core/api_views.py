import json
import re
from datetime import datetime, date
from decimal import Decimal

from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.decorators import login_required
from django.contrib.auth.models import User
from django.forms.models import model_to_dict
from django.http import JsonResponse
from django.views.decorators.http import require_http_methods

from .models import Profile, Medicine


def _json(request):
    try:
        raw = (request.body or b"").decode("utf-8")
        if not raw.strip():
            return {}
        return json.loads(raw)
    except Exception:
        return None


def _parse_date(v):
    if v is None:
        return None
    s = str(v).strip()
    if not s:
        return None
    for fmt in ("%Y-%m-%d", "%m/%d/%Y", "%d/%m/%Y"):
        try:
            return datetime.strptime(s, fmt).date()
        except ValueError:
            pass
    return None


def _to_int(v, default=0):
    try:
        if v is None or str(v).strip() == "":
            return default
        return int(v)
    except Exception:
        return default


def _to_decimal(v, default=Decimal("0")):
    try:
        if v is None or str(v).strip() == "":
            return default
        return Decimal(str(v))
    except Exception:
        return default


def _is_pharmacist(user):
    prof = getattr(user, "profile", None)
    role = getattr(prof, "role", "patient") if prof else "patient"
    return role in ["pharmacist", "admin"]


def _user_payload(user):
    role = "patient"
    prof = getattr(user, "profile", None)
    if prof:
        role = getattr(prof, "role", "patient") or "patient"

    payload = {
        "id": user.id,
        "name": (user.first_name or user.username),
        "email": user.email,
        "role": role,
        "username": user.username,
    }

    if prof:
        payload["national_id"] = getattr(prof, "national_id", "") or ""
        payload["practice_code"] = getattr(prof, "practice_code", "") or ""

    return payload


@require_http_methods(["POST"])
def signup_api(request):
    data = _json(request)
    if data is None:
        return JsonResponse({"error": "Invalid JSON"}, status=400)

    name = (data.get("name") or "").strip()
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""
    role = (data.get("role") or "patient").strip().lower()

    national_id = (data.get("national_id") or "").strip()
    practice_code = (data.get("practice_code") or "").strip()
    identifier = (data.get("identifier") or "").strip()

    if role == "patient" and not national_id:
        national_id = identifier
    if role in ["doctor", "pharmacist"] and not practice_code:
        practice_code = identifier

    if not name or not email or not password or role not in ["patient", "doctor", "pharmacist"]:
        return JsonResponse({"error": "required fields missing"}, status=400)

    if role == "patient":
        if not re.fullmatch(r"\d{10}", national_id):
            return JsonResponse({"error": "National ID must be 10 digits"}, status=400)
    else:
        if not re.fullmatch(r"A-\d{6}", practice_code):
            return JsonResponse({"error": "Practice Code must be like A-123456"}, status=400)

    if User.objects.filter(email=email).exists():
        return JsonResponse({"error": "Email already exists"}, status=400)

    base_username = email.split("@")[0]
    username = base_username
    i = 1
    while User.objects.filter(username=username).exists():
        i += 1
        username = f"{base_username}{i}"

    user = User.objects.create_user(username=username, email=email, password=password)
    user.first_name = name
    user.save()

    Profile.objects.create(
        user=user,
        role=role,
        national_id=national_id if role == "patient" else "",
        practice_code=practice_code if role in ["doctor", "pharmacist"] else "",
    )

    return JsonResponse({"ok": True}, status=201)


@require_http_methods(["POST"])
def login_api(request):
    data = _json(request)
    if data is None:
        return JsonResponse({"error": "Invalid JSON"}, status=400)

    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    if not email or not password:
        return JsonResponse({"error": "email and password required"}, status=400)

    try:
        u = User.objects.get(email=email)
    except User.DoesNotExist:
        return JsonResponse({"error": "Invalid credentials"}, status=401)

    user = authenticate(request, username=u.username, password=password)
    if not user:
        return JsonResponse({"error": "Invalid credentials"}, status=401)

    login(request, user)
    return JsonResponse({"ok": True, "user": _user_payload(user)}, status=200)


@require_http_methods(["POST"])
def logout_api(request):
    logout(request)
    return JsonResponse({"ok": True}, status=200)


@require_http_methods(["GET"])
@login_required
def users_api(request):
    if not _is_pharmacist(request.user):
        return JsonResponse({"error": "Forbidden"}, status=403)

    qs = User.objects.all().order_by("id")
    out = [_user_payload(u) for u in qs]
    return JsonResponse(out, safe=False, status=200)


def _medicine_to_json(m: Medicine):
    d = model_to_dict(m)
    for k, v in list(d.items()):
        if isinstance(v, (datetime, date)):
            d[k] = v.isoformat()
        elif isinstance(v, Decimal):
            d[k] = float(v)
    if "id" not in d:
        d["id"] = m.id
    return d


def _set_if_exists(obj, field_name, value):
    if field_name in {f.name for f in obj.__class__._meta.fields}:
        setattr(obj, field_name, value)
        return True
    return False


@require_http_methods(["GET", "POST"])
@login_required
def medicines_api(request):
    if request.method == "GET":
        meds = Medicine.objects.all().order_by("-id")
        return JsonResponse([_medicine_to_json(m) for m in meds], safe=False, status=200)

    if not _is_pharmacist(request.user):
        return JsonResponse({"error": "Forbidden"}, status=403)

    data = _json(request)
    if data is None:
        return JsonResponse({"error": "Invalid JSON"}, status=400)

    name = (data.get("name") or "").strip()
    if not name:
        return JsonResponse({"error": "Medicine name is required"}, status=400)

    category = (data.get("category") or data.get("category_name") or "").strip()
    batch = (data.get("batch") or data.get("batch_number") or "").strip()
    expiry = _parse_date(data.get("expiry") or data.get("expiry_date"))
    price = _to_decimal(data.get("price"), Decimal("0"))
    stock = _to_int(data.get("stock"), 0)
    notes = (data.get("notes") or data.get("description") or "").strip()
    manufacturer = (data.get("manufacturer") or "").strip()

    m = Medicine()

    _set_if_exists(m, "name", name)

    if category:
        if not _set_if_exists(m, "category", category):
            _set_if_exists(m, "category_name", category)

    if batch:
        if not _set_if_exists(m, "batch", batch):
            _set_if_exists(m, "batch_number", batch)

    if expiry:
        if not _set_if_exists(m, "expiry", expiry):
            _set_if_exists(m, "expiry_date", expiry)

    _set_if_exists(m, "price", price)

    if not _set_if_exists(m, "stock", stock):
        _set_if_exists(m, "quantity", stock)

    if notes:
        if not _set_if_exists(m, "notes", notes):
            _set_if_exists(m, "description", notes)

    if manufacturer:
        _set_if_exists(m, "manufacturer", manufacturer)

    m.save()
    return JsonResponse(_medicine_to_json(m), status=201)


@require_http_methods(["PUT", "DELETE"])
@login_required
def medicine_detail_api(request, pk):
    try:
        m = Medicine.objects.get(pk=pk)
    except Medicine.DoesNotExist:
        return JsonResponse({"error": "Not found"}, status=404)

    if not _is_pharmacist(request.user):
        return JsonResponse({"error": "Forbidden"}, status=403)

    if request.method == "DELETE":
        m.delete()
        return JsonResponse({"ok": True}, status=200)

    data = _json(request)
    if data is None:
        return JsonResponse({"error": "Invalid JSON"}, status=400)

    if "name" in data:
        _set_if_exists(m, "name", (data.get("name") or "").strip())

    category = (data.get("category") or data.get("category_name") or "").strip()
    if category:
        if not _set_if_exists(m, "category", category):
            _set_if_exists(m, "category_name", category)

    batch = (data.get("batch") or data.get("batch_number") or "").strip()
    if batch:
        if not _set_if_exists(m, "batch", batch):
            _set_if_exists(m, "batch_number", batch)

    expiry = _parse_date(data.get("expiry") or data.get("expiry_date"))
    if expiry:
        if not _set_if_exists(m, "expiry", expiry):
            _set_if_exists(m, "expiry_date", expiry)

    if "price" in data:
        _set_if_exists(m, "price", _to_decimal(data.get("price"), Decimal("0")))

    if "stock" in data:
        v = _to_int(data.get("stock"), 0)
        if not _set_if_exists(m, "stock", v):
            _set_if_exists(m, "quantity", v)

    notes = (data.get("notes") or data.get("description") or "").strip()
    if notes:
        if not _set_if_exists(m, "notes", notes):
            _set_if_exists(m, "description", notes)

    manufacturer = (data.get("manufacturer") or "").strip()
    if manufacturer:
        _set_if_exists(m, "manufacturer", manufacturer)

    m.save()
    return JsonResponse(_medicine_to_json(m), status=200)


@require_http_methods(["GET"])
@login_required
def orders_api(request):
    return JsonResponse([], safe=False, status=200)