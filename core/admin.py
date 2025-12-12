from django.contrib import admin
from .models import (
    Profile, MedicineCategory, Medicine,
    Prescription, PrescriptionItem,
    Order, OrderItem, Alert
)

admin.site.register(Profile)
admin.site.register(MedicineCategory)
admin.site.register(Medicine)
admin.site.register(Prescription)
admin.site.register(PrescriptionItem)
admin.site.register(Order)
admin.site.register(OrderItem)
admin.site.register(Alert)
