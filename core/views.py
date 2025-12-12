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

class MedicineViewSet(viewsets.ModelViewSet):
    queryset = Medicine.objects.all().order_by('-id')
    serializer_class = MedicineSerializer


def home(request):
    return render(request, 'index.html')




@api_view(['POST'])
def signup(request):
    serializer = SignupSerializer(data=request.data)

    if serializer.is_valid():
        user = serializer.save()
        return Response({"message": "Account created successfully!"}, status=status.HTTP_201_CREATED)

    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)




@api_view(['POST'])
def login(request):
    serializer = LoginSerializer(data=request.data)

    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    username = serializer.validated_data['username']
    password = serializer.validated_data['password']

    user = authenticate(username=username, password=password)

    if user:
        profile = Profile.objects.get(user=user)

        return Response({
            "message": "Login successful!",
            "user": {
                "id": user.id,
                "username": user.username,
                "email": user.email,
                "role": profile.role,
                "national_id": profile.national_id
            }
        }, status=200)

    return Response({"error": "Invalid username or password"}, status=401)
