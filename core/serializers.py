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
