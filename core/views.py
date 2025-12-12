from django.shortcuts import render
from django.contrib.auth import authenticate
from rest_framework.response import Response
from rest_framework.decorators import api_view
from rest_framework import status
from .models import Profile
from .serializers import SignupSerializer, LoginSerializer, ProfileSerializer
from rest_framework import viewsets
from .models import Medicine
from .serializers import MedicineSerializer
from rest_framework import viewsets
from .models import Prescription
from .serializers import (
    SignupSerializer,
    LoginSerializer,
    MedicineSerializer,
    PrescriptionSerializer,
    OrderSerializer,   # 👈 این خط
)
from django.utils.crypto import get_random_string
from django.contrib.auth.models import User
from rest_framework.decorators import api_view
from .models import Order, OrderItem, Alert, Medicine

@api_view(['GET'])
def patient_orders(request, patient_id):
    orders = Order.objects.filter(patient_id=patient_id).order_by('-created_at')
    serializer = OrderSerializer(orders, many=True)
    return Response(serializer.data)


@api_view(['GET'])
def all_orders(request):
    orders = Order.objects.all().order_by('-created_at')
    serializer = OrderSerializer(orders, many=True)
    return Response(serializer.data)


@api_view(['POST'])
def create_order(request):
    prescription_id = request.data.get('prescription_id')
    patient_id = request.data.get('patient_id')

    try:
        prescription = Prescription.objects.get(id=prescription_id)
    except Prescription.DoesNotExist:
        return Response({"error": "Prescription not found"}, status=404)

    if prescription.status != 'active':
        return Response(
            {"error": "This prescription is no longer active"},
            status=400
        )

    total_amount = 0
    order = Order.objects.create(
        prescription=prescription,
        patient_id=patient_id,
        total_amount=0,
        status='completed'
    )

    for item in prescription.items.all():
        medicine = item.medicine

        if medicine.stock < item.quantity:
            return Response(
                {"error": f"Insufficient stock for {medicine.name}"},
                status=400
            )

        medicine.stock -= item.quantity
        medicine.save()

        price = medicine.price * item.quantity
        total_amount += price

        OrderItem.objects.create(
            order=order,
            medicine=medicine,
            quantity=item.quantity,
            unit_price=medicine.price
        )

        if medicine.stock <= 5:
            Alert.objects.create(
                medicine=medicine,
                type='low_stock',
                message=f"Low stock for {medicine.name}"
            )

    order.total_amount = total_amount
    order.save()

    prescription.status = 'completed'
    prescription.save()

    return Response(
        {"message": "Order created and prescription completed"},
        status=201
    )

@api_view(['GET'])
def patient_prescriptions(request, patient_id):
    prescriptions = Prescription.objects.filter(patient_id=patient_id).order_by('-created_at')
    serializer = PrescriptionSerializer(prescriptions, many=True)
    return Response(serializer.data)


@api_view(['GET'])
def search_patient(request):
    national_id = request.GET.get('national_id')

    if not national_id:
        return Response({"error": "national_id is required"}, status=400)

    try:
        profile = Profile.objects.get(national_id=national_id, role='patient')
        user = profile.user

        return Response({
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "national_id": profile.national_id
        })
    except Profile.DoesNotExist:
        return Response({"error": "Patient not found"}, status=404)


def generate_prescription_number():
    return "RX-" + get_random_string(8).upper()


# class PrescriptionViewSet(viewsets.ModelViewSet):
#     queryset = Prescription.objects.all().order_by('-id')
#     serializer_class = PrescriptionSerializer

from rest_framework.response import Response
from rest_framework import status

class PrescriptionViewSet(viewsets.ModelViewSet):
    queryset = Prescription.objects.all().order_by('-id')
    serializer_class = PrescriptionSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)

        if not serializer.is_valid():
            print("Prescription serializer errors:", serializer.errors)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        self.perform_create(serializer)
        return Response(serializer.data, status=status.HTTP_201_CREATED)



class MedicineViewSet(viewsets.ModelViewSet):
    queryset = Medicine.objects.all().order_by('-id')
    serializer_class = MedicineSerializer


def home(request):
    return render(request, 'index.html')




from django.views.decorators.csrf import csrf_exempt
from rest_framework.decorators import api_view

@csrf_exempt
@api_view(['POST'])
def signup(request):
    serializer = SignupSerializer(data=request.data)

    if serializer.is_valid():
        serializer.save()
        return Response({"message": "Account created successfully"}, status=201)

    return Response(serializer.errors, status=400)



@csrf_exempt
@api_view(['POST'])
def login(request):
    serializer = LoginSerializer(data=request.data)

    if not serializer.is_valid():
        return Response(serializer.errors, status=400)

    user = authenticate(
        username=serializer.validated_data['username'],
        password=serializer.validated_data['password']
    )

    if not user:
        return Response({"error": "Invalid credentials"}, status=401)

    profile = Profile.objects.get(user=user)

    return Response({
        "user": {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "role": profile.role,
            "national_id": profile.national_id
        }
    })