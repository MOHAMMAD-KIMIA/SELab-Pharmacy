from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Profile, Medicine, MedicineCategory, Prescription, PrescriptionItem, Order, OrderItem



class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email']



class ProfileSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)

    class Meta:
        model = Profile
        fields = ['user', 'role', 'national_id']



class SignupSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField(write_only=True)
    email = serializers.EmailField()
    role = serializers.CharField()
    national_id = serializers.CharField(required=False, allow_null=True, allow_blank=True)

    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data["username"],
            email=validated_data["email"],
            password=validated_data["password"]
        )

        Profile.objects.create(
            user=user,
            role=validated_data["role"],
            national_id=validated_data.get("national_id", None)
        )

        return user



class LoginSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField()


class MedicineSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True)

    class Meta:
        model = Medicine
        fields = [
            'id', 'name', 'category', 'category_name',
            'manufacturer', 'batch_number', 'expiry_date',
            'price', 'stock'
        ]

class PrescriptionItemSerializer(serializers.ModelSerializer):
    medicine_name = serializers.CharField(source='medicine.name', read_only=True)

    class Meta:
        model = PrescriptionItem
        fields = [
            'id', 'medicine', 'medicine_name',
            'dosage', 'duration', 'quantity'
        ]

class PrescriptionSerializer(serializers.ModelSerializer):
    items = PrescriptionItemSerializer(many=True)
    doctor_name = serializers.CharField(source='doctor.username', read_only=True)
    patient_name = serializers.CharField(source='patient.username', read_only=True)

    class Meta:
        model = Prescription
        fields = [
            'id', 'prescription_number',
            'doctor', 'doctor_name',
            'patient', 'patient_name',
            'created_at', 'status',
            'items'
        ]

    def create(self, validated_data):
        items_data = validated_data.pop('items')
        prescription = Prescription.objects.create(**validated_data)

        for item in items_data:
            PrescriptionItem.objects.create(
                prescription=prescription,
                **item
            )

        return prescription
    
class OrderItemSerializer(serializers.ModelSerializer):
    medicine_name = serializers.CharField(source='medicine.name', read_only=True)

    class Meta:
        model = OrderItem
        fields = ['medicine', 'medicine_name', 'quantity', 'unit_price']


class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)
    patient_name = serializers.CharField(source='patient.username', read_only=True)

    class Meta:
        model = Order
        fields = [
            'id', 'patient', 'patient_name',
            'prescription', 'total_amount',
            'created_at', 'status', 'items'
        ]