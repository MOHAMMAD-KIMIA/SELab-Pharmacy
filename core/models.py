from django.db import models
from django.contrib.auth.models import User


class Profile(models.Model):
    ROLE_CHOICES = (
        ('doctor', 'Doctor'),
        ('pharmacist', 'Pharmacist / Admin'),
        ('patient', 'Patient'),
    )

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    role = models.CharField(max_length=20, choices=ROLE_CHOICES)
    national_id = models.CharField(max_length=20, null=True, blank=True)

    def __str__(self):
        return f"{self.user.username} ({self.role})"


class MedicineCategory(models.Model):
    name = models.CharField(max_length=100)

    def __str__(self):
        return self.name


class Medicine(models.Model):
    name = models.CharField(max_length=100)
    category = models.ForeignKey(MedicineCategory, on_delete=models.CASCADE, related_name='medicines')
    manufacturer = models.CharField(max_length=100)
    batch_number = models.CharField(max_length=100)
    expiry_date = models.DateField()
    price = models.DecimalField(max_digits=10, decimal_places=2)
    stock = models.IntegerField()

    def __str__(self):
        return self.name


class Prescription(models.Model):
    prescription_number = models.CharField(max_length=50, unique=True)
    doctor = models.ForeignKey(User, on_delete=models.CASCADE, related_name='doctor_prescriptions')
    patient = models.ForeignKey(User, on_delete=models.CASCADE, related_name='patient_prescriptions')
    created_at = models.DateTimeField(auto_now_add=True)
    status = models.CharField(max_length=20, default='active')

    def __str__(self):
        return self.prescription_number


class PrescriptionItem(models.Model):
    prescription = models.ForeignKey(Prescription, on_delete=models.CASCADE, related_name='items')
    medicine = models.ForeignKey(Medicine, on_delete=models.CASCADE)
    dosage = models.CharField(max_length=100)      
    duration = models.CharField(max_length=100) 
    quantity = models.IntegerField()

    def __str__(self):
        return f"{self.medicine.name} x {self.quantity}"


class Order(models.Model):
    prescription = models.ForeignKey(Prescription, on_delete=models.CASCADE, related_name='orders')
    patient = models.ForeignKey(User, on_delete=models.CASCADE, related_name='orders')
    total_amount = models.DecimalField(max_digits=10, decimal_places=2)
    created_at = models.DateTimeField(auto_now_add=True)
    status = models.CharField(max_length=20, default='completed')

    def __str__(self):
        return f"Order #{self.id}"


class OrderItem(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='items')
    medicine = models.ForeignKey(Medicine, on_delete=models.CASCADE)
    quantity = models.IntegerField()
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)

    def __str__(self):
        return f"{self.medicine.name} ({self.quantity})"


class Alert(models.Model):
    ALERT_TYPES = (
        ('low_stock', 'Low Stock'),
        ('expiry', 'Expiry'),
    )

    medicine = models.ForeignKey(Medicine, on_delete=models.CASCADE, related_name='alerts')
    message = models.CharField(max_length=255)
    type = models.CharField(max_length=20, choices=ALERT_TYPES)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.get_type_display()} - {self.medicine.name}"
