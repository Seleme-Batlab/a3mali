// ============================================================
//  أعمالي ERP — Firebase Configuration
//  ⚠️  ضع إعدادات Firebase الخاصة بك هنا
// ============================================================

// 1. اذهب إلى console.firebase.google.com
// 2. أنشئ مشروعاً جديداً
// 3. أضف تطبيق Web
// 4. انسخ الإعدادات هنا
export const firebaseConfig = {
    apiKey: "AIzaSyAOrh8VpH_wQpns9mkZ_pI0h_CeH7atWgI",
    authDomain: "a3mali-aa343.firebaseapp.com",
    projectId: "a3mali-aa343",
    storageBucket: "a3mali-aa343.firebasestorage.app",
    messagingSenderId: "480778702343",
    appId: "1:480778702343:web:49ab412ca7457ba76fa4a2",
    measurementId: "G-JGTCTLL94V"
  };
// ============================================================
//  App Constants
// ============================================================
export const APP_CONFIG = {
  name:          'أعمالي',
  nameEn:        'A3mali',
  version:       '1.0.0',
  defaultLang:   'ar',
  defaultTheme:  'light',
  itemsPerPage:  25,
  taxRate:       0.11,   // 11% VAT (Syria)
  currency:      'ل.س',
  currencyEn:    'SYP',

  // Offline
  offlineDB:     'a3mali_offline',
  offlineVersion: 1,

  // Roles hierarchy
  roles: ['super_admin', 'company_admin', 'manager', 'accountant', 'cashier', 'employee'],

  // Firestore collections — keys UPPERCASE to match usage in db.js / pos.js
  collections: {
    COMPANIES:           'companies',
    BRANCHES:            'branches',
    USERS:               'users',
    ROLES:               'roles',
    PERMISSIONS:         'permissions',
    CUSTOMERS:           'customers',
    SUPPLIERS:           'suppliers',
    PRODUCTS:            'products',
    CATEGORIES:          'categories',
    WAREHOUSES:          'warehouses',
    INVENTORY_MOVEMENTS: 'inventory_movements',
    SALES:               'sales',
    INVOICES:            'invoices',
    PURCHASES:           'purchases',
    PAYMENTS:            'payments',
    EXPENSES:            'expenses',
    ACCOUNTS:            'accounts',
    TRANSACTIONS:        'transactions',
    EMPLOYEES:           'employees',
    ATTENDANCE:          'attendance',
    PAYROLL:             'payroll',
    CASHIER_SESSIONS:    'cashier_sessions',
    RECEIPTS:            'receipts',
    REPORTS:             'reports',
    SETTINGS:            'settings',
    AUDIT_LOGS:          'audit_logs',
  },
};

// ============================================================
//  Firestore Security Rules (deploy via Firebase CLI)
//  firebase deploy --only firestore:rules
// ============================================================
/*
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Helper functions
    function isAuthenticated() {
      return request.auth != null;
    }

    function getUserData() {
      return get(/databases/$(database)/documents/users/$(request.auth.uid)).data;
    }

    function hasRole(role) {
      return isAuthenticated() && getUserData().role == role;
    }

    function hasAnyRole(roles) {
      return isAuthenticated() && getUserData().role in roles;
    }

    function isSameCompany(companyId) {
      return getUserData().companyId == companyId;
    }

    function isSuperAdmin() {
      return hasRole('super_admin');
    }

    function isCompanyAdmin() {
      return hasAnyRole(['super_admin', 'company_admin']);
    }

    function isManager() {
      return hasAnyRole(['super_admin', 'company_admin', 'manager']);
    }

    // === COMPANIES ===
    match /companies/{companyId} {
      allow read:  if isAuthenticated() && isSameCompany(companyId);
      allow write: if isSuperAdmin();
    }

    // === USERS ===
    match /users/{userId} {
      allow read:   if isAuthenticated() && (request.auth.uid == userId || isCompanyAdmin());
      // Any authenticated user can create their OWN profile (self-registration)
      allow create: if request.auth != null && request.auth.uid == userId;
      allow update: if isAuthenticated() && (request.auth.uid == userId || isCompanyAdmin());
      allow delete: if isCompanyAdmin();
    }

    // === CUSTOMERS ===
    match /customers/{id} {
      allow read, write: if isAuthenticated() && isManager();
    }

    // === PRODUCTS ===
    match /products/{id} {
      allow read: if isAuthenticated();
      allow write: if isManager();
    }

    // === INVOICES ===
    match /invoices/{id} {
      allow read:   if isAuthenticated();
      allow create: if isAuthenticated();
      allow update: if isManager();
      allow delete: if isCompanyAdmin();
    }

    // === RECEIPTS (POS) ===
    match /receipts/{id} {
      allow read:   if isAuthenticated();
      allow create: if hasAnyRole(['super_admin','company_admin','manager','cashier']);
      allow update: if isManager();
      allow delete: if isCompanyAdmin();
    }

    // === EMPLOYEES ===
    match /employees/{id} {
      allow read:   if isAuthenticated();
      allow write:  if isCompanyAdmin();
    }

    // === SETTINGS ===
    // app_settings: allow read if unauthenticated AND doc doesn't exist yet (first-setup detection)
    // allow create if authenticated AND doc doesn't exist yet (first admin sets passkey)
    match /settings/app_settings {
      allow read:   if isAuthenticated() || !exists(/databases/$(database)/documents/settings/app_settings);
      allow create: if isAuthenticated() && !exists(/databases/$(database)/documents/settings/app_settings);
      allow update, delete: if isSuperAdmin();
    }
    match /settings/{doc} {
      allow read:  if isAuthenticated();
      allow write: if isSuperAdmin();
    }

    // === AUDIT LOGS ===
    match /audit_logs/{id} {
      allow read:  if isCompanyAdmin();
      allow create: if isAuthenticated();
      allow update, delete: if false; // immutable
    }

    // === DEFAULT: deny all ===
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
*/
