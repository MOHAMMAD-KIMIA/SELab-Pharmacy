from django.contrib import admin
from .models import *

admin.site.register(Profile)
admin.site.register(Medicine)
admin.site.register(Prescription)
admin.site.register(Order)
admin.site.register(OrderItem)
admin.site.register(Wallet)
admin.site.register(Transaction)