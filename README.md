# Employee Assessment Admin Dashboard

A comprehensive web-based employee performance assessment system built with Laravel 10, Vue.js 3, and Tailwind CSS. This application allows companies to evaluate and manage employee performance with features including role-based access control, import/export functionality, PDF/Excel report generation, and mobile-responsive design.

## Features

### Core Features
- **User Authentication & Role-Based Access Control** - Secure login with roles (Admin, Evaluator, HR, Owner)
- **Employee Management** - Full CRUD operations for employee records with photo uploads
- **Assessment Templates** - Three pre-configured templates (Customer Service, Operator, Designer) with weighted indicators
- **Single & Bulk Assessment Entry** - Flexible scoring interface with real-time calculations
- **Import/Export Wizard** - Support for CSV, Excel, and JSON formats with column mapping
- **Report Generation** - PDF and Excel exports with multiple report types
- **Historical Analytics** - Chart.js integration for performance tracking over time
- **Email Notifications** - Configurable SMTP settings for automated notifications
- **Mobile Responsive** - Optimized for desktop and mobile devices

### User Roles & Permissions
- **Admin** - Full access to all features including user management
- **Evaluator** - Can create and manage assessments
- **HR** - Can view reports, export data, and manage employees
- **Owner** - Full access with additional system settings

## Tech Stack

### Backend
- **PHP 8.1+** with Laravel 10
- **MySQL 5.7+** for database
- **Laravel Fortify** for authentication
- **Spatie Laravel Permission** for RBAC
- **Maatwebsite Excel** for import/export
- **Barryvdh Laravel DomPDF** for PDF generation

### Frontend
- **Vue.js 3** with Composition API
- **Tailwind CSS** for styling
- **Chart.js** for data visualization
- **Axios** for HTTP requests
- **Font Awesome** for icons

## Installation

### Prerequisites
- PHP 8.1 or higher
- Composer
- MySQL 5.7 or higher
- Node.js & NPM (optional, for asset building)

### Step 1: Clone and Install Dependencies
```bash
cd employee-assessment
composer install
```

### Step 2: Environment Configuration
```bash
cp .env.example .env
php artisan key:generate
```

Edit `.env` file with your database credentials:
```env
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=employee_assessment
DB_USERNAME=your_username
DB_PASSWORD=your_password
```

### Step 3: Database Setup
```bash
php artisan migrate
php artisan db:seed
```

### Step 4: Storage Link
```bash
php artisan storage:link
```

### Step 5: Configure Queue (Optional)
For background processing of imports/exports, configure your queue driver in `.env`:
```env
QUEUE_CONNECTION=database
```

Run the queue worker:
```bash
php artisan queue:work
```

## Default Login Credentials

After seeding, you can login with these accounts:

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@voliko.com | password |
| Evaluator | evaluator@voliko.com | password |
| HR | hr@voliko.com | password |
| Owner | owner@voliko.com | password |

## Directory Structure

```
employee-assessment/
├── app/
│   ├── Http/
│   │   └── Controllers/    # Application controllers
│   ├── Models/             # Eloquent models
│   ├── Repositories/       # Repository pattern implementation
│   ├── Services/           # Business logic services
│   └── ...
├── config/                 # Configuration files
├── database/
│   ├── migrations/         # Database migrations
│   └── seeders/            # Database seeders
├── resources/
│   └── views/              # Blade templates
├── routes/
│   ├── web.php             # Web routes
│   └── api.php             # API routes
└── public/                 # Public assets
```

## Assessment Templates

### 1. Customer Service Template
| Category | Indicator | Weight |
|----------|-----------|--------|
| Kedisiplinan | Kehadiran | 15% |
| Kedisiplinan | Ketaatan aturan | 10% |
| Komunikasi | Komunikasi verbal | 15% |
| Komunikasi | Komunikasi tertulis | 10% |
| Pelayanan | Sikap pelayanan | 20% |
| Pelayanan | Penyelesaian masalah | 20% |
| Kerjasama | Kerjasama tim | 10% |

### 2. Operator Template
| Category | Indicator | Weight |
|----------|-----------|--------|
| Kedisiplinan | Kehadiran | 15% |
| Kedisiplinan | Ketaatan aturan | 10% |
| Teknis | Penguasaan mesin | 25% |
| Teknis | Kualitas produksi | 20% |
| Produktivitas | Target harian | 20% |
| Kerjasama | Kerjasama tim | 10% |

### 3. Designer Template
| Category | Indicator | Weight |
|----------|-----------|--------|
| Kedisiplinan | Kehadiran | 10% |
| Kedisiplinan | Ketaatan aturan | 10% |
| Kreativitas | Ide dan konsep | 20% |
| Kreativitas | Inovasi desain | 15% |
| Teknis | Penguasaan tools | 20% |
| Teknis | Kualitas desain | 15% |
| Kerjasama | Kerjasama tim | 10% |

## Scoring System

Scores are entered on a scale of 1-5 for each indicator:
- 1 = Sangat Kurang
- 2 = Kurang
- 3 = Cukup
- 4 = Baik
- 5 = Sangat Baik

The weighted score is calculated as: `(Score × Weight) / 100`

### Grade Classification
- **Sangat Baik**: 4.50 - 5.00
- **Baik**: 3.50 - 4.49
- **Cukup**: 2.50 - 3.49
- **Kurang**: 1.50 - 2.49
- **Sangat Kurang**: 1.00 - 1.49

## API Endpoints

### Authentication
- `POST /login` - User login
- `POST /logout` - User logout
- `POST /password/reset` - Request password reset

### Employees
- `GET /employees` - List all employees
- `POST /employees` - Create new employee
- `GET /employees/{id}` - Get employee details
- `PUT /employees/{id}` - Update employee
- `DELETE /employees/{id}` - Delete employee

### Assessments
- `GET /assessments` - List all assessments
- `POST /assessments` - Create new assessment
- `POST /assessments/bulk` - Bulk create assessments
- `GET /assessments/{id}` - Get assessment details
- `GET /assessments/{id}/pdf` - Download assessment PDF

### Reports
- `GET /reports/employee/{id}` - Employee report
- `GET /reports/mass` - Mass assessment report
- `GET /reports/detailed` - Detailed report

### Import/Export
- `POST /import/employees` - Import employees
- `POST /import/assessments` - Import assessments
- `GET /export/template/{type}` - Download template

## Mobile Responsiveness

The application is fully responsive and optimized for:
- Desktop (1024px+)
- Tablet (768px - 1023px)
- Mobile (< 768px)

Key mobile optimizations:
- Collapsible sidebar navigation
- Card-based layouts for data tables
- Touch-friendly controls (minimum 48px tap targets)
- Horizontal scrolling for wide tables
- Optimized form inputs

## Security Features

- CSRF protection on all forms
- Password hashing with bcrypt
- Role-based access control
- SQL injection prevention via Eloquent ORM
- XSS protection with output escaping
- HTTPS enforcement ready
- Secure session management

## Deployment

### Shared Hosting Deployment

1. Upload all files to your hosting (excluding `node_modules` and `vendor` if using FTP)
2. Run `composer install` on the server (if SSH access available)
3. Configure `.env` with production database credentials
4. Set `APP_ENV=production` and `APP_DEBUG=false`
5. Configure your web server to point to the `public` directory
6. Run migrations: `php artisan migrate`
7. Set proper permissions:
   ```bash
   chmod -R 755 storage
   chmod -R 755 bootstrap/cache
   ```

### Apache Configuration (.htaccess)
The included `.htaccess` file handles:
- URL rewriting to `public/index.php`
- GZIP compression
- Browser caching
- Security headers

## Troubleshooting

### Common Issues

**Issue**: 500 Internal Server Error
- Check file permissions on `storage` and `bootstrap/cache`
- Verify `.env` file exists and is readable
- Check Laravel logs in `storage/logs`

**Issue**: CSS/JS not loading
- Ensure `APP_URL` in `.env` matches your domain
- Check that `public` directory is web root
- Clear cache: `php artisan cache:clear`

**Issue**: File upload fails
- Check `upload_max_filesize` in PHP settings
- Verify `storage/app/public` is writable
- Ensure symlink exists: `php artisan storage:link`

## License

This project is licensed under the MIT License.

## Support

For support and questions, please contact your system administrator or development team.

---

**Voliko Employee Assessment System** - Built with Laravel & Vue.js
