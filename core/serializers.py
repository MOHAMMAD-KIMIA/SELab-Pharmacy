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
    username = serializers.CharField(max_length=150)
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)
    role = serializers.CharField()
    national_id = serializers.CharField(
        required=False,
        allow_blank=True
    )

    def validate(self, data):
        role = data.get("role")
        national_id = data.get("national_id")

        if role == "patient" and not national_id:
            raise serializers.ValidationError({
                "national_id": "National ID is required for patients"
            })

        return data

    def validate_username(self, value):
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError("Username already exists")
        return value

    def validate_email(self, value):
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("Email already exists")
        return value

    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data["username"],
            email=validated_data["email"],
            password=validated_data["password"]
        )

        Profile.objects.create(
            user=user,
            role=validated_data["role"],
            national_id=validated_data.get("national_id", "")
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

    class Meta:
        model = Prescription
        fields = [
            'id',
            'prescription_number',
            'doctor',
            'patient',
            'status',
            'created_at',
            'items'
        ]
        read_only_fields = ['prescription_number', 'status', 'created_at']

    def create(self, validated_data):
        items_data = validated_data.pop('items')

        prescription = Prescription.objects.create(
            prescription_number=generate_prescription_number(),
            status='active',
            **validated_data
        )

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