# Implementation Plan - Hyper-Local Independent Chef & Ghost Kitchen Ecosystem (DBMS Project)

Building a production-ready, real-world Database Management System project: **ChefHub Logistics & Dynamic Payout Platform**. This platform solves the high-commission problem for small independent food entrepreneurs and ghost kitchens by managing ingredient inventory, split payouts, dynamic delivery routing, and flexible menus using a **Hybrid Database Architecture (7 MySQL Tables + 5 MongoDB Collections = 12 Total Schemas)** with strict **Role-Based Access Control (RBAC)**.

---

## Architecture & Distinct Role Site Routes

> [!IMPORTANT]
> **4 Dedicated Role Sites / URL Routes**:
> Rather than a single combined page, each user role has its own **dedicated URL route & site interface**:
> 1. **Customer Marketplace Site**: `http://localhost:5173/` & `/login`
> 2. **Chef / Vendor Kitchen Site**: `http://localhost:5173/chef/login` & `/chef/dashboard`
> 3. **Rider Logistics Site**: `http://localhost:5173/rider/login` & `/rider/dashboard`
> 4. **Admin Control Master Site**: `http://localhost:5173/admin/login` & `/admin/dashboard`
> 
> *Includes a **Portal Launchpad Landing Page** (`/portals`) allowing evaluators to jump directly into any of the 4 sites with 1 click.*

```mermaid
graph TD
    Client UI[Vite React Client] --> Router[React Router DOM]
    
    Router -->|Path: / | CustomerSite[Customer Marketplace Site]
    Router -->|Path: /chef/*| ChefSite[Chef Kitchen Console]
    Router -->|Path: /rider/*| RiderSite[Rider Fleet Console]
    Router -->|Path: /admin/*| AdminSite[Admin Master Console]
    
    CustomerSite -->|JWT Auth| API[Express API /api/customer]
    ChefSite -->|JWT Auth| API2[Express API /api/vendor]
    RiderSite -->|JWT Auth| API3[Express API /api/rider]
    AdminSite -->|JWT Auth| API4[Express API /api/admin]
    
    API & API2 & API3 & API4 --> DB1[(MySQL ACID Core - 7 Tables)]
    API & API2 & API3 & API4 --> DB2[(MongoDB Document Store - 5 Collections)]
```

---

## Complete Database Schemas (12 Schemas Total)

### Relational Core Schemas (MySQL - 7 Tables)

1. **`users`**: `User_ID` (PK), `Name`, `Email`/`Username` (Unique), `Password_Hash`, `Role` (`CUSTOMER`, `VENDOR`, `RIDER`, `ADMIN`), `Phone`, `Status` (`ACTIVE`, `BANNED`), `Created_At`.
   - *Constraint*: DB trigger/application check ensures maximum of 1 user with `Role == 'ADMIN'`.
2. **`dishes`**: `Dish_ID` (PK), `Vendor_ID` (FK), `Name`, `Category`, `Base_Price`, `Is_Available`, `Created_At`.
3. **`inventory`**: `Ingredient_ID` (PK), `Vendor_ID` (FK), `Ingredient_Name`, `Stock_Quantity`, `Unit` (`kg`, `g`, `liters`, `units`), `Reorder_Level`, `Updated_At`.
4. **`dish_recipes`**: `Recipe_ID` (PK), `Dish_ID` (FK -> `dishes`), `Ingredient_ID` (FK -> `inventory`), `Quantity_Required`.
5. **`orders`**: `Order_ID` (PK), `Customer_ID` (FK), `Vendor_ID` (FK), `Rider_ID` (FK, Nullable), `Total_Amount`, `Escrow_Status` (`HOLDING`, `DISBURSED`, `REFUNDED`), `Payment_Status` (`PENDING`, `PAID`), `Status` (`PLACED`, `PREPARING`, `READY`, `OUT_FOR_DELIVERY`, `DELIVERED`, `CANCELLED`), `Timestamp`.
6. **`order_items`**: `OrderItem_ID` (PK), `Order_ID` (FK), `Dish_ID` (FK), `Quantity`, `Price_At_Purchase`, `Subtotal`.
7. **`payouts`**: `Payout_ID` (PK), `Order_ID` (FK), `Vendor_ID` (FK), `Rider_ID` (FK), `Vendor_Amount` (85%), `Rider_Amount` (10%), `Platform_Commission` (5%), `Payout_Status` (`SCHEDULED`, `PROCESSED`), `Executed_At`.

### Flexible Document Schemas (MongoDB - 5 Collections)

8. **`vendors_menus`**: `Vendor_ID`, `Business_Name`, `Cuisine_Types`, `Chef_Bio`, `Hero_Image_URL`, `Operating_Hours`, `Categories`: [{ `Category_Name`, `Dishes`: [{ `Dish_ID`, `Name`, `Description`, `Image_URL`, `Price`, `Dietary_Tags`, `Customizations`: [{ `Option_Name`, `Extra_Cost` }] }] }].
9. **`rider_logistics`**: `Rider_ID`, `Vehicle_Type`, `License_Plate`, `Shift_Status` (`ONLINE`, `OFFLINE`, `ON_DELIVERY`), `Live_Coordinates`: `{ Lat, Lng }`, `Assigned_Order_ID`, `Total_Deliveries_Completed`.
10. **`order_tracking_logs`**: `Order_ID`, `Timeline`: [{ `Event`: `Status`, `Timestamp`, `Location_Note`, `Actor_Role` }], `Estimated_Delivery_Time`.
11. **`reviews_analytics`**: `Review_ID`, `Order_ID`, `Customer_ID`, `Vendor_ID`, `Rider_ID`, `Vendor_Rating` (1-5), `Rider_Rating` (1-5), `Comment`, `Sentiment_Label` (`POSITIVE`, `NEUTRAL`, `NEGATIVE`), `Created_At`.
12. **`system_audit_logs`**: `Log_ID`, `Admin_User_ID`, `Action_Type` (`COMMISSION_UPDATE`, `ADMIN_CREDENTIALS_CHANGED`, `USER_BAN`, `MANUAL_STOCK_OVERRIDE`, `SEED_RESET`), `Details_JSON`, `Timestamp`.

---

## Separate Site Portals & URL Routing Matrix

| Site / Dedicated Portal | Dedicated URL Path | Default Seed Credentials | Features & Boundaries |
| :--- | :--- | :--- | :--- |
| **Admin Control Site** | `/admin/login`<br>`/admin/dashboard` | **Username**: `admin`<br>**Password**: `admin` | Single Admin account. Master CRUD, financial split sliders, user banning, **Update Credentials Form**. |
| **Chef / Kitchen Site** | `/chef/login`<br>`/chef/dashboard` | **Email**: `chef.mario@chefhub.com`<br>**Password**: `vendor123` | Kitchen order display board, relational ingredient stock auto-deduction manager, reorder limits, payout ledger. |
| **Customer Site** | `/`<br>`/customer/login` | **Email**: `alex.customer@gmail.com`<br>**Password**: `customer123` | Customer marketplace, chef storefronts, menu modals, order checkout, live tracking timeline, reviews. |
| **Rider Fleet Site** | `/rider/login`<br>`/rider/dashboard` | **Email**: `david.rider@chefhub.com`<br>**Password**: `rider123` | Driver shift toggle, available pickup jobs, GPS location simulator, order delivery status updater. |

---

## Project Directory Layout

```
DBMS Project/
├── backend/
│   ├── config/
│   │   ├── mysql_db.js
│   │   └── mongo_db.js
│   ├── middleware/
│   │   └── auth_rbac.js
│   ├── routes/
│   │   ├── auth.js               # Login & Change Admin Credentials endpoints
│   │   ├── customer.js
│   │   ├── vendor.js
│   │   ├── rider.js
│   │   └── admin.js
│   ├── services/
│   │   ├── inventory_engine.js   # Relational recipe stock deduction
│   │   ├── payout_service.js     # 85/10/5 escrow splits
│   │   └── tracking_service.js   # MongoDB order logs
│   ├── seeders/
│   │   └── seed_all.js           # Seeds single Admin (admin/admin) + sample users
│   ├── server.js
│   └── package.json
└── frontend/
    ├── src/
    │   ├── pages/
    │   │   ├── LandingPortalsPage.jsx  # Launchpad page linking to all 4 sites
    │   │   ├── CustomerSite.jsx       # Customer marketplace & login
    │   │   ├── ChefSite.jsx           # Chef kitchen portal & login
    │   │   ├── RiderSite.jsx          # Driver fleet portal & login
    │   │   └── AdminSite.jsx          # Admin master portal & login
    │   ├── components/
    │   │   ├── Navbar.jsx
    │   │   ├── ProtectedRoute.jsx     # Route protection guard
    │   │   └── OrderTrackerModal.jsx
    │   ├── App.jsx
    │   ├── main.jsx
    │   └── index.css
    ├── index.html
    ├── vite.config.js
    ├── tailwind.config.js
    └── package.json
```

---

## Implementation Plan Steps

### Step 1: Bootstrap Project & Setup
- Initialize `backend` and `frontend` folders.
- Install backend dependencies (`express`, `mysql2`, `mongoose`, `jsonwebtoken`, `bcryptjs`, `cors`, `dotenv`).
- Install frontend dependencies (`react`, `react-dom`, `react-router-dom`, `@vitejs/plugin-react`, `tailwindcss`, `lucide-react`, `recharts`).

### Step 2: Database Layer & Single-Admin Seed Script
- Configure MySQL tables and MongoDB collections.
- Seed script (`seed_all.js`):
  - Injects exactly **1 Admin User** with `username: admin`, `password: admin` (hashed using bcrypt).
  - Injects sample Vendors, Customers, Riders, Dishes, Recipes, and Inventory rows.

### Step 3: Auth & RBAC Backend Routes
- `POST /api/auth/login`: Authenticates credentials, returns role-specific JWT.
- `PUT /api/auth/admin/update-credentials`: Restricted to Admin token. Updates Admin username and password hash.
- Enforce strict role middleware (`requireRole('ADMIN')`, `requireRole('VENDOR')`, etc.) on all API routes.

### Step 4: Frontend UI with 4 Separate Site Routes & Launchpad
- Configure `react-router-dom` with 4 distinct site routes (`/`, `/chef/login`, `/rider/login`, `/admin/login`).
- Build **Portal Launchpad Landing Page** (`/portals`) with cards linking directly to each dedicated site for easy evaluation.
- Build dedicated site interfaces for Customer, Chef, Rider, and Admin.
- Build Admin Settings Tab allowing admin to update `admin/admin` credentials.

### Step 5: Verification & System Defense
- Test independent browser navigation to `/admin/login`, `/chef/login`, `/rider/login`, and `/`.
- Test changing Admin credentials from `admin/admin` and logging back in on `/admin/login`.
- Verify route protection guards prevent customers from accessing `/admin/dashboard`.
- Execute scratch verification tests for inventory auto-deduction and escrow payout math.
