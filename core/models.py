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
    batch_number = models.CharField(max_length=60, blank=True, default="")
    expiry_date = models.DateField(null=True, blank=True)
    price = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    stock = models.IntegerField(default=0)
    notes = models.TextField(blank=True, default="")
    
    def __str__(self):
        return self.name


class Prescription(models.Model):
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('filled', 'Filled'),
        ('expired', 'Expired'),
        ('cancelled', 'Cancelled'),
    ]
    
    prescription_id = models.CharField(max_length=20, unique=True, blank=True)
    doctor = models.ForeignKey(User, on_delete=models.CASCADE, related_name="prescriptions_written")
    patient_national_id = models.CharField(max_length=10)
    medicine = models.ForeignKey(Medicine, on_delete=models.CASCADE, related_name="prescriptions")
    dosage = models.CharField(max_length=100, blank=True, default="")
    duration = models.CharField(max_length=100, blank=True, default="")
    quantity = models.IntegerField(default=1)
    notes = models.TextField(blank=True, default="")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"Prescription {self.prescription_id}"
    
    def save(self, *args, **kwargs):
        if not self.prescription_id:
            import uuid
            self.prescription_id = f"RX-{uuid.uuid4().hex[:8].upper()}"
        super().save(*args, **kwargs)

class Wallet(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="wallet")
    balance = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"Wallet: {self.user.username} - ${self.balance}"
    
    def deduct(self, amount):
        """کاهش موجودی کیف پول"""
        if self.balance >= amount:
            self.balance -= amount
            self.save()
            return True
        return False
    
    def add(self, amount):
        """افزایش موجودی کیف پول"""
        self.balance += amount
        self.save()
        return True
    
    def deposit(self, amount, description="", reference_id="", metadata=None):
        """افزایش موجودی کیف پول و ثبت تراکنش"""
        from django.db import transaction as db_transaction
        
        with db_transaction.atomic():
            self.balance += amount
            self.save()
            
            Transaction.objects.create(
                wallet=self,
                type='deposit',
                amount=amount,
                description=description or f"Deposit: ${amount}",
                reference_id=reference_id,
                status='completed',
                metadata=metadata or {}
            )
            
        return True
    
    def withdraw(self, amount, description="", reference_id="", metadata=None):
        """کاهش موجودی کیف پول و ثبت تراکنش"""
        from django.db import transaction as db_transaction
        
        with db_transaction.atomic():
            if self.balance < amount:
                raise ValueError("Insufficient balance")
            
            self.balance -= amount
            self.save()
            
            Transaction.objects.create(
                wallet=self,
                type='withdrawal',
                amount=amount,
                description=description or f"Payment: ${amount}",
                reference_id=reference_id,
                status='completed',
                metadata=metadata or {}
            )
            
        return True
    
    def get_recent_transactions(self, limit=10):
        """دریافت آخرین تراکنش‌ها"""
        return self.transactions.all().order_by('-created_at')[:limit]
    
class Order(models.Model):
    ORDER_STATUS = [
        ('pending', 'Pending'),
        ('processing', 'Processing'),
        ('completed', 'Completed'),  # ✅ حروف کوچک
        ('cancelled', 'Cancelled'),
        ('failed', 'Failed - Insufficient Balance'),
    ]
    
    order_id = models.CharField(max_length=20, unique=True, blank=True)
    patient = models.ForeignKey(User, on_delete=models.CASCADE, related_name="orders")
    prescription = models.ForeignKey(Prescription, on_delete=models.SET_NULL, null=True, blank=True, related_name="orders")
    total_amount = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(max_length=20, choices=ORDER_STATUS, default='completed')  # ✅ حروف کوچک
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"Order {self.order_id}"
    
    def save(self, *args, **kwargs):
        if not self.order_id:
            import uuid
            self.order_id = f"ORD-{uuid.uuid4().hex[:8].upper()}"
        super().save(*args, **kwargs)

class OrderItem(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name="items")
    medicine = models.ForeignKey(Medicine, on_delete=models.CASCADE)
    quantity = models.IntegerField(default=1)
    price_at_time = models.DecimalField(max_digits=10, decimal_places=2)
    
    def __str__(self):
        return f"{self.medicine.name} x{self.quantity}"
    

class Transaction(models.Model):
    TRANSACTION_TYPES = [
        ('deposit', 'Deposit'),
        ('withdrawal', 'Withdrawal'),
        ('refund', 'Refund'),
        ('payment', 'Payment'),
    ]
    
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
        ('cancelled', 'Cancelled'),
    ]
    
    wallet = models.ForeignKey(Wallet, on_delete=models.CASCADE, related_name="transactions")
    transaction_id = models.CharField(max_length=50, unique=True, blank=True)
    type = models.CharField(max_length=20, choices=TRANSACTION_TYPES)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    description = models.TextField(blank=True, default="")
    reference_id = models.CharField(max_length=50, blank=True, default="")  
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='completed')
    metadata = models.JSONField(default=dict, blank=True)  
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"{self.type} - ${self.amount} - {self.status}"
    
    def save(self, *args, **kwargs):
        if not self.transaction_id:
            import uuid
            self.transaction_id = f"TXN-{uuid.uuid4().hex[:10].upper()}"
        super().save(*args, **kwargs)