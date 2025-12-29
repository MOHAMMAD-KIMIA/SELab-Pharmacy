from django.db import models
from django.contrib.auth.models import User

class Profile(models.Model):
    ROLE_CHOICES = [
        ("patient", "Patient"),
        ("doctor", "Doctor"),
        ("pharmacist", "Pharmacist"),
    ]

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="profile")
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default="patient")

    national_id = models.CharField(max_length=10, blank=True, default="")
    practice_code = models.CharField(max_length=8, blank=True, default="")

    def __str__(self):
        return f"{self.user.username} ({self.role})"
    
class Medicine(models.Model):
    name = models.CharField(max_length=120)
    category = models.CharField(max_length=80, blank=True, default="")
    batch = models.CharField(max_length=60, blank=True, default="")
    expiry = models.DateField(null=True, blank=True)
    price = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    stock = models.IntegerField(default=0)

    def __str__(self):
        return self.name
