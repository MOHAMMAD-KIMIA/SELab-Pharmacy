# PharmaCare - Pharmacy Management System

A comprehensive Django-based pharmacy management system designed for academic projects, featuring role-based dashboards, prescription management, inventory control, and secure electronic payments.

##  Overview

PharmaCare is a full-stack web application that simulates real-world pharmacy operations. It provides distinct interfaces for patients, doctors, and pharmacists to manage prescriptions, medicines, orders, and payments in a secure environment. The system demonstrates professional software engineering practices with a clean architecture and modern UI.

##  Key Features

### Role-Based Access Control
- **Patients**: View prescriptions, place orders, manage wallet balance, track order history
- **Doctors**: Create and manage electronic prescriptions, view medicine database
- **Pharmacists**: Manage medicine inventory, process orders, view revenue analytics

### Core Functionalities
- **Prescription Workflow**: Complete lifecycle from creation by doctors to fulfillment by pharmacists
- **Inventory Management**: Real-time stock tracking with low-stock alerts
- **Electronic Wallet**: Secure payment system with transaction history
- **Order Processing**: Automated order creation with stock validation
- **User Management**: Complete user profiles with role-specific identifiers

### Dashboard Analytics
- Patient statistics (wallet balance, active prescriptions, order history)
- Pharmacist overview (total revenue, medicine count, low-stock items)
- Real-time data updates with interactive charts and tables

##  Project Architecture

```
SELab-Pharmacy/
├── config/                 # Django project settings
├── core/                   # Main application
│   ├── models.py          # Database models (User, Medicine, Prescription, etc.)
│   ├── api_views.py       # RESTful API endpoints
│   ├── views.py           # View functions
│   ├── admin.py           # Django admin configuration
│   └── urls.py            # URL routing
├── templates/             # HTML templates
│   ├── dashboards/        # Role-specific dashboard pages
│   ├── pages/            # Landing, signin, contact pages
│   └── partials/         # Reusable template components
├── static/core/           # Static assets
│   ├── app/              # JavaScript modules
│   │   ├── auth.js       # Authentication logic
│   │   ├── patient.js    # Patient dashboard functionality
│   │   ├── doctor.js     # Doctor dashboard functionality
│   │   └── pharmacist.js # Pharmacist dashboard functionality
│   └── styles/           # CSS stylesheets
├── db.sqlite3            # SQLite database
├── manage.py             # Django management script
└── requirements.txt      # Python dependencies
```

##  Technology Stack

### Backend
- **Framework**: Django 4.x (No DRF)
- **Database**: SQLite (development), PostgreSQL-ready
- **Authentication**: Django's built-in auth system with custom profile models
- **API**: RESTful JSON API with custom views

### Frontend
- **HTML/CSS**: Custom responsive design with modern CSS
- **JavaScript**: Vanilla ES6+ with modular architecture
- **Templating**: Django Template Language (DTL)

### Key Dependencies
- Django 4.x
- Python 3.8+
- SQLite3

##  Getting Started

### Prerequisites
- Python 3.8 or higher
- pip (Python package manager)
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/MOHAMMAD-KIMIA/SELab-Pharmacy.git
   cd SELab-Pharmacy
   ```

2. **Create and activate virtual environment**
   ```bash
   # On Windows
   python -m venv venv
   venv\Scripts\activate

   # On macOS/Linux
   python3 -m venv venv
   source venv/bin/activate
   ```

3. **Install dependencies**
   ```bash
   pip install django
   # Or if you have requirements.txt
   pip install -r requirements.txt
   ```

4. **Run database migrations**
   ```bash
   python manage.py makemigrations
   python manage.py migrate
   ```

5. **Create superuser (optional)**
   ```bash
   python manage.py createsuperuser
   ```

6. **Run development server**
   ```bash
   python manage.py runserver
   ```

7. **Access the application**
   - Open browser and navigate to: `http://localhost:8000`
   - Default landing page: `http://localhost:8000/`
   - Admin panel: `http://localhost:8000/admin/`

##  Usage Guide

### User Registration & Login
1. Navigate to the sign-in page
2. Create an account with one of three roles:
   - **Patient**: Requires 10-digit National ID
   - **Doctor**: Requires practice code (format: A-123456)
   - **Pharmacist**: Requires practice code (format: A-123456)
3. Login with your credentials

### Role-Specific Workflows

#### Patient Dashboard
- View active prescriptions
- Place orders for prescriptions
- Manage wallet balance (deposit funds)
- Track order history
- View transaction records

#### Doctor Dashboard
- Create new prescriptions using patient National ID
- Select medicines from available inventory
- Specify dosage, duration, and notes
- View all medicines with stock levels

#### Pharmacist Dashboard
- Manage medicine inventory (add/edit/delete)
- View all orders with status tracking
- Monitor revenue statistics
- View user management panel
- Track low-stock medicines

##  API Endpoints

The system provides the following RESTful APIs:

- `POST /api/signup/` - User registration
- `POST /api/login/` - User authentication
- `GET /api/medicines/` - List all medicines
- `POST /api/prescriptions/` - Create prescriptions (doctors only)
- `GET /api/prescriptions/patient/` - Get patient prescriptions
- `POST /api/orders/create/` - Create orders from prescriptions
- `GET /api/orders/` - List orders
- `GET /api/wallet/balance/` - Get wallet balance
- `POST /api/wallet/deposit/` - Deposit to wallet
- `GET /api/wallet/transactions/` - Get transaction history
- `GET /api/users/` - List users (pharmacists only)

## Database Models

The system uses the following main models:

1. **Profile**: Extends Django User with role, national_id, practice_code
2. **Medicine**: Stores medicine details (name, category, batch, expiry, price, stock)
3. **Prescription**: Links doctors, patients (by national_id), and medicines
4. **Order**: Records patient orders with prescription reference
5. **Wallet**: Manages user balance for payments
6. **Transaction**: Records all wallet transactions.
