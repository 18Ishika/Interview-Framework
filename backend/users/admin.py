from django.contrib import admin
from .models import User, Experience, Education

# Register your models here.
admin.site.register(User)
admin.site.register(Education)
admin.site.register(Experience)
