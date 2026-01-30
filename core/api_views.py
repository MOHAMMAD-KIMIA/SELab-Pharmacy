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

from .models import Order, Profile, Medicine, Prescription, OrderItem, Wallet, Transaction 


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
@require_http_methods(["GET"])
@login_required
def users_api(request):
    prof = getattr(request.user, "profile", None)
    role = getattr(prof, "role", "patient") if prof else "patient"
    
    if role not in ["pharmacist", "admin"]:
        return JsonResponse({"error": "Forbidden: Only pharmacists can view users"}, status=403)

    users = User.objects.all().order_by("date_joined")
    
    user_list = []
    for user in users:
        profile = getattr(user, "profile", None)
        
        user_data = {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "first_name": user.first_name or user.username,
            "date_joined": user.date_joined.isoformat() if user.date_joined else None,
            "last_login": user.last_login.isoformat() if user.last_login else None,
            "is_active": user.is_active,
            "role": getattr(profile, "role", "patient") if profile else "patient",
            "national_id": getattr(profile, "national_id", "") if profile else "",
            "practice_code": getattr(profile, "practice_code", "") if profile else "",
        }
        user_list.append(user_data)
    
    return JsonResponse(user_list, safe=False, status=200)


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
        print(f"User: {request.user}, Authenticated: {request.user.is_authenticated}")
        meds = Medicine.objects.all().order_by("-id")
        return JsonResponse([_medicine_to_json(m) for m in meds], safe=False, status=200)

    prof = getattr(request.user, "profile", None)
    role = getattr(prof, "role", "patient") if prof else "patient"
    if role not in ["pharmacist", "admin"]:
        return JsonResponse({"error": "Forbidden: Only pharmacists can add medicines"}, status=403)

    data = _json(request)
    if data is None:
        return JsonResponse({"error": "Invalid JSON"}, status=400)

    name = (data.get("name") or "").strip()
    if not name:
        return JsonResponse({"error": "Medicine name is required"}, status=400)

    try:
        medicine = Medicine.objects.create(
            name=name,
            category=(data.get("category") or "").strip(),
            batch_number=(data.get("batch_number") or data.get("batch") or "").strip(),
            expiry_date=_parse_date(data.get("expiry_date") or data.get("expiry")),
            price=_to_decimal(data.get("price"), Decimal("0")),
            stock=_to_int(data.get("stock"), 0),
            notes=(data.get("notes") or "").strip(),
        )
        return JsonResponse(_medicine_to_json(medicine), status=201)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=400)

@require_http_methods(["PUT", "DELETE"])
@login_required
def medicine_detail_api(request, pk):
    try:
        medicine = Medicine.objects.get(pk=pk)
    except Medicine.DoesNotExist:
        return JsonResponse({"error": "Medicine not found"}, status=404)

    # فقط داروسازان می‌توانند داروها را ویرایش/حذف کنند
    prof = getattr(request.user, "profile", None)
    role = getattr(prof, "role", "patient") if prof else "patient"
    if role not in ["pharmacist", "admin"]:
        return JsonResponse({"error": "Forbidden: Only pharmacists can modify medicines"}, status=403)

    if request.method == "DELETE":
        medicine.delete()
        return JsonResponse({"ok": True, "message": "Medicine deleted"}, status=200)

    # PUT - Update medicine
    data = _json(request)
    if data is None:
        return JsonResponse({"error": "Invalid JSON"}, status=400)

    try:
        if "name" in data:
            medicine.name = (data.get("name") or "").strip()
        if "category" in data:
            medicine.category = (data.get("category") or "").strip()
        if "batch_number" in data or "batch" in data:
            medicine.batch_number = (data.get("batch_number") or data.get("batch") or "").strip()
        if "expiry_date" in data or "expiry" in data:
            medicine.expiry_date = _parse_date(data.get("expiry_date") or data.get("expiry"))
        if "price" in data:
            medicine.price = _to_decimal(data.get("price"), Decimal("0"))
        if "stock" in data:
            medicine.stock = _to_int(data.get("stock"), 0)
        if "notes" in data:
            medicine.notes = (data.get("notes") or "").strip()
        
        medicine.save()
        return JsonResponse(_medicine_to_json(medicine), status=200)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=400)

@require_http_methods(["GET", "POST"])
@login_required
def prescriptions_api(request):
    prof = getattr(request.user, "profile", None)
    role = getattr(prof, "role", "patient") if prof else "patient"
    
    if request.method == "GET":
        if role == "doctor":
            prescriptions = Prescription.objects.filter(doctor=request.user).order_by("-created_at")
        elif role == "patient":
            national_id = getattr(prof, "national_id", "")
            prescriptions = Prescription.objects.filter(patient_national_id=national_id).order_by("-created_at")
        elif role in ["pharmacist", "admin"]:
            prescriptions = Prescription.objects.all().order_by("-created_at")
        else:
            prescriptions = Prescription.objects.none()
        
        result = []
        for p in prescriptions:
            result.append({
                "id": p.id,
                "prescription_id": p.prescription_id,
                "doctor_name": p.doctor.first_name or p.doctor.username,
                "patient_national_id": p.patient_national_id,
                "medicine_name": p.medicine.name,
                "medicine_id": p.medicine.id,
                "dosage": p.dosage,
                "duration": p.duration,
                "quantity": p.quantity,
                "notes": p.notes,
                "status": p.status,
                "created_at": p.created_at.isoformat(),
            })
        return JsonResponse(result, safe=False, status=200)
    
    if role != "doctor":
        return JsonResponse({"error": "Only doctors can create prescriptions"}, status=403)
    
    data = _json(request)
    if data is None:
        return JsonResponse({"error": "Invalid JSON"}, status=400)
    
    patient_national_id = (data.get("patient_national_id") or "").strip()
    medicine_id = data.get("medicine_id")
    dosage = (data.get("dosage") or "").strip()
    duration = (data.get("duration") or "").strip()
    quantity = _to_int(data.get("quantity"), 1)
    notes = (data.get("notes") or "").strip()
    
    if not patient_national_id:
        return JsonResponse({"error": "Patient National ID is required"}, status=400)
    if not re.fullmatch(r"\d{10}", patient_national_id):
        return JsonResponse({"error": "Patient National ID must be 10 digits"}, status=400)
    
    try:
        medicine = Medicine.objects.get(id=medicine_id)
    except Medicine.DoesNotExist:
        return JsonResponse({"error": "Medicine not found"}, status=404)
    
    if medicine.stock < quantity:
        return JsonResponse({"error": f"Insufficient stock. Available: {medicine.stock}"}, status=400)
    
    try:
        prescription = Prescription.objects.create(
            doctor=request.user,
            patient_national_id=patient_national_id,
            medicine=medicine,
            dosage=dosage,
            duration=duration,
            quantity=quantity,
            notes=notes,
            status='active'
        )
        
        return JsonResponse({
            "ok": True,
            "prescription_id": prescription.prescription_id,
            "message": "Prescription created successfully"
        }, status=201)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=400)

@require_http_methods(["GET"])
@login_required
def orders_api(request):
    """دریافت همه سفارش‌های کاربر"""
    prof = getattr(request.user, "profile", None)
    role = getattr(prof, "role", "patient") if prof else "patient"
    
    print(f"DEBUG: Getting orders for user: {request.user.username}, role: {role}")
    
    if role in ["pharmacist", "admin"]:
        orders = Order.objects.all().order_by("-created_at")
        print(f"DEBUG: Pharmacist view - Found {orders.count()} total orders")
    else:
        orders = Order.objects.filter(patient=request.user).order_by("-created_at")
        print(f"DEBUG: Patient view - Found {orders.count()} orders for user {request.user.id}")
    
    order_list = []
    for order in orders:
        print(f"DEBUG: Processing order {order.order_id}, status: {order.status}")
        
        prescription_info = None
        if order.prescription:
            prescription_info = {
                "prescription_id": order.prescription.prescription_id,
                "medicine_name": order.prescription.medicine.name,
                "quantity": order.prescription.quantity,
                "doctor_name": order.prescription.doctor.first_name or order.prescription.doctor.username,
            }
        
        order_data = {
            "id": order.id,
            "order_id": order.order_id,
            "patient_id": order.patient.id,
            "patient_name": order.patient.first_name or order.patient.username,
            "patient_email": order.patient.email,
            "total_amount": float(order.total_amount) if order.total_amount else 0.0,
            "status": order.status,
            "created_at": order.created_at.isoformat() if order.created_at else None,
            "updated_at": order.updated_at.isoformat() if order.updated_at else None,
            "prescription": prescription_info,
        }
        
        if hasattr(order, 'items'):
            order_data["items"] = [
                {
                    "medicine_name": item.medicine.name,
                    "quantity": item.quantity,
                    "price": float(item.price_at_time),
                }
                for item in order.items.all()
            ]
        
        order_list.append(order_data)
    
    print(f"DEBUG: Returning {len(order_list)} orders")
    return JsonResponse(order_list, safe=False, status=200)

@require_http_methods(["GET"])
@login_required
def wallet_balance_api(request):
    """دریافت موجودی کیف پول کاربر"""
    try:
        wallet, created = Wallet.objects.get_or_create(user=request.user)
        
        return JsonResponse({
            "balance": float(wallet.balance),
            "currency": "USD",
            "created": created 
        }, status=200)
    except Exception as e:
        print(f"Wallet balance error: {e}")
        return JsonResponse({
            "balance": 0.00,
            "currency": "USD",
            "error": "Wallet not initialized"
        }, status=200)
        
@require_http_methods(["GET"])
@login_required
def wallet_transactions_api(request):
    """دریافت تاریخچه تراکنش‌های واقعی کیف پول"""
    try:
        wallet, created = Wallet.objects.get_or_create(user=request.user)
        
        print(f"DEBUG: Getting transactions for wallet {wallet.id}, user {request.user.username}")
        
        transactions = Transaction.objects.filter(wallet=wallet).order_by('-created_at')[:50]
        
        print(f"DEBUG: Found {transactions.count()} transactions")
        
        if not transactions.exists():
            print("DEBUG: No transactions found, creating sample transaction")
            Transaction.objects.create(
                wallet=wallet,
                type='deposit',
                amount=Decimal('0.00'),
                description="Welcome to PharmaCare Wallet",
                reference_id="WELCOME-001",
                status='completed',
                metadata={"type": "welcome"}
            )
            transactions = Transaction.objects.filter(wallet=wallet).order_by('-created_at')
        
        transactions_list = []
        for txn in transactions:
            created_at_str = ""
            if txn.created_at:
                from django.utils.timezone import localtime
                local_created = localtime(txn.created_at)
                created_at_str = local_created.strftime("%Y-%m-%d %H:%M")
            
            transactions_list.append({
                "id": txn.id,
                "transaction_id": txn.transaction_id,
                "type": txn.type,
                "amount": float(txn.amount),
                "description": txn.description,
                "reference_id": txn.reference_id,
                "status": txn.status,
                "created_at": txn.created_at.isoformat() if txn.created_at else None,
                "created_at_display": created_at_str,
                "metadata": txn.metadata,
                "icon": "" if txn.type == 'deposit' else "" if txn.type == 'withdrawal' else ""
            })
        
        print(f"DEBUG: Returning {len(transactions_list)} transactions")
        return JsonResponse(transactions_list, safe=False, status=200)
        
    except Exception as e:
        print(f"DEBUG: Wallet transactions error: {e}")
        import traceback
        traceback.print_exc()
        return JsonResponse({"error": str(e)}, status=400)
    
@require_http_methods(["POST"])
@login_required
def wallet_deposit_api(request):
    """شارژ کیف پول"""
    data = _json(request)
    if data is None:
        return JsonResponse({"error": "Invalid JSON"}, status=400)
    
    amount = _to_decimal(data.get("amount"), Decimal("0"))
    
    if amount <= 0:
        return JsonResponse({"error": "Amount must be positive"}, status=400)
    
    try:
        wallet, created = Wallet.objects.get_or_create(user=request.user)
        
        print(f"DEBUG: Depositing ${amount} to wallet of {request.user.username}")
        
        transaction = Transaction.objects.create(
            wallet=wallet,
            type='deposit',
            amount=amount,
            description=f"Manual deposit: ${amount}",
            reference_id=f"DEP-{int(datetime.now().timestamp())}",
            status='completed',
            metadata={
                "method": "manual",
                "user_id": request.user.id,
                "timestamp": datetime.now().isoformat()
            }
        )
        
        print(f"DEBUG: Transaction created: {transaction.transaction_id}")
        
        wallet.balance += amount
        wallet.save()
        
        print(f"DEBUG: Wallet balance updated to: {wallet.balance}")
        
        return JsonResponse({
            "ok": True,
            "new_balance": float(wallet.balance),
            "deposited": float(amount),
            "message": f"Wallet charged successfully with ${amount}",
            "transaction_id": transaction.transaction_id
        }, status=200)
        
    except Exception as e:
        print(f"Deposit error: {e}")
        return JsonResponse({"error": str(e)}, status=400)

    
@require_http_methods(["GET"])
@login_required
def patient_prescriptions_api(request):
    """دریافت فقط نسخه‌های ACTIVE بیمار"""
    prof = getattr(request.user, "profile", None)
    
    if not prof or prof.role != 'patient':
        return JsonResponse({"error": "Only patients can view their prescriptions"}, status=403)
    
    national_id = prof.national_id
    if not national_id:
        return JsonResponse({"error": "Patient national ID not found"}, status=400)

    print(f"DEBUG: Looking for prescriptions for national_id: {national_id}")
    
    prescriptions = Prescription.objects.filter(
        patient_national_id=national_id,
        status='active'
    ).order_by('-created_at')
    
    print(f"DEBUG: Found {prescriptions.count()} active prescriptions")
    
    result = []
    for p in prescriptions:
        medicine_price = p.medicine.price if p.medicine.price else Decimal('0.00')
        total_price = medicine_price * p.quantity
        
        result.append({
            "id": p.id,
            "prescription_id": p.prescription_id,
            "doctor_name": p.doctor.first_name or p.doctor.username,
            "medicine_id": p.medicine.id,
            "medicine_name": p.medicine.name,
            "dosage": p.dosage,
            "duration": p.duration,
            "quantity": p.quantity,
            "notes": p.notes,
            "status": p.status,
            "created_at": p.created_at.isoformat() if p.created_at else None,
            "price": float(medicine_price),
            "total_price": float(total_price),
            "medicine_category": p.medicine.category,
            "medicine_stock": p.medicine.stock,
            "can_order": p.medicine.stock >= p.quantity
        })
    
    print(f"DEBUG: Returning {len(result)} prescriptions")
    return JsonResponse(result, safe=False, status=200)

@require_http_methods(["POST"])
@login_required
def create_order_api(request):
    """ایجاد سفارش جدید با پرداخت از کیف پول"""
    prof = getattr(request.user, "profile", None)
    
    if not prof or prof.role != 'patient':
        return JsonResponse({"error": "Only patients can create orders"}, status=403)
    
    data = _json(request)
    if data is None:
        return JsonResponse({"error": "Invalid JSON"}, status=400)
    
    prescription_id = data.get("prescription_id")
    
    if not prescription_id:
        return JsonResponse({"error": "Prescription ID is required"}, status=400)
    
    print(f"DEBUG: Creating order for prescription: {prescription_id}, user: {request.user.username}")
    
    try:
        prescription = Prescription.objects.get(
            prescription_id=prescription_id,
            patient_national_id=prof.national_id,
            status='active'
        )
        
        print(f"DEBUG: Found prescription: {prescription.id}, status: {prescription.status}")
        
        if prescription.medicine.stock < prescription.quantity:
            return JsonResponse({"error": f"Insufficient stock. Available: {prescription.medicine.stock}"}, status=400)
        
        total_amount = prescription.medicine.price * prescription.quantity
        print(f"DEBUG: Total amount: {total_amount}")
        
        wallet, created = Wallet.objects.get_or_create(user=request.user)
        print(f"DEBUG: Wallet balance: {wallet.balance}, required: {total_amount}")
        
        if wallet.balance < total_amount:
            return JsonResponse({
                "error": "Insufficient wallet balance",
                "required": float(total_amount),
                "available": float(wallet.balance),
                "shortage": float(total_amount - wallet.balance)
            }, status=400)
        
        from django.db import transaction as db_transaction
        
        with db_transaction.atomic():
            wallet.balance -= total_amount
            wallet.save()
            print(f"DEBUG: Wallet updated. New balance: {wallet.balance}")
            
            txn = Transaction.objects.create(
                wallet=wallet,
                type='withdrawal',
                amount=total_amount,
                description=f"Payment for Prescription {prescription.prescription_id}",
                reference_id=f"ORDER-{prescription.prescription_id}",
                status='completed',
                metadata={
                    "prescription_id": prescription.prescription_id,
                    "medicine_name": prescription.medicine.name,
                    "quantity": prescription.quantity
                }
            )
            print(f"DEBUG: Transaction created: {txn.transaction_id}")
            
            order = Order.objects.create(
                patient=request.user,
                prescription=prescription, 
                total_amount=total_amount,
                status='completed'  
            )
            print(f"DEBUG: Order created: {order.order_id}")
            
            OrderItem.objects.create(
                order=order,
                medicine=prescription.medicine,
                quantity=prescription.quantity,
                price_at_time=prescription.medicine.price
            )
            print(f"DEBUG: Order item created")
            
            prescription.medicine.stock -= prescription.quantity
            prescription.medicine.save()
            print(f"DEBUG: Medicine stock updated: {prescription.medicine.stock}")
            
            prescription.status = 'filled'
            prescription.save()
            print(f"DEBUG: Prescription status updated to: {prescription.status}")
        
        order.refresh_from_db()
        prescription.refresh_from_db()
        
        print(f"DEBUG FINAL: Order {order.order_id} created successfully")
        print(f"DEBUG FINAL: Prescription {prescription.prescription_id} status: {prescription.status}")
        
        return JsonResponse({
            "ok": True,
            "order_id": order.order_id,
            "prescription_id": prescription.prescription_id,
            "total_amount": float(total_amount),
            "wallet_balance": float(wallet.balance),
            "status": order.status,
            "message": "Order created and payment processed successfully",
            "transaction_id": txn.transaction_id
        }, status=201)
        
    except Prescription.DoesNotExist:
        print(f"DEBUG: Prescription {prescription_id} not found")
        return JsonResponse({"error": "Prescription not found or not accessible"}, status=404)
    except Exception as e:
        import traceback
        print(f"Error creating order: {str(e)}")
        print("Traceback:")
        print(traceback.format_exc())
        return JsonResponse({"error": f"Failed to create order: {str(e)}"}, status=400)
    
@require_http_methods(["GET"])
@login_required
def total_revenue_api(request):
    """دریافت درآمد کل (فقط برای داروسازان)"""
    prof = getattr(request.user, "profile", None)
    role = getattr(prof, "role", "patient") if prof else "patient"
    
    if role not in ["pharmacist", "admin"]:
        return JsonResponse({"error": "Forbidden"}, status=403)
    
    total_revenue = Order.objects.filter(status='completed').aggregate(
        total=models.Sum('total_amount')
    )['total'] or Decimal('0.00')
    
    orders_count = Order.objects.filter(status='completed').count()
    
    return JsonResponse({
        "total_revenue": float(total_revenue),
        "orders_count": orders_count,
        "average_order_value": float(total_revenue / orders_count) if orders_count > 0 else 0
    }, status=200)
    
@require_http_methods(["GET"])
@login_required
def patient_stats_api(request):
    """دریافت آمار بیمار"""
    prof = getattr(request.user, "profile", None)
    
    if not prof or prof.role != 'patient':
        return JsonResponse({"error": "Only patients can view stats"}, status=403)
    
    try:
        wallet, created = Wallet.objects.get_or_create(user=request.user)
        
        active_prescriptions = Prescription.objects.filter(
            patient_national_id=prof.national_id,
            status='active'
        ).count()
        
        total_orders = Order.objects.filter(patient=request.user).count()
        
        pending_orders = Order.objects.filter(
            patient=request.user,
            status__in=['pending', 'processing']
        ).count()
        
        from django.db.models import Sum
        total_spent_result = Order.objects.filter(
            patient=request.user,
            status='completed'
        ).aggregate(total=Sum('total_amount'))
        total_spent = total_spent_result['total'] or Decimal('0.00')
        
        print(f"DEBUG STATS for {request.user.username}:")
        print(f"  - Wallet: ${wallet.balance}")
        print(f"  - Active prescriptions: {active_prescriptions}")
        print(f"  - Total orders: {total_orders}")
        print(f"  - Pending orders: {pending_orders}")
        print(f"  - Total spent: ${total_spent}")
        
        return JsonResponse({
            "wallet_balance": float(wallet.balance),
            "active_prescriptions": active_prescriptions,
            "total_orders": total_orders,
            "pending_orders": pending_orders,
            "total_spent": float(total_spent),
            "currency": "USD"
        }, status=200)
        
    except Exception as e:
        print(f"Stats error: {e}")
        return JsonResponse({"error": str(e)}, status=400)