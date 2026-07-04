//  أعمالي ERP — Dashboard Logic (classic script)

  function _acctKey() {
    let u = {};
    try { u = JSON.parse(sessionStorage.getItem('a3mali_user') || '{}'); } catch(e) {}
    return u.uid || u.email || 'guest';
  }
  function _loadAcct(kind, fallback) {
    try {
      const raw = localStorage.getItem('a3mali_' + kind + '_' + _acctKey());
      return raw == null ? fallback : JSON.parse(raw);
    } catch(e) { return fallback; }
  }
  function _saveAcct(kind, value) {
    try { localStorage.setItem('a3mali_' + kind + '_' + _acctKey(), JSON.stringify(value)); } catch(e) {}
  }
  function _fsSync(kind, data) {
    if (!window._fsSet) return;
    const payload = Array.isArray(data)
      ? { items: data, updatedAt: Date.now() }
      : { ...data, _updatedAt: Date.now() };
    try {
      window._fsSet('accounts/' + _acctKey() + '/data/' + kind, payload)
        .catch(e => console.warn('[FS sync]', kind, e));
    } catch(e) {}
  }

  window._saveData = function() {
    const stores = {
      invoices:   window._invoices   || [],
      customers:  window._customers  || [],
      products:   window._products   || [],
      suppliers:  window._suppliers  || [],
      expenses:   window._expenses   || [],
      cashbox:    window._cashbox    || [],
      workOrders: window._workOrders || [],
      employees:  window._employees  || [],
      stockMoves: window._stockMoves || [],
      categories: window._categories || [],
      debts:          window._debts          || [],
      purchases:      window._purchases      || [],
      salesReps:      window._salesReps      || [],
      salesTargets:   window._salesTargets   || [],
      installments:   window._installments   || [],
      leaves:         window._leaves         || [],
      payroll:        window._payroll        || [],
      entries:        window._entries        || [],
      printTemplates: window._printTemplates || {},
    };
    Object.entries(stores).forEach(([k, v]) => {
      _saveAcct(k, v);
      if (k === 'invoices') return;
      _fsSync(k, v);
    });
    if (typeof window.updateSalesBadge === 'function') window.updateSalesBadge();
  };

  window.updateSalesBadge = function() {
    const count = (window._invoices || []).filter(inv => inv.status === 'pending' || inv.status === 'overdue').length;
    const badge = document.getElementById('badge-sales');
    if (!badge) return;
    if (count > 0) { badge.textContent = count; badge.style.display = ''; }
    else { badge.style.display = 'none'; }
  };

  window._saveSettings = function() {
    const s = window._appSettings || {};
    _saveAcct('settings', s);
    _fsSync('settings', s);
  };

  window._invoices    = _loadAcct('invoices',  []);
  window._customers   = _loadAcct('customers', []);
  window._products    = _loadAcct('products',  []);
  window._suppliers   = _loadAcct('suppliers', []);
  window._expenses    = _loadAcct('expenses',  []);
  window._cashbox     = _loadAcct('cashbox',     []);
  window._workOrders  = _loadAcct('workOrders',  []);
  window._employees   = _loadAcct('employees',   []);
  window._stockMoves      = _loadAcct('stockMoves',      []);
  window._categories      = _loadAcct('categories',      []);
  window._debts           = _loadAcct('debts',           []);
  window._printTemplates  = _loadAcct('printTemplates',  {});
  window._purchases   = _loadAcct('purchases',   []);
  window._salesReps   = _loadAcct('salesReps',   []);
  window._salesTargets= _loadAcct('salesTargets',[]);
  window._installments= _loadAcct('installments',[]);
  window._leaves      = _loadAcct('leaves',      []);
  window._payroll     = _loadAcct('payroll',     []);
  window._entries     = _loadAcct('entries',     []);   // قيود محاسبية يدوية
  window._appSettings = _loadAcct('settings',    {});

  const _liveSyncProp = {
    invoices: '_invoices', products: '_products', customers: '_customers',
    debts: '_debts', stockMoves: '_stockMoves', cashbox: '_cashbox',
  };
  window._onLiveSync = function(kind, merged) {
    const prop = _liveSyncProp[kind];
    if (!prop) return;
    const prevCount = (window[prop] || []).length;
    window[prop] = merged;
    if (typeof window.updateSalesBadge === 'function') window.updateSalesBadge();
    if (typeof window.updateNotifBadge === 'function') window.updateNotifBadge();

    document.querySelectorAll('.sync-indicator').forEach(el => el.classList.add('syncing'));
    setTimeout(() => document.querySelectorAll('.sync-indicator').forEach(el => el.classList.remove('syncing')), 1200);

    const active = document.activeElement;
    const isTyping = active && /^(INPUT|TEXTAREA|SELECT)$/.test(active.tagName);
    if (document.querySelector('.modal-overlay.open') || isTyping) return;

    const current = (window.location.hash || '#dashboard').replace('#', '');
    if (typeof window.navigate === 'function') window.navigate(current);

    if (kind === 'invoices') {
      if (merged.length > prevCount)      showToast('success', '🔄 مزامنة تلقائية — تمت إضافة عملية بيع جديدة');
      else if (merged.length < prevCount) showToast('info',    '🔄 مزامنة تلقائية — تم حذف فاتورة');
      else                                  showToast('info',    '🔄 مزامنة تلقائية — تم تحديث بيانات الفواتير');
    }
  };

  window.generatePDF = function(title, bodyHTML) {
    const s = window._appSettings || {};
    const win = window.open('', '_blank', 'width=900,height=700');
    win.document.write(`<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
<meta charset="UTF-8"><title>${title}</title>
<link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;800&display=swap" rel="stylesheet">
<style>
  *{margin:0;padding:0;box-sizing:border-box;font-family:'Tajawal',sans-serif;}
  body{padding:30px;color:#1e293b;direction:rtl;background:#fff;}
  .hdr{border-bottom:3px solid #3b82f6;padding-bottom:18px;margin-bottom:24px;display:flex;justify-content:space-between;align-items:flex-start;}
  .co-name{font-size:26px;font-weight:800;color:#3b82f6;}
  .co-sub{font-size:12px;color:#64748b;margin-top:4px;}
  .rpt-title{font-size:20px;font-weight:800;color:#1e293b;margin-bottom:18px;}
  table{width:100%;border-collapse:collapse;margin-top:12px;}
  th{background:#3b82f6;color:#fff;font-weight:700;padding:10px 14px;text-align:right;}
  td{padding:9px 14px;border-bottom:1px solid #e2e8f0;text-align:right;}
  tr:nth-child(even) td{background:#f8fafc;}
  .badge{display:inline-block;padding:2px 10px;border-radius:999px;font-size:12px;font-weight:700;}
  .badge-paid{background:#dcfce7;color:#16a34a;}
  .badge-pending{background:#fef3c7;color:#d97706;}
  .badge-overdue{background:#fee2e2;color:#dc2626;}
  .badge-draft{background:#f1f5f9;color:#64748b;}
  .totals{display:flex;justify-content:flex-end;margin-top:18px;}
  .totals table{width:320px;}
  .total-final td{font-weight:800;font-size:16px;color:#3b82f6;}
  .footer{margin-top:32px;text-align:center;color:#94a3b8;font-size:11px;border-top:1px solid #e2e8f0;padding-top:14px;}
  @media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact;}}
</style>
</head>
<body>
<div class="hdr">
  <div>
    <div class="co-name">${s.companyName || 'أعمالي'}</div>
    <div class="co-sub">${[s.address || 'دمشق، سوريا', s.phone, s.email].filter(Boolean).join(' · ')}</div>
  </div>
  <div style="text-align:left;font-size:12px;color:#64748b;line-height:1.8;">
    <div>${title}</div>
    <div>التاريخ: ${new Date().toLocaleDateString('ar-SY')}</div>
  </div>
</div>
<div class="rpt-title">${title}</div>
${bodyHTML}
<div class="footer">نظام أعمالي ERP — جميع الحقوق محفوظة © ${new Date().getFullYear()}</div>
</body></html>`);
    win.document.close();
    setTimeout(() => { win.print(); }, 700);
  };

  window.exportToCSV = function(rows, filename) {
    const bom = '\uFEFF';
    const csv = bom + rows.map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n');
    const a = document.createElement('a');
    a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
    a.download = filename;
    a.click();
  };

  window.navigate = async function(module) {
    window.location.hash = module;

    document.querySelectorAll('.sidebar-item').forEach(el => {
      el.classList.toggle('active', el.dataset.module === module);
    });

    openGroupForModule(module);

    const content = document.getElementById('content');
    content.innerHTML = `
      <div class="empty-state">
        <div class="spinner" style="margin:0 auto"></div>
      </div>
    `;

    try {
      let html = '';
      switch(module) {
        case 'dashboard':   html = await renderDashboard(); break;
        case 'crm':         html = await renderCRM(); break;
        case 'sales':         html = await renderSales(); break;
        case 'installments':  html = await renderInstallments(); break;
        case 'commissions':   html = await renderCommissions(); break;
        case 'inventory':     html = await renderInventory(); break;
        case 'cashbox':       html = await renderCashbox(); break;
        case 'expenses':      html = await renderExpenses(); break;
        case 'debts':         html = await renderDebt(); break;
        case 'suppliers':     html = await renderSuppliers(); break;
        case 'purchases':   html = await renderPurchases(); break;
        case 'accounting':  html = await renderAccounting(); break;
        case 'hr':          html = await renderHR(); break;
        case 'operations':  html = await renderOperations(); break;
        case 'reports':     html = await renderReports(); break;
        case 'settings':    html = await renderSettings(); break;
        default:            html = await renderDashboard();
      }
      content.innerHTML = html;
      content.classList.add('animate-fade');
      setTimeout(() => content.classList.remove('animate-fade'), 500);

      if (window.innerWidth <= 1024) closeMobileSidebar();
      content.scrollTop = 0;

      if (typeof window[`init_${module}`] === 'function') {
        window[`init_${module}`]();
      }

    } catch(err) {
      content.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">⚠️</div>
          <div class="empty-title">خطأ في التحميل</div>
          <div class="empty-desc">${err.message}</div>
          <button class="btn btn-primary" onclick="navigate('${module}')">إعادة المحاولة</button>
        </div>
      `;
    }
  };

  async function renderDashboard() {
    const today = new Date().toISOString().slice(0,10);
    const invs  = (window._invoices || []);
    const totalSalesRaw = (typeof _sumBase === 'function') ? _sumBase(invs) : 0;
    const totalSvcRev   = (typeof _serviceRevenueBase === 'function') ? _serviceRevenueBase(invs) : 0;
    const totalSales    = totalSalesRaw - totalSvcRev;   // مبيعات المنتجات فقط (بدون الخدمات)
    const totalSalesFmt = window.Currency
      ? window.Currency.formatCompact(totalSales, window.Currency.base)
      : (Math.round(totalSales)).toLocaleString('en-US') + ' ل.س';

    const now = new Date();
    const realInvs = invs.filter(inv => inv && inv.status !== 'draft' && inv.status !== 'quotation');
    const invoicesToday = realInvs.filter(inv => {
      if (!inv.date) return false;
      const d = new Date(String(inv.date).replace(/\//g,'-'));
      return !isNaN(d) && d.toDateString() === now.toDateString();
    }).length;
    const outOfStock = (window._products || []).filter(p => (Number(p.stock) || 0) <= 0).length;
    const _parseArDate = (s) => {
      if (!s) return null;
      const en = String(s)
        .replace(/[\u0660-\u0669]/g, c => c.charCodeAt(0) - 0x0660)
        .replace(/[\u06F0-\u06F9]/g, c => c.charCodeAt(0) - 0x06F0);
      const parts = en.replace(/[^\d/]/g, '').split('/').filter(Boolean).map(Number);
      if (parts.length < 3) return null;
      return { d: parts[0], m: parts[1], y: parts[2] };
    };
    const newCustomers = (window._customers || []).filter(c => {
      const p = _parseArDate(c.date);
      return p && p.m === now.getMonth() + 1 && p.y === now.getFullYear();
    }).length;
    const totalCustomers = (window._customers || []).length;

    return `
    <div class="module-wrap">
      <div class="module-header">
        <div>
          <h1 class="module-title">لوحة التحكم 📊</h1>
          <p class="module-subtitle">مرحباً بك — ${new Date().toLocaleDateString('ar-SY', {weekday:'long',year:'numeric',month:'long',day:'numeric'})}</p>
        </div>
        <div style="display:flex;gap:var(--sp-3);">
          <button class="btn btn-secondary btn-sm" onclick="exportDashboard()">📥 تصدير</button>
          <button class="btn btn-primary btn-sm" onclick="navigate('sales')">+ فاتورة جديدة</button>
        </div>
      </div>

      <!-- Period Selector (applies to المبيعات + صافي الربح) -->
      <div class="dash-period-bar" style="display:flex;flex-wrap:wrap;gap:var(--sp-2);margin-bottom:var(--sp-4);">
        <button class="btn btn-sm dash-period-btn" data-period="today"     onclick="setDashPeriod('today',this)">اليوم</button>
        <button class="btn btn-sm dash-period-btn" data-period="yesterday" onclick="setDashPeriod('yesterday',this)">أمس</button>
        <button class="btn btn-sm dash-period-btn" data-period="week"      onclick="setDashPeriod('week',this)">هذا الأسبوع</button>
        <button class="btn btn-sm dash-period-btn" data-period="lastweek"  onclick="setDashPeriod('lastweek',this)">الأسبوع الماضي</button>
        <button class="btn btn-sm dash-period-btn" data-period="month"     onclick="setDashPeriod('month',this)">هذا الشهر</button>
        <button class="btn btn-sm dash-period-btn" data-period="lastmonth" onclick="setDashPeriod('lastmonth',this)">الشهر الماضي</button>
        <button class="btn btn-sm dash-period-btn" data-period="lastyear"  onclick="setDashPeriod('lastyear',this)">السنة الماضية</button>
        <button class="btn btn-sm dash-period-btn" data-period="all"       onclick="setDashPeriod('all',this)">الكل</button>
      </div>

      <!-- Custom date range (من تاريخ إلى تاريخ) -->
      <div style="display:flex;flex-wrap:wrap;align-items:center;gap:var(--sp-2);margin-bottom:var(--sp-4);">
        <span style="color:var(--text-muted);font-size:var(--text-sm);">من</span>
        <input type="date" id="dash-date-from" class="form-input" style="width:auto;padding:var(--sp-1) var(--sp-2);">
        <span style="color:var(--text-muted);font-size:var(--text-sm);">إلى</span>
        <input type="date" id="dash-date-to" class="form-input" style="width:auto;padding:var(--sp-1) var(--sp-2);">
        <button class="btn btn-secondary btn-sm" onclick="applyDashCustomRange()">تطبيق 🗓️</button>
      </div>

      <!-- KPI Cards -->
      <div class="kpi-grid">
        <div class="kpi-card">
          <div class="kpi-icon kpi-icon-green">💰</div>
          <div class="kpi-info">
            <div class="kpi-label">إجمالي المبيعات</div>
            <div class="kpi-value" id="dash-kpi-sales">${totalSalesFmt}</div>
            <div class="kpi-change" id="dash-kpi-sales-sub" style="color:var(--text-muted);">${invs.length ? invs.length+' فاتورة' : 'لا توجد بيانات بعد'}</div>
          </div>
        </div>
        <div class="kpi-card">
          <div class="kpi-icon kpi-icon-blue">📈</div>
          <div class="kpi-info">
            <div class="kpi-label">صافي الربح</div>
            <div class="kpi-value" id="dash-kpi-profit">—</div>
            <div class="kpi-change" id="dash-kpi-profit-sub" style="color:var(--text-muted);">مبيعات − تكلفة − مصاريف</div>
          </div>
        </div>
        <div class="kpi-card">
          <div class="kpi-icon kpi-icon-blue">🧾</div>
          <div class="kpi-info">
            <div class="kpi-label">الفواتير (اليوم)</div>
            <div class="kpi-value">${invoicesToday}</div>
            <div class="kpi-change" style="color:var(--text-muted);">${invoicesToday ? 'فاتورة اليوم' : 'لا فواتير اليوم'}</div>
          </div>
        </div>
        <div class="kpi-card">
          <div class="kpi-icon kpi-icon-amber">📦</div>
          <div class="kpi-info">
            <div class="kpi-label">منتجات نفد مخزونها</div>
            <div class="kpi-value">${outOfStock}</div>
            <div class="kpi-change" style="color:${outOfStock ? 'var(--danger)' : 'var(--text-muted)'};">${outOfStock ? 'بحاجة لإعادة طلب' : 'المخزون بحالة جيدة'}</div>
          </div>
        </div>
        <div class="kpi-card">
          <div class="kpi-icon kpi-icon-red">👥</div>
          <div class="kpi-info">
            <div class="kpi-label">عملاء جدد (هذا الشهر)</div>
            <div class="kpi-value">${newCustomers}</div>
            <div class="kpi-change" style="color:var(--text-muted);">${totalCustomers ? 'إجمالي العملاء: ' + totalCustomers : 'لا يوجد عملاء بعد'}</div>
          </div>
        </div>
      </div>

      <!-- Charts + Activity -->
      <div class="dashboard-grid">

        <!-- Revenue Chart -->
        <div class="chart-box">
          <div class="chart-header">
            <h3 class="chart-title">المبيعات الشهرية</h3>
            <div style="display:flex;gap:var(--sp-2);">
              <button class="tab-btn active btn-sm" onclick="switchChartPeriod(this,'daily')">يومي</button>
              <button class="tab-btn btn-sm" onclick="switchChartPeriod(this,'weekly')">أسبوعي</button>
              <button class="tab-btn btn-sm" onclick="switchChartPeriod(this,'monthly')">شهري</button>
            </div>
          </div>
          <div class="bar-chart" id="revenue-chart">
            <div class="empty-state" style="width:100%;padding:var(--sp-8) var(--sp-4);text-align:center;color:var(--text-muted);">
              <div class="empty-icon" style="font-size:32px;">📊</div>
              <div class="empty-title">لا توجد بيانات مبيعات بعد</div>
            </div>
          </div>
          <div class="chart-legend" style="margin-top:var(--sp-4);">
            <div class="legend-item"><div class="legend-dot" style="background:var(--primary)"></div>المبيعات</div>
          </div>
        </div>

        <!-- Side Panel -->
        <div style="display:flex;flex-direction:column;gap:var(--sp-5);">

          <!-- Quick Actions -->
          <div class="chart-box">
            <div class="chart-header"><h3 class="chart-title">إجراءات سريعة</h3></div>
            <div class="quick-actions" style="margin-top:var(--sp-3);">
              <div class="quick-action" onclick="navigate('sales')">
                <div class="quick-action-icon">🧾</div>
                <div class="quick-action-label">فاتورة جديدة</div>
              </div>
              <div class="quick-action" onclick="navigate('crm')">
                <div class="quick-action-icon">👤</div>
                <div class="quick-action-label">عميل جديد</div>
              </div>
              <div class="quick-action" onclick="navigate('inventory')">
                <div class="quick-action-icon">📦</div>
                <div class="quick-action-label">منتج جديد</div>
              </div>
              <div class="quick-action" onclick="navigate('purchases')">
                <div class="quick-action-icon">🛒</div>
                <div class="quick-action-label">طلب شراء</div>
              </div>
              <div class="quick-action" onclick="navigate('hr')">
                <div class="quick-action-icon">👨‍💼</div>
                <div class="quick-action-label">إضافة موظف</div>
              </div>
              <div class="quick-action" onclick="window.open('cashier.html','_blank')">
                <div class="quick-action-icon">🏪</div>
                <div class="quick-action-label">فتح الكاشير</div>
              </div>
            </div>
          </div>

          <!-- Recent Activity -->
          <div class="chart-box" style="flex:1;">
            <div class="chart-header"><h3 class="chart-title">آخر الأنشطة — اليوم</h3></div>
            <div class="activity-feed">${generateRecentActivity()}</div>
          </div>

        </div>
      </div>

      <!-- Recent Invoices -->
      <div class="chart-box" style="margin-top:var(--sp-5);">
        <div class="chart-header">
          <h3 class="chart-title">أحدث الفواتير</h3>
          <button class="btn btn-ghost btn-sm" onclick="navigate('sales')">عرض الكل ←</button>
        </div>
        <div class="table-wrap" style="margin-top:var(--sp-4);border:none;box-shadow:none;">
          <table class="table">
            <thead>
              <tr>
                <th>رقم الفاتورة</th>
                <th>العميل</th>
                <th>المبلغ</th>
                <th>الحالة</th>
                <th>التاريخ</th>
                <th>إجراءات</th>
              </tr>
            </thead>
            <tbody>
              ${generateInvoiceRows()}
            </tbody>
          </table>
        </div>
      </div>
    </div>
    `;
  }

  function generateInvoiceRows() {
    const statusMap = {
      paid:    { label:'مدفوعة', cls:'badge-success' },
      pending: { label:'معلقة', cls:'badge-warning' },
      overdue: { label:'متأخرة', cls:'badge-danger' },
      draft:   { label:'مسودة', cls:'badge-gray' },
    };
    return (window._invoices || []).slice(0,5).map(inv => `
      <tr>
        <td><span style="font-weight:700;color:var(--primary);">${inv.id}</span></td>
        <td>${inv.client}</td>
        <td style="font-weight:700;">${_fmtInvAmount(inv)}</td>
        <td><span class="badge ${statusMap[inv.status]?.cls||'badge-gray'}">${statusMap[inv.status]?.label||inv.status}</span></td>
        <td style="color:var(--text-muted);">${inv.date}</td>
        <td>
          <div class="table-actions">
            <button class="btn btn-ghost btn-sm" title="عرض" onclick="viewInvoice('${inv.id}')">👁</button>
            <button class="btn btn-ghost btn-sm" title="طباعة" onclick="printInvoice('${inv.id}')">🖨️</button>
          </div>
        </td>
      </tr>
    `).join('');
  }

  function generateRecentActivity() {
    const todayStr = new Date().toDateString();
    const norm = (s) => String(s)
      .replace(/[\u0660-\u0669]/g, c => c.charCodeAt(0) - 0x0660)
      .replace(/[\u06F0-\u06F9]/g, c => c.charCodeAt(0) - 0x06F0)
      .replace(/[\u200e\u200f]/g, '').trim();
    const tsOf = (rec) => {
      if (rec.createdAt != null) { const d = new Date(rec.createdAt); if (!isNaN(d)) return { ts: d.getTime(), hasTime: true }; }
      if (rec.timestamp != null) { const d = new Date(rec.timestamp); if (!isNaN(d)) return { ts: d.getTime(), hasTime: true }; }
      if (rec.date) {
        const ds = norm(rec.date);
        let d = new Date(ds.replace(/\//g,'-'));
        if (!isNaN(d)) return { ts: d.getTime(), hasTime: false };
        const p = ds.split(/[\/\-]/).map(Number);
        if (p.length === 3) { d = new Date(p[2], p[1] - 1, p[0]); if (!isNaN(d)) return { ts: d.getTime(), hasTime: false }; }
      }
      return { ts: 0, hasTime: false };
    };
    const money = (a, c) => window.Currency
      ? window.Currency.formatCompact(a, c || 'SYP')
      : (Number(a) || 0).toLocaleString('en-US') + ' ل.س';

    const ev = [];
    (window._invoices || []).forEach(r => {
      if (r.status === 'draft' || r.status === 'quotation') return;
      const { ts, hasTime } = tsOf(r);
      ev.push({ ts, hasTime, icon: '🧾', color: 'var(--success)',
        title: `فاتورة ${r.id || ''} — ${r.client || 'عميل'} • ${money(r.amount, r.currency)}` });
    });
    (window._expenses || []).forEach(r => {
      const { ts, hasTime } = tsOf(r);
      ev.push({ ts, hasTime, icon: '💸', color: 'var(--danger)',
        title: `مصروف — ${r.category || ''} • ${money(r.amount, r.currency)}` });
    });
    (window._cashbox || []).forEach(r => {
      const { ts, hasTime } = tsOf(r);
      ev.push({ ts, hasTime, icon: r.type === 'deposit' ? '⬇️' : '⬆️', color: 'var(--primary)',
        title: `${r.type === 'deposit' ? 'إيداع في الصندوق' : 'سحب من الصندوق'} • ${money(r.amount, r.currency)}` });
    });
    (window._purchases || []).forEach(r => {
      const { ts, hasTime } = tsOf(r);
      ev.push({ ts, hasTime, icon: '🛒', color: 'var(--warning)',
        title: `أمر شراء — ${r.supplier || r.supplierName || ''} • ${money(r.total != null ? r.total : r.amount, r.currency)}` });
    });
    (window._customers || []).forEach(r => {
      const { ts, hasTime } = tsOf(r);
      ev.push({ ts, hasTime, icon: '👤', color: 'var(--primary)',
        title: `عميل جديد — ${r.name || ''}` });
    });

    const today = ev
      .filter(e => e.ts && new Date(e.ts).toDateString() === todayStr)
      .sort((a, b) => b.ts - a.ts);

    if (!today.length) {
      return `<div class="empty-state" style="padding:var(--sp-8) var(--sp-4);text-align:center;color:var(--text-muted);">
        <div class="empty-icon" style="font-size:32px;">🕘</div>
        <div class="empty-title">لا توجد أنشطة اليوم</div>
      </div>`;
    }
    const fmtTime = (ts) => new Date(ts).toLocaleTimeString('ar-SY', { hour: '2-digit', minute: '2-digit' });
    return today.slice(0, 12).map(e => `
      <div class="activity-item">
        <div class="activity-dot" style="background:${e.color};"></div>
        <div class="activity-body">
          <div class="activity-title">${e.icon} ${e.title}</div>
          <div class="activity-time">${e.hasTime ? fmtTime(e.ts) : 'اليوم'}</div>
        </div>
      </div>`).join('');
  }

  async function renderCRM() {
    return `
    <div class="module-wrap">
      <div class="module-header">
        <div>
          <h1 class="module-title">إدارة العملاء 👥</h1>
          <p class="module-subtitle">إدارة علاقات العملاء وتتبع الأنشطة</p>
        </div>
        <button class="btn btn-primary" onclick="openNewCustomerModal()">+ عميل جديد</button>
      </div>

      <!-- Stats Row -->
      <div class="kpi-grid" style="margin-bottom:var(--sp-5);">
        <div class="kpi-card"><div class="kpi-icon kpi-icon-blue">👥</div><div class="kpi-info"><div class="kpi-label">إجمالي العملاء</div><div class="kpi-value" id="crm-kpi-total">0</div></div></div>
        <div class="kpi-card"><div class="kpi-icon kpi-icon-green">✅</div><div class="kpi-info"><div class="kpi-label">عملاء نشطون</div><div class="kpi-value" id="crm-kpi-active">0</div></div></div>
        <div class="kpi-card"><div class="kpi-icon kpi-icon-amber">⏳</div><div class="kpi-info"><div class="kpi-label">متابعات مجدولة</div><div class="kpi-value" id="crm-kpi-followups">0</div></div></div>
        <div class="kpi-card"><div class="kpi-icon kpi-icon-red">⭐</div><div class="kpi-info"><div class="kpi-label">عملاء VIP</div><div class="kpi-value" id="crm-kpi-vip">0</div></div></div>
      </div>

      <div class="module-toolbar">
        <div class="search-wrap" style="flex:1;max-width:340px;">
          <input class="search-input" type="text" placeholder="البحث عن عميل..." oninput="filterCustomers(this.value)" />
          <span class="search-icon">🔍</span>
        </div>
        <select class="form-input" style="width:auto;height:38px;font-size:var(--text-sm);" onchange="filterCustomerType(this.value)">
          <option value="">كل الفئات</option>
          <option value="VIP">VIP</option>
          <option value="عميل عادي">عميل عادي</option>
          <option value="شركة">شركة</option>
        </select>
        ${window._sortSelectHTML('customers-body')}
        <button class="btn btn-secondary btn-sm" onclick="exportCustomersCSV()">📥 تصدير Excel</button>
      </div>

      <div class="table-wrap">
        <table class="table" id="customers-table">
          <thead>
            <tr>
              <th>#</th>
              <th>الاسم</th>
              <th>رقم الهاتف</th>
              <th>البريد الإلكتروني</th>
              <th>إجمالي المشتريات</th>
              <th>نقاط الولاء</th>
              <th>الحالة</th>
              <th>إجراءات</th>
            </tr>
          </thead>
          <tbody id="customers-body">
            ${generateCustomerRows()}
          </tbody>
        </table>
      </div>
      <div class="pagination" id="customers-pagination">
        <button class="page-btn">‹</button>
        <button class="page-btn active">1</button>
        <button class="page-btn">2</button>
        <button class="page-btn">3</button>
        <button class="page-btn">›</button>
      </div>
    </div>

    <!-- New Customer Modal -->
    <div class="modal-overlay" id="new-customer-modal">
      <div class="modal modal-lg">
        <div class="modal-header">
          <h3 class="modal-title">إضافة عميل جديد</h3>
          <button class="modal-close" onclick="closeModal('new-customer-modal')">✕</button>
        </div>
        <div class="modal-body">
          <div class="form-row">
            <div class="form-group"><label class="form-label">الاسم الكامل <span>*</span></label><input type="text" class="form-input" placeholder="اسم العميل" /></div>
            <div class="form-group"><label class="form-label">رقم الهاتف <span>*</span></label><input type="tel" class="form-input" placeholder="+966 5x xxx xxxx" /></div>
          </div>
          <div class="form-row">
            <div class="form-group"><label class="form-label">البريد الإلكتروني</label><input type="email" class="form-input" placeholder="email@example.com" /></div>
            <div class="form-group"><label class="form-label">اسم الشركة</label><input type="text" class="form-input" placeholder="اختياري" /></div>
          </div>
          <div class="form-row">
            <div class="form-group"><label class="form-label">المدينة</label><input type="text" class="form-input" placeholder="مثال: دمشق" /></div>
            <div class="form-group"><label class="form-label">نوع العميل</label>
              <select class="form-select">
                <option>عميل عادي</option>
                <option>VIP</option>
                <option>شركة</option>
              </select>
            </div>
          </div>
          <div class="form-group"><label class="form-label">ملاحظات</label><textarea class="form-input form-textarea" placeholder="أي معلومات إضافية..."></textarea></div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" onclick="closeModal('new-customer-modal')">إلغاء</button>
          <button class="btn btn-primary" onclick="saveCustomer()">حفظ العميل</button>
        </div>
      </div>
    </div>
    `;
  }

  function generateCustomerRows() {
    const list = (window._customers || []);
    if (!list.length) {
      return `
      <tr><td colspan="8">
        <div class="empty-state" style="padding:var(--sp-12);">
          <div class="empty-icon">👥</div>
          <div class="empty-title">لا يوجد عملاء بعد</div>
          <div class="empty-desc">ابدأ بإضافة أول عميل لقاعدة بياناتك</div>
          <button class="btn btn-primary" style="margin-top:var(--sp-4);" onclick="openModal('new-customer-modal')">+ إضافة عميل</button>
        </div>
      </td></tr>
    `;
    }
    const base = window.Currency ? window.Currency.base : 'SYP';
    return list.map((c, i) => {
      const type = c.type || 'عميل عادي';
      const typeBadge = type === 'VIP' ? 'badge-warning' : (type === 'شركة' ? 'badge-info' : 'badge-success');
      const safeName = String(c.name || '').replace(/'/g, "\\'");
      return `
      <tr data-cust="${`${c.name||''} ${c.phone||''} ${c.email||''} ${c.company||''}`.toLowerCase()}" data-cust-type="${type}" data-cust-date="${c.date||''}" data-ts="${window._dateToTs(c.date || c.createdAt)}">
        <td>${i + 1}</td>
        <td style="font-weight:700;">${c.name || '—'}</td>
        <td>${c.phone || '—'}</td>
        <td>${c.email || '—'}</td>
        <td style="font-weight:700;">${_fmt(Number(c.totalPurchases) || 0, base)}</td>
        <td>${Number(c.loyalty) || 0}</td>
        <td><span class="badge ${typeBadge}">${type}</span></td>
        <td><div class="table-actions">
          <button class="btn btn-ghost btn-sm" onclick="confirmDelete('${safeName}')">🗑️</button>
        </div></td>
      </tr>`;
    }).join('');
  }

  window.init_crm = function() {
    const list = (window._customers || []);
    const vip  = list.filter(c => (c.type || '') === 'VIP').length;
    const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
    set('crm-kpi-total', list.length);
    set('crm-kpi-active', list.length);
    set('crm-kpi-followups', 0);
    set('crm-kpi-vip', vip);
  };

  async function renderInstallments() {
    return `
    <div class="module-wrap">
      <div class="module-header">
        <div>
          <h2 class="module-title">📅 إدارة الأقساط</h2>
          <p class="module-subtitle">تتبع المبيعات الآجلة وجداول السداد</p>
        </div>
        <div style="display:flex;gap:var(--sp-3);">
          <button class="btn btn-secondary btn-sm" onclick="exportInstallmentsCSV()">📥 تصدير</button>
          <button class="btn btn-primary" onclick="openModal('new-installment-modal')">+ قسط جديد</button>
        </div>
      </div>

      <!-- KPI Cards -->
      <div class="kpi-grid">
        <div class="kpi-card">
          <div class="kpi-icon kpi-icon-blue">💰</div>
          <div class="kpi-info"><div class="kpi-label">إجمالي الآجل</div><div class="kpi-value" id="inst-kpi-total">0 ل.س</div></div>
        </div>
        <div class="kpi-card">
          <div class="kpi-icon kpi-icon-amber">⏳</div>
          <div class="kpi-info"><div class="kpi-label">أقساط متأخرة</div><div class="kpi-value" id="inst-kpi-overdue">0</div></div>
        </div>
        <div class="kpi-card">
          <div class="kpi-icon kpi-icon-green">✅</div>
          <div class="kpi-info"><div class="kpi-label">مُحصَّل هذا الشهر</div><div class="kpi-value" id="inst-kpi-collected">0 ل.س</div></div>
        </div>
        <div class="kpi-card">
          <div class="kpi-icon kpi-icon-red">🔔</div>
          <div class="kpi-info"><div class="kpi-label">مستحقة اليوم</div><div class="kpi-value" id="inst-kpi-today">0</div></div>
        </div>
      </div>

      <!-- Tabs -->
      <div class="tabs" style="margin-bottom:var(--sp-5);">
        <button class="tab-btn active" onclick="switchInstTab(this,'active')">الأقساط النشطة</button>
        <button class="tab-btn" onclick="switchInstTab(this,'overdue')">المتأخرة</button>
        <button class="tab-btn" onclick="switchInstTab(this,'completed')">المكتملة</button>
        <button class="tab-btn" onclick="switchInstTab(this,'schedule')">جدول السداد</button>
      </div>

      <!-- Active installments table -->
      <div id="inst-tab-active">
        <div class="module-toolbar" style="justify-content:flex-end;margin-bottom:var(--sp-3);">
          ${window._sortSelectHTML('inst-table-body')}
        </div>
        <div class="table-wrap">
          <table class="table">
            <thead>
              <tr>
                <th>#</th>
                <th>العميل</th>
                <th>المنتج / الفاتورة</th>
                <th>إجمالي القيمة</th>
                <th>المدفوع</th>
                <th>المتبقي</th>
                <th>القسط الشهري</th>
                <th>تاريخ القسط القادم</th>
                <th>الحالة</th>
                <th>إجراءات</th>
              </tr>
            </thead>
            <tbody id="inst-table-body">
              <tr>
                <td colspan="10" style="text-align:center;padding:var(--sp-10);color:var(--text-muted);">
                  <div style="font-size:3rem;">📅</div>
                  <div style="font-weight:700;margin:var(--sp-3) 0 var(--sp-2);">لا توجد أقساط بعد</div>
                  <button class="btn btn-primary btn-sm" onclick="openModal('new-installment-modal')">+ إضافة قسط جديد</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      <div id="inst-tab-overdue" style="display:none;">
        <div class="empty-state"><div class="empty-icon">✅</div><div class="empty-title">لا توجد أقساط متأخرة</div></div>
      </div>
      <div id="inst-tab-completed" style="display:none;">
        <div class="empty-state"><div class="empty-icon">🏆</div><div class="empty-title">لا توجد أقساط مكتملة بعد</div></div>
      </div>
      <div id="inst-tab-schedule" style="display:none;">
        <div class="empty-state"><div class="empty-icon">📆</div><div class="empty-title">اختر قسطاً لعرض جدوله</div></div>
      </div>
    </div>

    <!-- New Installment Modal -->
    <div class="modal-overlay" id="new-installment-modal">
      <div class="modal modal-lg">
        <div class="modal-header">
          <h3 class="modal-title">📅 إضافة قسط جديد</h3>
          <button class="modal-close" onclick="closeModal('new-installment-modal')">✕</button>
        </div>
        <div class="modal-body">
          <div class="form-grid" style="grid-template-columns:1fr 1fr;">
            <div class="form-group">
              <label class="form-label">العميل *</label>
              <input type="text" class="form-input" id="inst-customer" placeholder="اسم العميل" />
            </div>
            <div class="form-group">
              <label class="form-label">رقم الهاتف</label>
              <input type="text" class="form-input" id="inst-phone" placeholder="+963..." />
            </div>
            <div class="form-group">
              <label class="form-label">المنتج / الوصف *</label>
              <input type="text" class="form-input" id="inst-product" placeholder="اسم المنتج أو الفاتورة" />
            </div>
            <div class="form-group">
              <label class="form-label">إجمالي القيمة (ل.س) *</label>
              <input type="number" class="form-input" id="inst-total" placeholder="0" oninput="calcInstallmentPreview()" />
            </div>
            <div class="form-group">
              <label class="form-label">الدفعة الأولى (ل.س)</label>
              <input type="number" class="form-input" id="inst-down" placeholder="0" oninput="calcInstallmentPreview()" />
            </div>
            <div class="form-group">
              <label class="form-label">عدد الأقساط *</label>
              <input type="number" class="form-input" id="inst-count" placeholder="12" min="1" max="60" oninput="calcInstallmentPreview()" />
            </div>
            <div class="form-group">
              <label class="form-label">تاريخ أول قسط *</label>
              <input type="date" class="form-input" id="inst-start-date" />
            </div>
            <div class="form-group">
              <label class="form-label">نسبة الفائدة (%) اختياري</label>
              <input type="number" class="form-input" id="inst-interest" placeholder="0" min="0" max="100" oninput="calcInstallmentPreview()" />
            </div>
          </div>
          <div id="inst-preview" style="background:var(--surface-2);border-radius:var(--r-lg);padding:var(--sp-4);margin-top:var(--sp-4);display:none;">
            <div style="font-weight:700;margin-bottom:var(--sp-2);">معاينة الخطة:</div>
            <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:var(--sp-3);font-size:var(--text-sm);">
              <div><span style="color:var(--text-muted);">قيمة القسط الشهري:</span><br/><strong id="inst-prev-monthly" style="color:var(--primary);font-size:var(--text-lg);">—</strong></div>
              <div><span style="color:var(--text-muted);">إجمالي مع الفائدة:</span><br/><strong id="inst-prev-total">—</strong></div>
              <div><span style="color:var(--text-muted);">المتبقي بعد الدفعة:</span><br/><strong id="inst-prev-remaining">—</strong></div>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-ghost" onclick="closeModal('new-installment-modal')">إلغاء</button>
          <button class="btn btn-primary" onclick="saveInstallment()">💾 حفظ الخطة</button>
        </div>
      </div>
    </div>
    `;
  }

  async function renderCommissions() {
    return `
    <div class="module-wrap">
      <div class="module-header">
        <div>
          <h2 class="module-title">🎯 المبيعات المستهدفة والعمولات</h2>
          <p class="module-subtitle">تتبع أهداف المبيعات وعمولات المندوبين</p>
        </div>
        <div style="display:flex;gap:var(--sp-3);">
          <button class="btn btn-secondary btn-sm" onclick="exportCommissionsCSV()">📥 تصدير</button>
          <button class="btn btn-primary" onclick="openModal('new-target-modal')">+ هدف جديد</button>
        </div>
      </div>

      <!-- KPI Cards -->
      <div class="kpi-grid">
        <div class="kpi-card">
          <div class="kpi-icon kpi-icon-blue">🎯</div>
          <div class="kpi-info"><div class="kpi-label">الهدف الشهري</div><div class="kpi-value" id="com-kpi-target">0 ل.س</div></div>
        </div>
        <div class="kpi-card">
          <div class="kpi-icon kpi-icon-green">📈</div>
          <div class="kpi-info"><div class="kpi-label">المحقق</div><div class="kpi-value" id="com-kpi-achieved">0 ل.س</div></div>
        </div>
        <div class="kpi-card">
          <div class="kpi-icon kpi-icon-amber">💵</div>
          <div class="kpi-info"><div class="kpi-label">العمولات المستحقة</div><div class="kpi-value" id="com-kpi-commission">0 ل.س</div></div>
        </div>
        <div class="kpi-card">
          <div class="kpi-icon kpi-icon-red">👥</div>
          <div class="kpi-info"><div class="kpi-label">المندوبون النشطون</div><div class="kpi-value" id="com-kpi-reps">0</div></div>
        </div>
      </div>

      <!-- Tabs -->
      <div class="tabs" style="margin-bottom:var(--sp-5);">
        <button class="tab-btn active" onclick="switchComTab(this,'targets')">الأهداف</button>
        <button class="tab-btn" onclick="switchComTab(this,'reps')">المندوبون</button>
        <button class="tab-btn" onclick="switchComTab(this,'commissions')">العمولات</button>
        <button class="tab-btn" onclick="switchComTab(this,'leaderboard')">لوحة المتصدرين</button>
      </div>

      <!-- Targets Tab -->
      <div id="com-tab-targets">
        <div class="table-wrap">
          <table class="table">
            <thead>
              <tr>
                <th>#</th>
                <th>المندوب / الفريق</th>
                <th>الفترة</th>
                <th>الهدف</th>
                <th>المحقق</th>
                <th>نسبة الإنجاز</th>
                <th>العمولة المكتسبة</th>
                <th>الحالة</th>
                <th>إجراءات</th>
              </tr>
            </thead>
            <tbody id="targets-table-body">
              <tr>
                <td colspan="9" style="text-align:center;padding:var(--sp-10);color:var(--text-muted);">
                  <div style="font-size:3rem;">🎯</div>
                  <div style="font-weight:700;margin:var(--sp-3) 0 var(--sp-2);">لا توجد أهداف مبيعات بعد</div>
                  <button class="btn btn-primary btn-sm" onclick="openModal('new-target-modal')">+ إضافة هدف</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Reps Tab -->
      <div id="com-tab-reps" style="display:none;">
        <div style="display:flex;justify-content:flex-end;margin-bottom:var(--sp-4);">
          <button class="btn btn-primary btn-sm" onclick="openModal('new-rep-modal')">+ إضافة مندوب</button>
        </div>
        <div class="table-wrap">
          <table class="table">
            <thead>
              <tr><th>#</th><th>الاسم</th><th>القسم</th><th>نسبة العمولة</th><th>المبيعات الشهرية</th><th>العمولة المستحقة</th><th>الحالة</th><th>إجراءات</th></tr>
            </thead>
            <tbody id="reps-table-body">
              <tr><td colspan="8" style="text-align:center;padding:var(--sp-8);color:var(--text-muted);">
                <div style="font-size:2rem;">👥</div>
                <div style="font-weight:700;margin-top:var(--sp-2);">لا يوجد مندوبون مضافون</div>
              </td></tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Commissions Tab -->
      <div id="com-tab-commissions" style="display:none;">
        <div class="table-wrap">
          <table class="table">
            <thead>
              <tr>
                <th>#</th>
                <th>المندوب</th>
                <th>مبيعات الشهر</th>
                <th>نسبة العمولة</th>
                <th>عمولة المبيعات</th>
                <th>عمولة الأهداف</th>
                <th>الإجمالي المستحق</th>
              </tr>
            </thead>
            <tbody id="commissions-table-body">
              <tr><td colspan="7" style="text-align:center;padding:var(--sp-8);color:var(--text-muted);">
                <div style="font-size:2rem;">💵</div>
                <div style="font-weight:700;margin-top:var(--sp-2);">لا توجد عمولات محسوبة بعد</div>
              </td></tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Leaderboard Tab -->
      <div id="com-tab-leaderboard" style="display:none;">
        <div class="table-wrap">
          <table class="table">
            <thead>
              <tr>
                <th>الترتيب</th>
                <th>المندوب</th>
                <th>مبيعات الشهر</th>
                <th>نسبة الإنجاز</th>
              </tr>
            </thead>
            <tbody id="leaderboard-table-body">
              <tr><td colspan="4" style="text-align:center;padding:var(--sp-8);color:var(--text-muted);">
                <div style="font-size:2rem;">🏆</div>
                <div style="font-weight:700;margin-top:var(--sp-2);">لا يوجد مندوبون بعد</div>
              </td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- New Target Modal -->
    <div class="modal-overlay" id="new-target-modal">
      <div class="modal modal-lg">
        <div class="modal-header">
          <h3 class="modal-title">🎯 إضافة هدف مبيعات</h3>
          <button class="modal-close" onclick="closeModal('new-target-modal')">✕</button>
        </div>
        <div class="modal-body">
          <div class="form-grid" style="grid-template-columns:1fr 1fr;">
            <div class="form-group">
              <label class="form-label">المندوب / الفريق *</label>
              <input type="text" class="form-input" id="tgt-rep" placeholder="اسم المندوب أو الفريق" />
            </div>
            <div class="form-group">
              <label class="form-label">الفترة *</label>
              <select class="form-input" id="tgt-period">
                <option value="monthly">شهري</option>
                <option value="quarterly">ربع سنوي</option>
                <option value="yearly">سنوي</option>
                <option value="custom">مخصص</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">تاريخ البداية *</label>
              <input type="date" class="form-input" id="tgt-start" />
            </div>
            <div class="form-group">
              <label class="form-label">تاريخ النهاية *</label>
              <input type="date" class="form-input" id="tgt-end" />
            </div>
            <div class="form-group">
              <label class="form-label">قيمة الهدف (ل.س) *</label>
              <input type="number" class="form-input" id="tgt-value" placeholder="0" />
            </div>
            <div class="form-group">
              <label class="form-label">نسبة العمولة (%) *</label>
              <input type="number" class="form-input" id="tgt-commission" placeholder="5" min="0" max="100" step="0.5" />
            </div>
            <div class="form-group" style="grid-column:1/-1;">
              <label class="form-label">مكافأة عند تحقيق 100% (ل.س)</label>
              <input type="number" class="form-input" id="tgt-bonus" placeholder="اختياري" />
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-ghost" onclick="closeModal('new-target-modal')">إلغاء</button>
          <button class="btn btn-primary" onclick="saveTarget()">💾 حفظ الهدف</button>
        </div>
      </div>
    </div>

    <!-- New Rep Modal -->
    <div class="modal-overlay" id="new-rep-modal">
      <div class="modal">
        <div class="modal-header">
          <h3 class="modal-title">👤 إضافة مندوب مبيعات</h3>
          <button class="modal-close" onclick="closeModal('new-rep-modal')">✕</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label class="form-label">الاسم *</label>
            <input type="text" class="form-input" id="rep-name" placeholder="اسم المندوب" />
          </div>
          <div class="form-group">
            <label class="form-label">القسم</label>
            <input type="text" class="form-input" id="rep-dept" placeholder="قسم المبيعات" />
          </div>
          <div class="form-group">
            <label class="form-label">نسبة العمولة الافتراضية (%)</label>
            <input type="number" class="form-input" id="rep-rate" placeholder="5" min="0" max="100" step="0.5" />
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-ghost" onclick="closeModal('new-rep-modal')">إلغاء</button>
          <button class="btn btn-primary" onclick="saveRep()">💾 حفظ</button>
        </div>
      </div>
    </div>
    `;
  }

  async function renderSales() {
    return `
    <div class="module-wrap">
      <div class="module-header">
        <div>
          <h1 class="module-title">المبيعات والفواتير 🧾</h1>
          <p class="module-subtitle">إدارة الفواتير والمدفوعات</p>
        </div>
        <div style="display:flex;gap:var(--sp-3);">
          <button class="btn btn-secondary" onclick="openInvoicesPanel()">🧾 الفواتير</button>
          <button class="btn btn-primary" onclick="openNewInvoiceModal()">+ فاتورة جديدة</button>
        </div>
      </div>

      <div class="kpi-grid" style="margin-bottom:var(--sp-5);">
        <div class="kpi-card"><div class="kpi-icon kpi-icon-green">💰</div><div class="kpi-info"><div class="kpi-label">مبيعات هذا الشهر</div><div class="kpi-value" id="sales-kpi-month">0 ل.س</div></div></div>
        <div class="kpi-card"><div class="kpi-icon kpi-icon-blue">✅</div><div class="kpi-info"><div class="kpi-label">فواتير مدفوعة (هذا الشهر)</div><div class="kpi-value" id="sales-kpi-paid">0</div></div></div>
        <div class="kpi-card"><div class="kpi-icon kpi-icon-amber">⏳</div><div class="kpi-info"><div class="kpi-label">فواتير معلقة (هذا الشهر)</div><div class="kpi-value" id="sales-kpi-pending">0</div></div></div>
        <div class="kpi-card"><div class="kpi-icon kpi-icon-red">⚠️</div><div class="kpi-info"><div class="kpi-label">فواتير متأخرة (هذا الشهر)</div><div class="kpi-value" id="sales-kpi-overdue">0</div></div></div>
      </div>

      <!-- Tabs -->
      <div class="tabs" style="margin-bottom:var(--sp-5);">
        <button class="tab-btn active" onclick="switchSalesTab(this,'all')">الكل</button>
        <button class="tab-btn" onclick="switchSalesTab(this,'paid')">مدفوعة</button>
        <button class="tab-btn" onclick="switchSalesTab(this,'pending')">معلقة</button>
        <button class="tab-btn" onclick="switchSalesTab(this,'overdue')">متأخرة</button>
        <button class="tab-btn" onclick="switchSalesTab(this,'draft')">مسودات</button>
      </div>

      <div class="module-toolbar">
        <div class="search-wrap" style="flex:1;max-width:340px;">
          <input class="search-input" type="text" placeholder="بحث برقم الفاتورة أو اسم العميل..." oninput="filterInvoices(this.value)" />
          <span class="search-icon">🔍</span>
        </div>
        <select class="form-select" style="width:auto;height:38px;" title="نوع الفاتورة" id="inv-type-filter" onchange="filterInvoicesByType(this.value)">
          <option value="all">الكل</option>
          <option value="sales">🛒 مبيعات</option>
          <option value="services">⚙️ خدمات</option>
        </select>
        <select class="form-select" style="width:auto;height:38px;" title="تصفية حسب الموظف/البائع" onchange="filterInvoicesByEmployee(this.value)">
          ${invoiceEmployeeOptions()}
        </select>
        <input type="date" class="form-input" style="width:auto;height:38px;" title="تصفية بالتاريخ" onchange="filterInvoicesByDate(this.value)" />
        <select class="form-select" style="width:auto;height:38px;" title="ترتيب حسب التاريخ" onchange="sortInvoices(this.value)">
          <option value="newest">الأحدث أولاً ↓</option>
          <option value="oldest">الأقدم أولاً ↑</option>
        </select>
        <button class="btn btn-secondary btn-sm" onclick="exportInvoicesPDF()">📥 تصدير PDF</button>
      </div>

      <div class="table-wrap">
        <table class="table" id="invoices-table">
          <thead><tr><th>رقم الفاتورة</th><th>العميل</th><th>المبلغ</th><th>طريقة الدفع</th><th>سعر التصريف</th><th>الحالة</th><th>التاريخ</th><th>البائع</th><th>إجراءات</th></tr></thead>
          <tbody id="invoices-tbody">${generateFullInvoiceRows()}</tbody>
        </table>
      </div>
      <div class="pagination">
        <button class="page-btn">‹</button>
        <button class="page-btn active">1</button>
        <button class="page-btn">2</button>
        <button class="page-btn">›</button>
      </div>
    </div>

    <!-- New Invoice Modal -->
    <div class="modal-overlay" id="new-invoice-modal">
      <div class="modal modal-xl">
        <div class="modal-header">
          <h3 class="modal-title">إنشاء فاتورة جديدة</h3>
          <button class="modal-close" onclick="closeModal('new-invoice-modal')">✕</button>
        </div>
        <div class="modal-body">
          <div class="form-row">
            <div class="form-group"><label class="form-label">العميل <span>*</span></label>
              <input type="text" class="form-input" id="inv-client" placeholder="اسم العميل" list="customers-datalist" />
              <datalist id="customers-datalist"></datalist>
            </div>
            <div class="form-group"><label class="form-label">تاريخ الفاتورة <span>*</span></label>
              <input type="date" class="form-input" id="inv-date" />
            </div>
            <div class="form-group"><label class="form-label">طريقة الدفع <span>*</span></label>
              <select class="form-select" id="inv-method" onchange="onInvMethodChange(this.value)">
                <option value="نقد">نقد</option>
                <option value="بنك">بنك</option>
                <option value="POS">POS / بطاقة</option>
              </select>
            </div>
            <div class="form-group"><label class="form-label">العملة <span>*</span></label>
              <select class="form-select" id="inv-currency" onchange="calcInvoiceTotal()">
                <option value="SYP">ليرة سورية (ل.س)</option>
                <option value="USD">دولار ($)</option>
                <option value="TRY">ليرة تركية (₺)</option>
              </select>
            </div>
            <div class="form-group"><label class="form-label">المندوب</label>
              <select class="form-select" id="inv-rep">
                <option value="">— بدون مندوب —</option>
              </select>
            </div>
          </div>
          <!-- POS discount row - shown only when POS selected -->
          <div id="inv-pos-discount-row" style="display:none;padding:var(--sp-3);background:var(--surface-2);border-radius:var(--r-lg);margin-bottom:var(--sp-4);font-size:var(--text-sm);">
            <span>🎯 خصم POS المطبّق: </span>
            <strong id="inv-pos-discount-pct" style="color:var(--primary);">0%</strong>
          </div>
          <div style="border:1px solid var(--border);border-radius:var(--r-lg);overflow:hidden;margin-bottom:var(--sp-4);">
            <table class="table">
              <thead><tr><th>المنتج/الخدمة</th><th>الكمية</th><th>السعر (ل.س)</th><th>الخصم %</th><th>الإجمالي</th><th></th></tr></thead>
              <tbody id="invoice-items">
                <tr class="inv-item-row">
                  <td><input type="text" class="form-input" style="height:36px;" placeholder="اسم المنتج أو الخدمة" /></td>
                  <td><input type="number" class="form-input" style="height:36px;width:80px;" value="1" min="1" oninput="calcInvoiceTotal()" /></td>
                  <td><input type="number" class="form-input" style="height:36px;width:110px;" placeholder="0" min="0" oninput="calcInvoiceTotal()" /></td>
                  <td><input type="number" class="form-input" style="height:36px;width:80px;" value="0" min="0" max="100" oninput="calcInvoiceTotal()" /></td>
                  <td class="inv-row-total" style="font-weight:700;color:var(--primary);white-space:nowrap;">0 ل.س</td>
                  <td><button type="button" class="btn btn-ghost btn-sm" onclick="removeInvoiceItem(this)">🗑️</button></td>
                </tr>
              </tbody>
            </table>
            <div style="padding:var(--sp-3) var(--sp-4);">
              <button type="button" class="btn btn-ghost btn-sm" onclick="addInvoiceItem()">+ إضافة عنصر</button>
            </div>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--sp-6);">
            <div class="form-group"><label class="form-label">ملاحظات</label><textarea class="form-input form-textarea" id="inv-notes" placeholder="ملاحظات للعميل..."></textarea></div>
            <div style="display:flex;flex-direction:column;gap:var(--sp-2);">
              <div style="display:flex;justify-content:space-between;padding:var(--sp-2) 0;border-bottom:1px solid var(--border);">
                <span>المجموع الفرعي</span><span id="inv-subtotal" style="font-weight:600;">0 ل.س</span>
              </div>
              <div style="display:flex;justify-content:space-between;padding:var(--sp-2) 0;border-bottom:1px solid var(--border);">
                <span>الخصم (POS)</span><span id="inv-discount-amount" style="font-weight:600;color:var(--success);">0 ل.س</span>
              </div>
              <div style="display:flex;justify-content:space-between;padding:var(--sp-3) 0;font-size:var(--text-xl);font-weight:800;color:var(--primary);">
                <span>الإجمالي</span><span id="inv-grand-total">0 ل.س</span>
              </div>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" onclick="closeModal('new-invoice-modal')">إلغاء</button>
          <button class="btn btn-secondary" id="inv-save-draft-btn" onclick="saveInvoice('draft')">💾 حفظ كمسودة</button>
          <button class="btn btn-primary" id="inv-save-primary-btn" onclick="saveInvoice('paid')">✅ إصدار الفاتورة</button>
        </div>
      </div>
    </div>

    <!-- Invoice View Modal -->
    <div class="modal-overlay" id="view-invoice-modal">
      <div class="modal modal-lg">
        <div class="modal-header">
          <h3 class="modal-title" id="view-inv-title">عرض الفاتورة</h3>
          <button class="modal-close" onclick="closeModal('view-invoice-modal')">✕</button>
        </div>
        <div class="modal-body" id="view-inv-body" style="padding:var(--sp-4);"></div>
        <div class="modal-footer">
          <button class="btn btn-secondary" onclick="closeModal('view-invoice-modal')">إغلاق</button>
          <button class="btn btn-primary" id="view-inv-print-btn" onclick="">🖨️ طباعة</button>
        </div>
      </div>
    </div>

    <!-- Invoices Panel Modal (select + print one or many) -->
    <div class="modal-overlay" id="inv-panel-modal">
      <div class="modal modal-xl">
        <div class="modal-header">
          <h3 class="modal-title">الفواتير 🧾</h3>
          <button class="modal-close" onclick="closeModal('inv-panel-modal')">✕</button>
        </div>
        <div class="modal-body">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:var(--sp-3);flex-wrap:wrap;gap:var(--sp-3);">
            <div style="display:flex;gap:var(--sp-2);flex-wrap:wrap;align-items:center;">
              <span style="font-size:var(--text-sm);color:var(--text-muted);">الترتيب:</span>
              <button class="btn btn-primary btn-sm" id="inv-panel-sort-newest" onclick="setInvPanelSort('newest',this)">الأحدث أولاً ↓</button>
              <button class="btn btn-secondary btn-sm" id="inv-panel-sort-oldest" onclick="setInvPanelSort('oldest',this)">الأقدم أولاً ↑</button>
            </div>
            <div class="search-wrap" style="max-width:280px;">
              <input class="search-input" type="text" id="inv-panel-search" placeholder="بحث برقم الفاتورة أو العميل..." oninput="filterInvPanel()" />
              <span class="search-icon">🔍</span>
            </div>
          </div>
          <div class="table-wrap" style="max-height:440px;overflow-y:auto;">
            <table class="table">
              <thead><tr>
                <th style="text-align:center;width:36px;"><input type="checkbox" id="inv-panel-check-all" onchange="toggleAllInvPanel(this)" title="تحديد الكل" /></th>
                <th style="width:40px;">#</th>
                <th>رقم الفاتورة</th>
                <th>العميل</th>
                <th>المبلغ</th>
                <th>الحالة</th>
                <th>التاريخ</th>
                <th>البائع</th>
                <th style="text-align:center;">طباعة</th>
              </tr></thead>
              <tbody id="inv-panel-tbody"></tbody>
            </table>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" onclick="closeModal('inv-panel-modal')">إغلاق</button>
          <button class="btn btn-primary" id="inv-panel-print-btn" onclick="printSelectedInvPanel()" disabled>🖨️ طباعة الفواتير المحددة (0)</button>
        </div>
      </div>
    </div>
    `;
  }

  function invoiceSeller(r) {
    if (r.cashier) return r.cashier;
    return r.source === 'pos' ? 'كاشير' : 'المكتب';
  }
  function generateFullInvoiceRows() {
    const st = {
      paid:      ['badge-success','مدفوعة'],
      pending:   ['badge-warning','معلقة'],
      overdue:   ['badge-danger','متأخرة'],
      draft:     ['badge-gray','مسودة'],
      quotation: ['badge-gray','عرض سعر'],
    };
    return (window._invoices || []).map(r => {
      const seller = invoiceSeller(r);
      const sellerKey = (r.cashierUser || r.cashier || (r.source === 'pos' ? 'pos' : 'office'));
      const isPos = r.source === 'pos';
      const hasSvc  = (r.items || []).some(it => it.type === 'service');
      const invType = hasSvc ? 'service' : 'sales';
      return `
      <tr data-inv-status="${r.status}" data-inv-seller="${String(sellerKey).toLowerCase()}" data-inv-type="${invType}">
        <td><span style="font-weight:700;color:var(--primary);">${r.id}</span>${hasSvc ? ' <span class="badge badge-info" style="font-size:10px;">⚙️ خدمة</span>' : ''}</td>
        <td>${r.client}</td>
        <td style="font-weight:800;">${_fmtInvAmount(r)}</td>
        <td><span class="pill">${_fmtMethodCur(r)}</span></td>
        <td style="color:var(--text-muted);">${_fmtInvRate(r)}</td>
        <td><span class="badge ${st[r.status]?.[0]||'badge-gray'}">${st[r.status]?.[1]||r.status}</span></td>
        <td style="color:var(--text-muted);">${r.date}</td>
        <td><span class="badge ${isPos ? 'badge-success' : 'badge-gray'}" style="font-weight:600;">${isPos ? '🏪 ' : ''}${seller}</span></td>
        <td><div class="table-actions">
          <button class="btn btn-ghost btn-sm" title="عرض" onclick="viewInvoice('${r.id}')">👁</button>
          <button class="btn btn-ghost btn-sm" title="طباعة" onclick="printInvoice('${r.id}')">🖨️</button>
          <button class="btn btn-ghost btn-sm" title="تعديل" onclick="editInvoice('${r.id}')">✏️</button>
        </div></td>
      </tr>
    `;
    }).join('');
  }

  function invoiceEmployeeOptions() {
    const map = {};
    (window._invoices || []).forEach(r => {
      const key = (r.cashierUser || r.cashier || (r.source === 'pos' ? 'pos' : 'office'));
      const label = invoiceSeller(r);
      if (key) map[String(key).toLowerCase()] = label;
    });
    let opts = '<option value="all">كل الموظفين</option>';
    Object.keys(map).forEach(k => { opts += `<option value="${k}">${map[k]}</option>`; });
    return opts;
  }

  async function renderInventory() {
    const _PEM = ['📦','🏷️','⭐','💎','🎁','🛒','💰','🔑','🍔','🍕','🍜','🍱','🥤','☕','🧃','🥛','🍫','🍰','🥗','🍞','🥩','🥦','🍎','🧄','🫒','🧁','🍦','🍩','📱','💻','🖨️','⌨️','📷','📺','🎮','🔋','💡','🔌','🖱️','🎧','👔','👗','👟','🧥','🎒','👜','🧢','💍','⌚','👞','👒','📝','📚','📎','✏️','🖊️','📐','📏','🗂️','💊','🩺','🧴','🧼','💄','🪥','🩹','💅','🛋️','🔧','🔨','⚙️','🪣','🔩','🪚','🪛','⚽','🏀','🎾','🏈','🎲','🧸','🎯','🚗','🛻','🚌','🛵','🌿','🌸','🪴','🧊','🫙','🏺','🎨','🖼️','🧩','📦'];
    const _emojiGrid = (w) => _PEM.map(e => `<button type="button" onclick="pickProductEmoji('${w}','${e}')" style="font-size:1.35rem;background:none;border:none;cursor:pointer;padding:4px;border-radius:6px;line-height:1;transition:.1s;" onmouseover="this.style.background='var(--surface-3,#f1f5f9)'" onmouseout="this.style.background='none'">${e}</button>`).join('');
    return `
    <div class="module-wrap">
      <div class="module-header">
        <div>
          <h1 class="module-title">إدارة المخزون 📦</h1>
          <p class="module-subtitle">المنتجات، الفئات وحركات المخزون</p>
        </div>
        <div style="display:flex;gap:var(--sp-3);">
          <button class="btn btn-primary" onclick="openModal('new-product-modal')">+ منتج جديد</button>
        </div>
      </div>

      <div class="kpi-grid" style="margin-bottom:var(--sp-5);">
        <div class="kpi-card"><div class="kpi-icon kpi-icon-blue">📦</div><div class="kpi-info"><div class="kpi-label">إجمالي المنتجات</div><div class="kpi-value" id="inv-kpi-total">0</div></div></div>
        <div class="kpi-card"><div class="kpi-icon kpi-icon-green">✅</div><div class="kpi-info"><div class="kpi-label">في المخزون</div><div class="kpi-value" id="inv-kpi-instock">0</div></div></div>
        <div class="kpi-card"><div class="kpi-icon kpi-icon-amber">⚠️</div><div class="kpi-info"><div class="kpi-label">مخزون منخفض</div><div class="kpi-value" id="inv-kpi-low">0</div></div></div>
        <div class="kpi-card"><div class="kpi-icon kpi-icon-red">❌</div><div class="kpi-info"><div class="kpi-label">نفد من المخزون</div><div class="kpi-value" id="inv-kpi-out">0</div></div></div>
      </div>

      <!-- Total inventory value (valued at cost), shown in both USD and SYP -->
      <div class="card" style="margin-bottom:var(--sp-5);">
        <div class="card-body" style="display:flex;align-items:center;gap:var(--sp-4);flex-wrap:wrap;">
          <div class="kpi-icon kpi-icon-green" style="flex-shrink:0;">💰</div>
          <div style="flex:1;min-width:240px;">
            <div class="kpi-label">إجمالي قيمة المخزون <span style="color:var(--text-muted);font-weight:400;">(بسعر التكلفة)</span></div>
            <div style="display:flex;gap:var(--sp-6);margin-top:6px;flex-wrap:wrap;">
              <div>
                <div style="font-size:var(--text-xs);color:var(--text-muted);">بالدولار الأمريكي</div>
                <div style="font-size:var(--text-2xl);font-weight:800;color:var(--primary);" id="inv-value-usd">0 $</div>
              </div>
              <div>
                <div style="font-size:var(--text-xs);color:var(--text-muted);">بالليرة السورية</div>
                <div style="font-size:var(--text-2xl);font-weight:800;color:var(--primary);" id="inv-value-syp">0 ل.س</div>
              </div>
              <div>
                <div style="font-size:var(--text-xs);color:var(--text-muted);">بالليرة التركية</div>
                <div style="font-size:var(--text-2xl);font-weight:800;color:var(--primary);" id="inv-value-try">0 ₺</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Total inventory value (valued at selling price), shown in both USD and SYP -->
      <div class="card" style="margin-bottom:var(--sp-5);">
        <div class="card-body" style="display:flex;align-items:center;gap:var(--sp-4);flex-wrap:wrap;">
          <div class="kpi-icon kpi-icon-blue" style="flex-shrink:0;">🏷️</div>
          <div style="flex:1;min-width:240px;">
            <div class="kpi-label">إجمالي قيمة المخزون <span style="color:var(--text-muted);font-weight:400;">(بسعر البيع)</span></div>
            <div style="display:flex;gap:var(--sp-6);margin-top:6px;flex-wrap:wrap;">
              <div>
                <div style="font-size:var(--text-xs);color:var(--text-muted);">بالدولار الأمريكي</div>
                <div style="font-size:var(--text-2xl);font-weight:800;color:var(--success,#16a34a);" id="inv-sale-usd">0 $</div>
              </div>
              <div>
                <div style="font-size:var(--text-xs);color:var(--text-muted);">بالليرة السورية</div>
                <div style="font-size:var(--text-2xl);font-weight:800;color:var(--success,#16a34a);" id="inv-sale-syp">0 ل.س</div>
              </div>
              <div>
                <div style="font-size:var(--text-xs);color:var(--text-muted);">بالليرة التركية</div>
                <div style="font-size:var(--text-2xl);font-weight:800;color:var(--success,#16a34a);" id="inv-sale-try">0 ₺</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="tabs" style="margin-bottom:var(--sp-5);">
        <button class="tab-btn active" onclick="switchInvTab(this,'products')">جميع المنتجات</button>
        <button class="tab-btn" onclick="switchInvTab(this,'movements')">حركات المخزون</button>
        <button class="tab-btn" onclick="switchInvTab(this,'adjust')">تسوية المخزون</button>
        <button class="tab-btn" onclick="switchInvTab(this,'categories')">الفئات</button>
      </div>

      <!-- PANEL: PRODUCTS -->
      <div id="inv-panel-products">
        <div class="module-toolbar">
          <div class="search-wrap" style="flex:1;max-width:340px;">
            <input class="search-input" type="text" id="inv-search" placeholder="البحث باسم المنتج أو رقم الباركود..." oninput="filterInventory()" />
            <span class="search-icon">🔍</span>
          </div>
          <select class="form-select" id="inv-cat-filter" style="max-width:200px;" onchange="filterInventory()">
            <option value="all">كل الفئات</option>
            ${generateCategoryOptions('')}
          </select>
          ${window._sortSelectHTML('inventory-grid', '.product-card')}
          <div style="display:flex;gap:var(--sp-2);border:1px solid var(--border);border-radius:var(--r);padding:3px;">
            <button class="btn btn-primary btn-sm" id="view-grid-btn" onclick="setView('grid')">▦</button>
            <button class="btn btn-ghost btn-sm" id="view-list-btn" onclick="setView('list')">☰</button>
          </div>
        </div>
        <div class="products-grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,200px),1fr));gap:var(--sp-4);" id="inventory-grid">
          ${generateProductCards()}
        </div>
      </div>

      <!-- PANEL: MOVEMENTS -->
      <div id="inv-panel-movements" style="display:none;">
        <div class="module-toolbar" style="justify-content:flex-end;margin-bottom:var(--sp-3);">
          ${window._sortSelectHTML('moves-tbody')}
        </div>
        <div class="table-wrap">
          <table class="table">
            <thead><tr><th>التاريخ</th><th>المنتج</th><th>النوع</th><th>الكمية</th><th>الرصيد بعد</th><th>السبب</th><th>المستخدم</th></tr></thead>
            <tbody id="moves-tbody">${generateMovementRows()}</tbody>
          </table>
        </div>
      </div>

      <!-- PANEL: ADJUST -->
      <div id="inv-panel-adjust" style="display:none;">
        <div class="card" style="max-width:560px;">
          <div class="card-header"><h3 style="font-weight:700;">تسوية المخزون (جرد)</h3></div>
          <div class="card-body" style="display:flex;flex-direction:column;gap:var(--sp-4);">
            <div class="form-group"><label class="form-label">المنتج</label>
              <select class="form-select" id="adj-product" onchange="onAdjustProductChange()">
                <option value="">— اختر منتجاً —</option>
                ${generateProductSelectOptions()}
              </select>
            </div>
            <div class="form-row">
              <div class="form-group"><label class="form-label">الكمية الحالية بالنظام</label><input type="number" class="form-input" id="adj-current" value="0" disabled /></div>
              <div class="form-group"><label class="form-label">الكمية الفعلية (الجرد) <span>*</span></label><input type="number" class="form-input" id="adj-actual" placeholder="0" /></div>
            </div>
            <div class="form-group"><label class="form-label">السبب</label><input type="text" class="form-input" id="adj-reason" placeholder="مثال: تلف، فرق جرد، هدية..." /></div>
            <div><button class="btn btn-primary" onclick="adjustStockSubmit()">حفظ التسوية</button></div>
          </div>
        </div>
      </div>

      <!-- PANEL: CATEGORIES -->
      <div id="inv-panel-categories" style="display:none;">
        <div class="card" style="max-width:640px;">
          <div class="card-header"><h3 style="font-weight:700;">الفئات</h3></div>
          <div class="card-body">
            <div style="display:flex;gap:var(--sp-2);margin-bottom:var(--sp-4);">
              <input type="text" class="form-input" id="cat-name" placeholder="اسم الفئة الجديدة..." style="flex:1;" />
              <button class="btn btn-primary" onclick="saveCategory()">+ إضافة</button>
            </div>
            <div id="cat-list">${generateCategoryList()}</div>
          </div>
        </div>
      </div>

    </div>

    <!-- New Product Modal -->
    <div class="modal-overlay" id="new-product-modal">
      <div class="modal modal-lg">
        <div class="modal-header">
          <h3 class="modal-title">إضافة منتج جديد</h3>
          <button class="modal-close" onclick="closeModal('new-product-modal')">✕</button>
        </div>
        <div class="modal-body">
          <div class="form-row">
            <div class="form-group"><label class="form-label">اسم المنتج <span>*</span></label><input type="text" class="form-input" id="prod-name" placeholder="اسم المنتج" /></div>
            <div class="form-group"><label class="form-label">رقم الباركود</label><input type="number" class="form-input" id="prod-sku" placeholder="مثال: 1234567890" /></div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label" style="display:flex;align-items:center;justify-content:space-between;gap:var(--sp-2);">
                <span>الفئة</span>
                <button type="button" class="btn btn-ghost btn-sm" onclick="goToAddCategory()" title="إضافة فئة جديدة" style="padding:2px 8px;font-size:var(--text-xs);font-weight:700;">+ فئة جديدة</button>
              </label>
              <select class="form-select" id="prod-cat">${generateCategoryOptions('عام')}</select>
            </div>
            <div class="form-group"><label class="form-label">وحدة القياس</label>
              <select class="form-select" id="prod-unit">
                <option>قطعة</option><option>كيلو</option><option>لتر</option>
                <option>علبة</option><option>رزمة</option><option>متر</option>
              </select>
            </div>
          </div>
          <div class="form-group"><label class="form-label">عملة المنتج (تُطبّق على سعر البيع والتكلفة)</label>
            <select class="form-select" id="prod-currency">
              <option value="SYP" selected>ليرة سورية (ل.س)</option>
              <option value="USD">دولار أمريكي ($)</option>
              <option value="TRY">ليرة تركية (₺)</option>
            </select>
            <div style="font-size:var(--text-xs);color:var(--text-muted);margin-top:4px;">إذا اخترت الدولار، يُحوَّل السعر تلقائياً للعملة الأساسية في الكاشير والتقارير حسب سعر الصرف.</div>
          </div>
          <div class="form-row">
            <div class="form-group"><label class="form-label">سعر البيع <span>*</span></label><input type="number" class="form-input" id="prod-price" placeholder="0" /></div>
            <div class="form-group"><label class="form-label">سعر التكلفة</label><input type="number" class="form-input" id="prod-cost" placeholder="0" /></div>
          </div>
          <div class="form-row">
            <div class="form-group"><label class="form-label">الكمية الأولية</label><input type="number" class="form-input" id="prod-stock" value="0" /></div>
            <div class="form-group"><label class="form-label">حد المخزون الأدنى</label><input type="number" class="form-input" id="prod-min-stock" value="5" /></div>
          </div>
          <div class="form-row">
            <div class="form-group"><label class="form-label">المورد (من جلب البضاعة)</label>
              <select class="form-select" id="prod-supplier">${generateSupplierOptions()}</select>
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">أيقونة المنتج</label>
            <div style="position:relative;">
              <div style="display:flex;align-items:center;gap:var(--sp-3);">
                <div id="prod-emoji-display" onclick="toggleEmojiPicker('new',event)" title="اضغط لاختيار رمز تعبيري"
                  style="font-size:2rem;width:52px;height:52px;display:flex;align-items:center;justify-content:center;border:2px solid var(--border);border-radius:var(--r);cursor:pointer;background:var(--surface-2);user-select:none;">📦</div>
                <input type="hidden" id="prod-emoji" value="📦" />
                <span style="font-size:var(--text-xs);color:var(--text-muted);">اضغط على الأيقونة لاختيار رمز تعبيري للمنتج في الكاشير</span>
              </div>
              <div id="emoji-picker-new" onclick="event.stopPropagation()" style="display:none;position:absolute;top:58px;right:0;z-index:300;background:var(--surface);border:1px solid var(--border);border-radius:var(--r);padding:var(--sp-3);box-shadow:0 8px 32px rgba(0,0,0,.15);width:290px;">
                <div style="display:grid;grid-template-columns:repeat(9,1fr);gap:2px;max-height:200px;overflow-y:auto;">
                  ${_emojiGrid('new')}
                </div>
              </div>
            </div>
          </div>
          <div class="form-group"><label class="form-label">وصف المنتج</label><textarea class="form-input form-textarea" id="prod-desc" placeholder="وصف المنتج..."></textarea></div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" onclick="closeModal('new-product-modal')">إلغاء</button>
          <button class="btn btn-primary" onclick="saveProduct()">حفظ المنتج</button>
        </div>
      </div>
    </div>

    <!-- Edit Product Modal -->
    <div class="modal-overlay" id="edit-product-modal">
      <div class="modal modal-lg">
        <div class="modal-header">
          <h3 class="modal-title">تعديل المنتج</h3>
          <button class="modal-close" onclick="closeModal('edit-product-modal')">✕</button>
        </div>
        <div class="modal-body">
          <input type="hidden" id="edit-prod-id" />
          <div class="form-row">
            <div class="form-group"><label class="form-label">اسم المنتج <span>*</span></label><input type="text" class="form-input" id="edit-prod-name" /></div>
            <div class="form-group"><label class="form-label">رقم الباركود</label><input type="number" class="form-input" id="edit-prod-sku" /></div>
          </div>
          <div class="form-row">
            <div class="form-group"><label class="form-label">الفئة</label><select class="form-select" id="edit-prod-cat"></select></div>
            <div class="form-group"><label class="form-label">عملة المنتج</label>
              <select class="form-select" id="edit-prod-currency">
                <option value="SYP">ليرة سورية (ل.س)</option>
                <option value="USD">دولار أمريكي ($)</option>
                <option value="TRY">ليرة تركية (₺)</option>
              </select>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group"><label class="form-label">سعر البيع <span>*</span></label><input type="number" class="form-input" id="edit-prod-price" /></div>
            <div class="form-group"><label class="form-label">سعر التكلفة</label><input type="number" class="form-input" id="edit-prod-cost" /></div>
          </div>
          <div class="form-row">
            <div class="form-group"><label class="form-label">حد المخزون الأدنى</label><input type="number" class="form-input" id="edit-prod-min" /></div>
            <div class="form-group"><label class="form-label">المورد</label><select class="form-select" id="edit-prod-supplier"></select></div>
          </div>
          <div class="form-group" style="margin-top:var(--sp-3);">
            <label class="form-label">أيقونة المنتج</label>
            <div style="position:relative;">
              <div style="display:flex;align-items:center;gap:var(--sp-3);">
                <div id="edit-prod-emoji-display" onclick="toggleEmojiPicker('edit',event)" title="اضغط لاختيار رمز تعبيري"
                  style="font-size:2rem;width:52px;height:52px;display:flex;align-items:center;justify-content:center;border:2px solid var(--border);border-radius:var(--r);cursor:pointer;background:var(--surface-2);user-select:none;">📦</div>
                <input type="hidden" id="edit-prod-emoji" value="📦" />
                <span style="font-size:var(--text-xs);color:var(--text-muted);">اضغط على الأيقونة لاختيار رمز تعبيري</span>
              </div>
              <div id="emoji-picker-edit" onclick="event.stopPropagation()" style="display:none;position:absolute;top:58px;right:0;z-index:300;background:var(--surface);border:1px solid var(--border);border-radius:var(--r);padding:var(--sp-3);box-shadow:0 8px 32px rgba(0,0,0,.15);width:290px;">
                <div style="display:grid;grid-template-columns:repeat(9,1fr);gap:2px;max-height:200px;overflow-y:auto;">
                  ${_emojiGrid('edit')}
                </div>
              </div>
            </div>
          </div>
          <div style="font-size:var(--text-xs);color:var(--text-muted);">لتعديل الكمية استخدم زر «+ كمية» أو تبويب «تسوية المخزون» حتى تُسجَّل الحركة.</div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" onclick="closeModal('edit-product-modal')">إلغاء</button>
          <button class="btn btn-primary" onclick="saveProductEdit()">حفظ التعديلات</button>
        </div>
      </div>
    </div>

    <!-- Add Quantity Modal -->
    <div class="modal-overlay" id="add-qty-modal">
      <div class="modal">
        <div class="modal-header">
          <h3 class="modal-title">حركة مخزون</h3>
          <button class="modal-close" onclick="closeModal('add-qty-modal')">✕</button>
        </div>
        <div class="modal-body">
          <input type="hidden" id="qty-prod-id" />
          <div style="background:var(--surface-2);border-radius:var(--r);padding:var(--sp-3);margin-bottom:var(--sp-3);">
            <div style="font-weight:700;" id="qty-prod-name">—</div>
            <div style="font-size:var(--text-sm);color:var(--text-muted);">الكمية الحالية: <span id="qty-current" style="font-weight:700;">0</span> وحدة</div>
          </div>
          <div class="form-row">
            <div class="form-group"><label class="form-label">نوع الحركة</label>
              <select class="form-select" id="qty-type">
                <option value="in">إضافة (استلام بضاعة) +</option>
                <option value="out">صرف / خصم −</option>
              </select>
            </div>
            <div class="form-group"><label class="form-label">الكمية <span>*</span></label><input type="number" class="form-input" id="qty-amount" placeholder="0" min="1" /></div>
          </div>
          <div class="form-group"><label class="form-label">السبب / ملاحظة</label><input type="text" class="form-input" id="qty-reason" placeholder="مثال: استلام من مورد، تلف..." /></div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" onclick="closeModal('add-qty-modal')">إلغاء</button>
          <button class="btn btn-primary" onclick="confirmAddQty()">حفظ الحركة</button>
        </div>
      </div>
    </div>
    `;
  }

  function _prodMin(p) {
    const g = window._appSettings && window._appSettings.minStockAlert;
    return p.minStock != null ? Number(p.minStock) : (g != null ? Number(g) : 5);
  }

  function generateProductCards() {
    const list = (window._products || []);
    if (!list.length) {
      return `
      <div class="empty-state" style="grid-column:1/-1;background:var(--surface);border-radius:var(--r-xl);border:1px dashed var(--border);padding:var(--sp-16);">
        <div class="empty-icon">📦</div>
        <div class="empty-title">لا توجد منتجات بعد</div>
        <div class="empty-desc">ابدأ بإضافة أول منتج لمخزونك</div>
        <button class="btn btn-primary" style="margin-top:var(--sp-4);" onclick="openModal('new-product-modal')">+ إضافة منتج</button>
      </div>
    `;
    }
    return list.map((p, i) => generateProductCard(p, i, list.length)).join('');
  }

  function generateProductCard(p, i, total) {
    const supLine = p.supplierName
      ? `<div class="product-sku" style="margin-top:var(--sp-1);color:var(--text-muted);">🏭 ${p.supplierName}</div>` : '';
    const pcur = p.currency || 'SYP';
    const base = window.Currency ? window.Currency.base : 'SYP';
    const stock = Number(p.stock) || 0;
    const min   = _prodMin(p);
    const sellPrice = Number(p.price) || 0;
    const costPrice = Number(p.cost) || 0;
    const profit    = sellPrice - costPrice;
    const margin    = sellPrice > 0 ? Math.round((profit / sellPrice) * 100) : 0;
    const _fmtDirect = (v, cur) => {
      if (!window.Currency || cur === base) return _fmt(v, base);
      const digits = typeof window.Currency.digits === 'function' ? window.Currency.digits(cur) : (cur === 'USD' ? 2 : 0);
      const sym    = typeof window.Currency.symbol === 'function' ? window.Currency.symbol(cur) : cur;
      return (Number(v)||0).toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits }) + ' ' + sym;
    };
    const profitColor = profit > 0 ? 'var(--success)' : (profit < 0 ? 'var(--danger)' : 'var(--text-muted)');
    const profitLine = `<div style="display:flex;align-items:center;justify-content:space-between;gap:var(--sp-2);margin-top:var(--sp-1);font-size:var(--text-xs);">
            <span style="color:var(--text-muted);">الربح / وحدة</span>
            <span style="font-weight:700;color:${profitColor};">${_fmtDirect(profit, pcur)}${sellPrice > 0 ? ` <span style="color:var(--text-muted);font-weight:500;">(${margin}%)</span>` : ''}</span>
          </div>`;
    const isActive = p.active !== false;
    let color = 'var(--success)', label = 'متوفر';
    if (stock <= 0)        { color = 'var(--danger)';  label = 'نفد'; }
    else if (stock <= min) { color = 'var(--warning)'; label = 'منخفض'; }
    if (!isActive)         { color = 'var(--text-muted)'; label = 'متوقف'; }
    const pct = Math.max(6, Math.min(100, Math.round((stock / (Math.max(min,1) * 3)) * 100)));
    const cat = p.cat || p.category || '';
    return `
      <div class="product-card card-hover" data-prod-id="${p.id}" data-prod-name="${(p.name||'').toLowerCase()}" data-prod-sku="${(p.sku||'').toLowerCase()}" data-prod-cat="${cat}" data-ts="${p.createdAt ? window._dateToTs(p.createdAt) : ((total||0) - (i||0))}" style="${isActive?'':'opacity:.6;'}">
        <div class="product-card-img" style="position:relative;">
          <span style="font-size:3rem;">${p.emoji||'📦'}</span>
          <span class="badge" style="position:absolute;top:8px;left:8px;background:${color};color:#fff;">${label}</span>
        </div>
        <div class="product-card-body">
          <div class="product-name">${p.name}</div>
          <div class="product-sku" style="margin-bottom:var(--sp-2);">${p.sku ? '🔢 '+p.sku : ''}${cat ? (p.sku ? ' · ' : '')+cat : ''}</div>
          <div class="product-price">${_fmtDirect(sellPrice, pcur)}</div>
          ${profitLine}
          ${supLine}
          <div class="stock-bar" style="margin-top:var(--sp-3);">
            <div class="stock-label"><span>المخزون</span><span style="font-weight:700;color:${color};">${stock} وحدة</span></div>
            <div class="progress"><div class="progress-fill" style="width:${pct}%;background:${color};"></div></div>
          </div>
          <div style="display:flex;gap:var(--sp-2);margin-top:var(--sp-3);">
            <button class="btn btn-secondary btn-sm flex-1" onclick="editProduct('${p.id}')">✏️ تعديل</button>
            <button class="btn btn-primary btn-sm flex-1" onclick="openAddQty('${p.id}')">+ كمية</button>
            <button class="btn ${isActive?'btn-secondary':'btn-primary'} btn-sm" title="${isActive?'توقيف المنتج عن الكاشير':'تفعيل المنتج في الكاشير'}" onclick="toggleProductActive('${p.id}')">${isActive?'⏸️':'▶️'}</button>
            <button class="btn btn-ghost btn-sm" onclick="deleteProduct('${p.id}')" title="حذف">🗑️</button>
          </div>
        </div>
      </div>
    `;
  }

  function generateMovementRows() {
    const list = window._stockMoves || [];
    if (!list.length) {
      return `<tr><td colspan="7"><div class="empty-state" style="padding:var(--sp-10);"><div class="empty-icon">🔄</div><div class="empty-title">لا توجد حركات مخزون بعد</div><div class="empty-desc">ستظهر هنا كل عمليات الإضافة والبيع والتسوية</div></div></td></tr>`;
    }
    const typeMap = { in:['badge-success','إضافة'], out:['badge-danger','صرف'], sale:['badge-gray','بيع'], adjust:['badge-warning','تسوية'] };
    return list.map(m => {
      const meta = typeMap[m.type] || ['badge-gray', m.type];
      const sign = m.qty > 0 ? '+' : '';
      const qtyColor = m.qty > 0 ? 'var(--success)' : 'var(--danger)';
      return `<tr data-ts="${window._dateToTs(m.timestamp)}">
        <td>${_fmtDateTime(m.timestamp)}</td>
        <td style="font-weight:600;">${m.productName || '—'}</td>
        <td><span class="badge ${meta[0]}">${meta[1]}</span></td>
        <td style="font-weight:700;color:${qtyColor};">${sign}${m.qty}</td>
        <td>${m.balanceAfter != null ? m.balanceAfter : '—'}</td>
        <td style="color:var(--text-muted);">${m.reason || '—'}</td>
        <td>${m.user || '—'}</td>
      </tr>`;
    }).join('');
  }

  function generateCategoryList() {
    const list = window._categories || [];
    if (!list.length) {
      return `<div class="empty-state" style="padding:var(--sp-8);"><div class="empty-icon">🏷️</div><div class="empty-title">لا توجد فئات مخصصة</div><div class="empty-desc">الفئات الافتراضية متاحة دائماً. أضف فئة جديدة لتظهر هنا.</div></div>`;
    }
    return `<div class="table-wrap"><table class="table"><thead><tr><th>الفئة</th><th>عدد المنتجات</th><th>إجراء</th></tr></thead><tbody>` +
      list.map(c => {
        const count = (window._products || []).filter(p => (p.cat || p.category) === c.name).length;
        return `<tr><td style="font-weight:600;">🏷️ ${c.name}</td><td>${count}</td><td><button class="btn btn-ghost btn-sm" onclick="deleteCategory('${c.id}')">🗑️</button></td></tr>`;
      }).join('') + `</tbody></table></div>`;
  }

  function generateCategoryOptions(selected) {
    const defaults = ['عام','مأكولات','مشروبات','قرطاسية','إلكترونيات','ملابس'];
    const custom = (window._categories || []).map(c => c.name);
    const all = Array.from(new Set([...defaults, ...custom]));
    return all.map(n => `<option ${n === selected ? 'selected' : ''}>${n}</option>`).join('');
  }

  function generateProductSelectOptions() {
    return (window._products || []).map(p => `<option value="${p.id}">${p.name}${p.sku ? ' ('+p.sku+')' : ''}</option>`).join('');
  }

  function _fmt(amount, cur) {
    return window.Currency ? window.Currency.formatCompact(amount, cur || 'SYP')
                           : (Number(amount)||0).toLocaleString('en-US') + ' ل.س';
  }
  function _sumBase(list) {
    const base = window.Currency ? window.Currency.base : 'SYP';
    return (list || []).reduce((s, it) => {
      const v = window.Currency ? window.Currency.convert(it.amount || 0, it.currency || 'SYP', base)
                                : (Number(it.amount) || 0);
      return s + v;
    }, 0);
  }
  // ── Cost of Goods Sold (تكلفة البضاعة المباعة) ──
  function _findProduct(it) {
    const prods = window._products || [];
    return prods.find(p => p.id === (it.productId || it.id))
        || (it.sku ? prods.find(p => p.sku && p.sku === it.sku) : null)
        || prods.find(p => p.name === it.name)
        || null;
  }
  function _invoiceCOGS(inv) {
    const base   = window.Currency ? window.Currency.base : 'SYP';
    const invCur = inv.currency || 'SYP';
    return (inv.items || []).reduce((s, it) => {
      const qty = Number(it.qty) || 0;
      let unitCost, costCur;
      if (it.cost != null) {
        unitCost = Number(it.cost) || 0; costCur = it.costCurrency || invCur;
      } else {
        const p  = _findProduct(it);
        unitCost = p ? (Number(p.cost) || 0) : 0;
        costCur  = p ? (p.currency || 'SYP') : invCur;
      }
      const line = qty * unitCost;
      return s + (window.Currency ? window.Currency.convert(line, costCur, base) : line);
    }, 0);
  }
  function _cogsBase() {
    return (window._invoices || [])
      .filter(inv => inv.status !== 'draft' && inv.status !== 'quotation')
      .reduce((s, inv) => s + _invoiceCOGS(inv), 0);
  }
  function _serviceRevenueBase(invList) {
    const base = window.Currency ? window.Currency.base : 'SYP';
    return (invList || []).reduce((s, inv) => {
      const invCur = inv.currency || 'SYP';
      const svcAmt = (inv.items || [])
        .filter(it => it.type === 'service')
        .reduce((ss, it) => ss + (Number(it.total) || (Number(it.price||0) * Number(it.qty||1))), 0);
      return s + (window.Currency ? window.Currency.convert(svcAmt, invCur, base) : svcAmt);
    }, 0);
  }
  // ── Dashboard period filter (المبيعات + صافي الربح) ──
  function _dashDateOf(obj) {
    if (!obj) return null;
    if (obj.createdAt != null) {
      if (typeof obj.createdAt === 'number') return new Date(obj.createdAt);
      const d = new Date(obj.createdAt); if (!isNaN(d)) return d;
    }
    if (obj.timestamp) { const d = new Date(obj.timestamp); if (!isNaN(d)) return d; }
    if (obj.date) { const d = new Date(String(obj.date).replace(/\//g,'-')); if (!isNaN(d)) return d; }
    return null;
  }
  function _dashPeriodRange(period) {
    const now = new Date();
    const sod = d => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
    const eod = d => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
    const weekStart = ref => { const s = new Date(ref); s.setDate(ref.getDate() - ((ref.getDay() + 1) % 7)); return sod(s); };
    let start = null, end = null;
    switch (period) {
      case 'today':     start = sod(now); end = eod(now); break;
      case 'yesterday': { const y = new Date(now); y.setDate(now.getDate() - 1); start = sod(y); end = eod(y); break; }
      case 'week':      start = weekStart(now); end = eod(now); break;
      case 'lastweek':  { const ws = weekStart(now); const ls = new Date(ws); ls.setDate(ws.getDate() - 7); const le = new Date(ws); le.setDate(ws.getDate() - 1); start = sod(ls); end = eod(le); break; }
      case 'month':     start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0); end = eod(now); break;
      case 'lastmonth': start = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0); end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999); break;
      case 'lastyear':  start = new Date(now.getFullYear() - 1, 0, 1, 0, 0, 0, 0); end = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59, 999); break;
      case 'all':       default: start = null; end = null; break;
    }
    return { start, end };
  }
  // Compute المبيعات + صافي الربح for a {start,end} range and update the KPI cards.
  function _renderDashKpis(start, end) {
    const inRange = (obj) => {
      if (!start || !end) return true;
      const d = _dashDateOf(obj);
      return d ? (d >= start && d <= end) : false;
    };
    const realInvs = (window._invoices || []).filter(inv => inv && inv.status !== 'draft' && inv.status !== 'quotation');
    const periodInvs = realInvs.filter(inRange);
    const periodExp  = (window._expenses || []).filter(inRange);
    const totalRev = _sumBase(periodInvs);
    const svcRev   = _serviceRevenueBase(periodInvs);
    const sales    = totalRev - svcRev;               // مبيعات المنتجات فقط
    const cogs     = periodInvs.reduce((s, inv) => s + _invoiceCOGS(inv), 0);
    const expenses = _sumBase(periodExp);
    const profit   = totalRev - cogs - expenses;      // الربح يشمل إيرادات الخدمات − تكلفتها
    const base     = window.Currency ? window.Currency.base : 'SYP';

    const salesEl = document.getElementById('dash-kpi-sales');
    if (salesEl) salesEl.textContent = _fmt(sales, base);
    const salesSub = document.getElementById('dash-kpi-sales-sub');
    if (salesSub) salesSub.textContent = periodInvs.length ? periodInvs.length + ' فاتورة' : 'لا مبيعات في هذه الفترة';
    const profitEl = document.getElementById('dash-kpi-profit');
    if (profitEl) {
      profitEl.textContent = _fmt(profit, base);
      profitEl.style.color = profit > 0 ? 'var(--success)' : (profit < 0 ? 'var(--danger)' : '');
    }
  }
  window.setDashPeriod = function(period, btn) {
    const { start, end } = _dashPeriodRange(period);
    _renderDashKpis(start, end);
    const fEl = document.getElementById('dash-date-from'); if (fEl) fEl.value = '';
    const tEl = document.getElementById('dash-date-to');   if (tEl) tEl.value = '';
    document.querySelectorAll('.dash-period-btn').forEach(b => {
      const on = b === btn || (!btn && b.getAttribute('data-period') === period);
      b.classList.toggle('btn-primary', on);
      b.classList.toggle('btn-secondary', !on);
    });
  };
  // Apply a custom "من تاريخ إلى تاريخ" range from the two date inputs.
  window.applyDashCustomRange = function() {
    const fromV = document.getElementById('dash-date-from')?.value;
    const toV   = document.getElementById('dash-date-to')?.value;
    if (!fromV || !toV) { showToast('warning', 'اختر تاريخ البداية والنهاية'); return; }
    let start = new Date(fromV + 'T00:00:00');
    let end   = new Date(toV   + 'T23:59:59.999');
    if (isNaN(start) || isNaN(end)) { showToast('warning', 'تاريخ غير صالح'); return; }
    if (start > end) { const tmp = start; start = end; end = tmp; }
    _renderDashKpis(start, end);
    document.querySelectorAll('.dash-period-btn').forEach(b => {
      b.classList.remove('btn-primary');
      b.classList.add('btn-secondary');
    });
  };

  function _curOptions(sel) {
    const cur = sel || (window.Currency ? window.Currency.base : 'SYP');
    return `<option value="SYP" ${cur==='SYP'?'selected':''}>ليرة سورية (ل.س)</option>
            <option value="USD" ${cur==='USD'?'selected':''}>دولار ($)</option>
            <option value="TRY" ${cur==='TRY'?'selected':''}>ليرة تركية (₺)</option>`;
  }

  // CASH BOX (الصندوق)
  async function renderCashbox() {
    const salesBase    = _sumBase(window._invoices || []);
    const deposits     = _sumBase((window._cashbox||[]).filter(t => t.type === 'deposit'));
    const withdrawals  = _sumBase((window._cashbox||[]).filter(t => t.type === 'withdraw'));
    const expensesBase = _sumBase(window._expenses || []);
    const debtUnpaid   = _creditDebtUnpaid();
    const cogs         = _cogsBase();                  // تكلفة البضاعة المباعة
    const balance      = salesBase + deposits - withdrawals - expensesBase - debtUnpaid;
    const profit       = salesBase - cogs - expensesBase - debtUnpaid;
    const base         = window.Currency ? window.Currency.base : 'SYP';
    return `
    <div class="module-wrap">
      <div class="module-header">
        <div>
          <h1 class="module-title">الصندوق 🧰</h1>
          <p class="module-subtitle">النقد في الدرج/الخزنة — إيداع، سحب وسجل الحركات</p>
        </div>
        <div style="display:flex;gap:var(--sp-3);">
          <button class="btn btn-secondary" onclick="openCashboxModal('deposit')">⬇️ إيداع</button>
          <button class="btn btn-primary" onclick="openCashboxModal('withdraw')">⬆️ سحب</button>
        </div>
      </div>

      <div class="kpi-grid" style="margin-bottom:var(--sp-5);">
        <div class="kpi-card"><div class="kpi-icon kpi-icon-amber">🧰</div><div class="kpi-info"><div class="kpi-label">رصيد الصندوق الحالي</div><div class="kpi-value">${_fmt(balance, base)}</div></div></div>
        <div class="kpi-card"><div class="kpi-icon kpi-icon-green">💰</div><div class="kpi-info"><div class="kpi-label">إجمالي المبيعات</div><div class="kpi-value">${_fmt(salesBase, base)}</div></div></div>
        <div class="kpi-card"><div class="kpi-icon kpi-icon-blue">📈</div><div class="kpi-info"><div class="kpi-label">صافي الربح (مبيعات − تكلفة − مصاريف)</div><div class="kpi-value">${_fmt(profit, base)}</div></div></div>
        <div class="kpi-card"><div class="kpi-icon kpi-icon-red">↕️</div><div class="kpi-info"><div class="kpi-label">إيداعات / سحوبات</div><div class="kpi-value" style="font-size:var(--text-lg);">${_fmt(deposits, base)} / ${_fmt(withdrawals, base)}</div></div></div>
      </div>

      <div class="chart-box">
        <div class="chart-header" style="display:flex;justify-content:space-between;align-items:center;"><h3 class="chart-title">سجل حركات الصندوق</h3>${window._sortSelectHTML('cashbox-tbody')}</div>
        <div style="overflow-x:auto;">
          <table class="table">
            <thead><tr><th>النوع</th><th>المبلغ</th><th>المسؤول</th><th>ملاحظة</th><th>التاريخ</th><th></th></tr></thead>
            <tbody id="cashbox-tbody">${generateCashboxRows()}</tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Cashbox Modal -->
    <div class="modal-overlay" id="cashbox-modal">
      <div class="modal" style="max-width:460px;">
        <div class="modal-header">
          <h3 class="modal-title" id="cashbox-modal-title">حركة صندوق</h3>
          <button class="modal-close" onclick="closeModal('cashbox-modal')">✕</button>
        </div>
        <div class="modal-body">
          <input type="hidden" id="cashbox-type" value="deposit" />
          <div class="form-row">
            <div class="form-group"><label class="form-label">المبلغ <span>*</span></label>
              <input type="number" class="form-input" id="cashbox-amount" min="0" placeholder="0" /></div>
            <div class="form-group"><label class="form-label">العملة</label>
              <select class="form-select" id="cashbox-currency">${_curOptions()}</select></div>
          </div>
          <div class="form-group"><label class="form-label">المسؤول عن العملية <span>*</span></label>
            <input type="text" class="form-input" id="cashbox-person" placeholder="اسم المسؤول" /></div>
          <div class="form-group"><label class="form-label">ملاحظة</label>
            <input type="text" class="form-input" id="cashbox-note" placeholder="سبب الحركة (اختياري)" /></div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" onclick="closeModal('cashbox-modal')">إلغاء</button>
          <button class="btn btn-primary" onclick="saveCashboxTxn()">حفظ الحركة</button>
        </div>
      </div>
    </div>
    `;
  }

  function generateCashboxRows() {
    const list = (window._cashbox || []);
    if (!list.length) {
      return `<tr><td colspan="6"><div class="empty-state" style="padding:var(--sp-8) var(--sp-4);text-align:center;color:var(--text-muted);">
        <div class="empty-icon" style="font-size:32px;">🧰</div>
        <div class="empty-title">لا توجد حركات بعد</div></div></td></tr>`;
    }
    return list.map(t => `
      <tr data-ts="${window._dateToTs(t.date || t.createdAt)}">
        <td><span class="badge ${t.type==='deposit'?'badge-success':'badge-danger'}">${t.type==='deposit'?'إيداع ⬇️':'سحب ⬆️'}</span></td>
        <td style="font-weight:700;">${_fmt(t.amount, t.currency)}</td>
        <td>${t.person || '—'}</td>
        <td style="color:var(--text-muted);">${t.note || '—'}</td>
        <td style="color:var(--text-muted);">${t.date || ''}</td>
        <td><button class="btn btn-ghost btn-sm" onclick="deleteCashboxTxn('${t.id}')">🗑️</button></td>
      </tr>`).join('');
  }

  window.openCashboxModal = function(type) {
    document.getElementById('cashbox-type').value = type;
    document.getElementById('cashbox-modal-title').textContent = (type === 'deposit') ? 'إيداع في الصندوق' : 'سحب من الصندوق';
    ['cashbox-amount','cashbox-person','cashbox-note'].forEach(id => { const e=document.getElementById(id); if(e) e.value=''; });
    openModal('cashbox-modal');
  };

  window.saveCashboxTxn = function() {
    const type   = document.getElementById('cashbox-type')?.value || 'deposit';
    const amount = parseFloat(document.getElementById('cashbox-amount')?.value);
    const currency = document.getElementById('cashbox-currency')?.value || 'SYP';
    const person = document.getElementById('cashbox-person')?.value.trim();
    const note   = document.getElementById('cashbox-note')?.value.trim();
    if (!amount || amount <= 0) { showToast('warning','أدخل مبلغاً صحيحاً'); return; }
    if (!person) { showToast('warning','أدخل اسم المسؤول عن العملية'); return; }
    const txn = { id:'CB-'+Date.now().toString().slice(-6), type, amount, currency, person, note,
                  date:new Date().toLocaleDateString('en-CA').replace(/-/g,'/') };
    window._cashbox.unshift(txn);
    window._saveData();
    closeModal('cashbox-modal');
    showToast('success', (type==='deposit'?'تم الإيداع':'تم السحب')+' بنجاح ✓');
    navigate('cashbox');
  };

  window.deleteCashboxTxn = function(id) {
    window._cashbox = (window._cashbox||[]).filter(t => t.id !== id);
    window._saveData();
    navigate('cashbox');
  };

  // EXPENSES (المصروف)
  async function renderExpenses() {
    const _expList = (window._expenses || []);
    const totalBase = _sumBase(_expList);
    const base = window.Currency ? window.Currency.base : 'SYP';
    return `
    <div class="module-wrap">
      <div class="module-header">
        <div>
          <h1 class="module-title">المصروف 🧾</h1>
          <p class="module-subtitle">تسجيل المصاريف (إيجار، أكل، رواتب…) مع سجل كامل</p>
        </div>
        <button class="btn btn-primary" onclick="openModal('expense-modal')">+ إضافة مصروف</button>
      </div>

      <div class="kpi-grid" style="margin-bottom:var(--sp-5);">
        <div class="kpi-card"><div class="kpi-icon kpi-icon-red">🧾</div><div class="kpi-info"><div class="kpi-label">إجمالي المصاريف</div><div class="kpi-value">${_fmt(totalBase, base)}</div></div></div>
        <div class="kpi-card"><div class="kpi-icon kpi-icon-blue">📋</div><div class="kpi-info"><div class="kpi-label">عدد المصاريف</div><div class="kpi-value">${_expList.length}</div></div></div>
      </div>

      <div class="chart-box">
        <div class="chart-header" style="display:flex;justify-content:space-between;align-items:center;"><h3 class="chart-title">سجل المصاريف</h3>${window._sortSelectHTML('expenses-tbody')}</div>
        <div style="overflow-x:auto;">
          <table class="table">
            <thead><tr><th>النوع</th><th>المبلغ</th><th>ملاحظة</th><th>التاريخ</th><th></th></tr></thead>
            <tbody id="expenses-tbody">${generateExpenseRows()}</tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Expense Modal -->
    <div class="modal-overlay" id="expense-modal">
      <div class="modal" style="max-width:460px;">
        <div class="modal-header">
          <h3 class="modal-title">إضافة مصروف</h3>
          <button class="modal-close" onclick="closeModal('expense-modal')">✕</button>
        </div>
        <div class="modal-body">
          <div class="form-row">
            <div class="form-group"><label class="form-label">نوع المصروف <span>*</span></label>
              <select class="form-select" id="exp-category" onchange="toggleExpenseEmployee()">
                <option value="إيجار">إيجار</option>
                <option value="أكل">أكل</option>
                <option value="راتب">راتب</option>
                <option value="كهرباء">كهرباء وماء</option>
                <option value="نقل">نقل ومواصلات</option>
                <option value="أخرى">أخرى</option>
              </select></div>
            <div class="form-group"><label class="form-label">العملة</label>
              <select class="form-select" id="exp-currency">${_curOptions()}</select></div>
          </div>
          <div class="form-group" id="exp-employee-group" style="display:none;">
            <label class="form-label">الموظف</label>
            <select class="form-select" id="exp-employee" onchange="onExpEmployeeChange()">
              <option value="">— اختر الموظف —</option>
            </select>
          </div>
          <div class="form-group"><label class="form-label">المبلغ <span>*</span></label>
            <input type="number" class="form-input" id="exp-amount" min="0" placeholder="0" /></div>
          <div class="form-group"><label class="form-label">ملاحظة</label>
            <input type="text" class="form-input" id="exp-note" placeholder="تفاصيل المصروف (اختياري)" /></div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" onclick="closeModal('expense-modal')">إلغاء</button>
          <button class="btn btn-primary" onclick="saveExpense()">حفظ المصروف</button>
        </div>
      </div>
    </div>
    `;
  }

  function generateExpenseRows() {
    const list = (window._expenses || []);
    if (!list.length) {
      return `<tr><td colspan="5"><div class="empty-state" style="padding:var(--sp-8) var(--sp-4);text-align:center;color:var(--text-muted);">
        <div class="empty-icon" style="font-size:32px;">🧾</div>
        <div class="empty-title">لا توجد مصاريف بعد</div></div></td></tr>`;
    }
    return list.map(e => `
      <tr data-ts="${window._dateToTs(e.date || e.createdAt)}">
        <td><span class="pill">${e.category || 'أخرى'}</span></td>
        <td style="font-weight:700;color:var(--danger);">${_fmt(e.amount, e.currency)}</td>
        <td style="color:var(--text-muted);">${e.note || '—'}</td>
        <td style="color:var(--text-muted);">${e.date || ''}</td>
        <td><button class="btn btn-ghost btn-sm" onclick="deleteExpense('${e.id}')">🗑️</button></td>
      </tr>`).join('');
  }

  window.saveExpense = function() {
    const category   = document.getElementById('exp-category')?.value || 'أخرى';
    const currency   = document.getElementById('exp-currency')?.value || 'SYP';
    const amount     = parseFloat(document.getElementById('exp-amount')?.value);
    const note       = document.getElementById('exp-note')?.value.trim();
    const employeeId = document.getElementById('exp-employee')?.value || null;
    if (!amount || amount <= 0) { showToast('warning','أدخل مبلغاً صحيحاً'); return; }
    const exp = { id:'EXP-'+Date.now().toString().slice(-6), category, amount, currency, note,
                  date:new Date().toLocaleDateString('en-CA').replace(/-/g,'/'),
                  ...(employeeId ? { employeeId } : {}) };
    window._expenses.unshift(exp);
    window._saveData();
    closeModal('expense-modal');
    showToast('success','تم تسجيل المصروف ✓');
    navigate('expenses');
  };

  window.deleteExpense = function(id) {
    window._expenses = (window._expenses||[]).filter(e => e.id !== id);
    window._saveData();
    navigate('expenses');
  };

  window.toggleExpenseEmployee = function() {
    const cat   = document.getElementById('exp-category')?.value;
    const group = document.getElementById('exp-employee-group');
    if (!group) return;
    if (cat === 'راتب') {
      const sel  = document.getElementById('exp-employee');
      const emps = (window._employees || []).filter(e => e.active !== false);
      if (sel) sel.innerHTML = '<option value="">— اختر الموظف —</option>' +
        emps.map(e => `<option value="${e.id}" data-salary="${e.salary||0}">${e.name}${e.salary ? ' — '+Number(e.salary).toLocaleString('en-US') : ''}</option>`).join('');
      group.style.display = '';
    } else {
      group.style.display = 'none';
    }
  };

  window.onExpEmployeeChange = function() {
    const sel    = document.getElementById('exp-employee');
    const opt    = sel?.selectedOptions[0];
    const salary = opt ? Number(opt.dataset.salary) : 0;
    if (salary > 0) {
      const amtEl = document.getElementById('exp-amount');
      if (amtEl) amtEl.value = salary;
    }
    if (opt && opt.value) {
      const noteEl = document.getElementById('exp-note');
      if (noteEl) noteEl.value = `راتب ${opt.textContent.split(' — ')[0].trim()}`;
    }
  };

  // DEBTS (الديون)
  function _creditDebtUnpaid() {
    const base = window.Currency ? window.Currency.base : 'SYP';
    return (window._debts || []).reduce((s, d) => {
      const unpaid = Math.max(0, (d.amount || 0) - (d.paid || 0));
      const v = window.Currency ? window.Currency.convert(unpaid, d.currency || 'SYP', base) : unpaid;
      return s + v;
    }, 0);
  }

  async function renderDebt() {
    const debts = (window._debts || []);
    const base  = window.Currency ? window.Currency.base : 'SYP';
    const totalAmt  = _sumBase(debts);
    const totalPaid = _sumBase(debts.map(d => ({ amount: d.paid || 0, currency: d.currency || 'SYP' })));
    const totalRem  = Math.max(0, totalAmt - totalPaid);
    const countPend = debts.filter(d => d.status !== 'paid').length;

    const rows = debts.length === 0
      ? `<tr><td colspan="8"><div class="empty-state" style="padding:var(--sp-10);">
          <div class="empty-icon">📋</div>
          <div class="empty-title">لا توجد ديون مسجّلة</div>
          <div class="empty-desc">ستظهر هنا ديون البيع الآجل</div>
        </div></td></tr>`
      : debts.map(d => {
          const rem  = Math.max(0, (d.amount||0) - (d.paid||0));
          const pct  = d.amount > 0 ? Math.round(((d.paid||0)/d.amount)*100) : 0;
          const sMap = { paid:'badge-success', partial:'badge-warning', pending:'badge-danger' };
          const sLbl = { paid:'مسدّد', partial:'جزئي', pending:'معلق' };
          const st   = d.status || 'pending';
          return `<tr data-ts="${window._dateToTs(d.date || d.createdAt)}">
            <td style="font-weight:700;">${d.customerName||'—'}</td>
            <td>${_fmt(d.amount||0, d.currency||base)}</td>
            <td style="color:var(--success);">${_fmt(d.paid||0, d.currency||base)}</td>
            <td style="color:var(--danger);font-weight:700;">${_fmt(rem, d.currency||base)}</td>
            <td>
              <div style="display:flex;align-items:center;gap:var(--sp-2);">
                <div style="flex:1;height:6px;background:var(--border);border-radius:4px;overflow:hidden;min-width:60px;">
                  <div style="height:100%;width:${pct}%;background:var(--primary);border-radius:4px;transition:width .3s;"></div>
                </div>
                <span style="font-size:var(--text-xs);color:var(--text-muted);">${pct}%</span>
              </div>
            </td>
            <td><span class="badge ${sMap[st]||'badge-draft'}">${sLbl[st]||st}</span></td>
            <td style="font-size:var(--text-xs);color:var(--text-muted);">${d.date ? new Date(d.date).toLocaleDateString('ar-SY') : '—'}</td>
            <td><div class="table-actions">
              ${st !== 'paid' ? `<button class="btn btn-ghost btn-sm" onclick="openDebtPayment('${d.id}')" title="تسجيل دفعة">💵</button>` : ''}
              <button class="btn btn-ghost btn-sm" onclick="editDebt('${d.id}')" title="تعديل">✏️</button>
              <button class="btn btn-ghost btn-sm" style="color:var(--danger);" onclick="deleteDebt('${d.id}')" title="حذف">🗑️</button>
            </div></td>
          </tr>`;
        }).join('');

    return `
    <div class="module-wrap">
      <div class="module-header">
        <div>
          <h1 class="module-title">سجل الديون 💳</h1>
          <p class="module-subtitle">البيع الآجل — تسجيل الدفعات والتسديد الكامل</p>
        </div>
        <button class="btn btn-primary" onclick="openAddDebtModal()">+ إضافة دين</button>
      </div>

      <div class="kpi-grid" style="margin-bottom:var(--sp-5);">
        <div class="kpi-card"><div class="kpi-icon kpi-icon-blue">💳</div><div class="kpi-info"><div class="kpi-label">إجمالي الديون</div><div class="kpi-value">${_fmt(totalAmt, base)}</div></div></div>
        <div class="kpi-card"><div class="kpi-icon kpi-icon-green">✅</div><div class="kpi-info"><div class="kpi-label">إجمالي المسدّد</div><div class="kpi-value">${_fmt(totalPaid, base)}</div></div></div>
        <div class="kpi-card"><div class="kpi-icon kpi-icon-red">⏳</div><div class="kpi-info"><div class="kpi-label">المتبقي</div><div class="kpi-value">${_fmt(totalRem, base)}</div></div></div>
        <div class="kpi-card"><div class="kpi-icon kpi-icon-amber">📋</div><div class="kpi-info"><div class="kpi-label">ديون معلقة</div><div class="kpi-value">${countPend}</div></div></div>
      </div>

      <div class="module-toolbar">
        <div class="search-wrap" style="flex:1;max-width:340px;">
          <input class="search-input" type="text" placeholder="بحث باسم العميل..." oninput="filterDebts(this.value)" />
          <span class="search-icon">🔍</span>
        </div>
        ${window._sortSelectHTML('debts-tbody')}
      </div>

      <div class="table-wrap">
        <table class="table">
          <thead><tr><th>العميل</th><th>المبلغ الإجمالي</th><th>المسدّد</th><th>المتبقي</th><th>التقدم</th><th>الحالة</th><th>التاريخ</th><th>إجراءات</th></tr></thead>
          <tbody id="debts-tbody">${rows}</tbody>
        </table>
      </div>
    </div>

    <!-- Add/Edit Debt Modal -->
    <div class="modal-overlay" id="debt-modal">
      <div class="modal" style="max-width:480px;">
        <div class="modal-header">
          <h3 class="modal-title" id="debt-modal-title">إضافة دين جديد</h3>
          <button class="modal-close" onclick="closeModal('debt-modal')">✕</button>
        </div>
        <div class="modal-body" style="display:flex;flex-direction:column;gap:var(--sp-4);">
          <input type="hidden" id="debt-edit-id" />
          <div class="form-group"><label class="form-label">العميل <span style="color:var(--danger);">*</span></label>
            <input type="text" class="form-input" id="debt-customer" list="debt-cust-list" placeholder="اسم العميل" />
            <datalist id="debt-cust-list">${(window._customers||[]).map(c=>`<option value="${c.name}">`).join('')}</datalist>
          </div>
          <div class="form-row">
            <div class="form-group"><label class="form-label">المبلغ الإجمالي <span style="color:var(--danger);">*</span></label>
              <input type="number" class="form-input" id="debt-amount" min="0" step="any" placeholder="0" /></div>
            <div class="form-group"><label class="form-label">المدفوع مسبقاً</label>
              <input type="number" class="form-input" id="debt-paid-init" min="0" step="any" value="0" placeholder="0" /></div>
          </div>
          <div class="form-row">
            <div class="form-group"><label class="form-label">العملة</label>
              <select class="form-select" id="debt-currency">${_curOptions()}</select></div>
            <div class="form-group"><label class="form-label">التاريخ</label>
              <input type="date" class="form-input" id="debt-date" value="${new Date().toISOString().split('T')[0]}" /></div>
          </div>
          <div class="form-group"><label class="form-label">ملاحظات</label>
            <textarea class="form-input form-textarea" id="debt-notes" style="height:70px;" placeholder="سبب الدين أو تفاصيل إضافية..."></textarea></div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" onclick="closeModal('debt-modal')">إلغاء</button>
          <button class="btn btn-primary" onclick="saveDebt()">حفظ</button>
        </div>
      </div>
    </div>

    <!-- Payment Modal -->
    <div class="modal-overlay" id="debt-payment-modal">
      <div class="modal" style="max-width:420px;">
        <div class="modal-header">
          <h3 class="modal-title">تسجيل دفعة</h3>
          <button class="modal-close" onclick="closeModal('debt-payment-modal')">✕</button>
        </div>
        <div class="modal-body" style="display:flex;flex-direction:column;gap:var(--sp-4);">
          <input type="hidden" id="dp-debt-id" />
          <div id="dp-summary" style="padding:var(--sp-4);background:var(--surface-2);border-radius:var(--r-lg);font-size:var(--text-sm);"></div>
          <div class="form-group"><label class="form-label">مبلغ الدفعة <span style="color:var(--danger);">*</span></label>
            <input type="number" class="form-input" id="dp-amount" min="0" step="any" placeholder="0" /></div>
          <div style="display:flex;gap:var(--sp-2);">
            <button class="btn btn-secondary btn-sm" id="dp-full-btn" onclick="debtPayFull()">تسديد كامل</button>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" onclick="closeModal('debt-payment-modal')">إلغاء</button>
          <button class="btn btn-primary" onclick="confirmDebtPayment()">تسجيل الدفعة</button>
        </div>
      </div>
    </div>
    `;
  }

  window.init_debts = function() { };

  window.filterDebts = function(q) {
    const t = q.toLowerCase();
    document.querySelectorAll('#debts-tbody tr[data-debt-id]').forEach(r => {
      r.style.display = r.dataset.debtCustomer?.includes(t) ? '' : 'none';
    });
  };

  window.filterDebts = function(q) {
    const t = (q || '').toLowerCase();
    document.querySelectorAll('#debts-tbody tr').forEach(r => {
      r.style.display = !t || r.textContent.toLowerCase().includes(t) ? '' : 'none';
    });
  };

  window.openAddDebtModal = function() {
    document.getElementById('debt-modal-title').textContent = 'إضافة دين جديد';
    document.getElementById('debt-edit-id').value = '';
    document.getElementById('debt-customer').value = '';
    document.getElementById('debt-amount').value = '';
    document.getElementById('debt-paid-init').value = '0';
    document.getElementById('debt-date').value = new Date().toISOString().split('T')[0];
    document.getElementById('debt-notes').value = '';
    openModal('debt-modal');
  };

  window.editDebt = function(id) {
    const d = (window._debts || []).find(x => x.id === id);
    if (!d) return;
    document.getElementById('debt-modal-title').textContent = 'تعديل الدين';
    document.getElementById('debt-edit-id').value    = d.id;
    document.getElementById('debt-customer').value   = d.customerName || '';
    document.getElementById('debt-amount').value     = d.amount || 0;
    document.getElementById('debt-paid-init').value  = d.paid || 0;
    document.getElementById('debt-date').value       = d.date ? new Date(d.date).toISOString().split('T')[0] : '';
    document.getElementById('debt-notes').value      = d.notes || '';
    const curSel = document.getElementById('debt-currency');
    if (curSel) curSel.value = d.currency || 'SYP';
    openModal('debt-modal');
  };

  window.saveDebt = function() {
    const id       = document.getElementById('debt-edit-id')?.value.trim();
    const customer = (document.getElementById('debt-customer')?.value || '').trim();
    const amount   = parseFloat(document.getElementById('debt-amount')?.value) || 0;
    const paidInit = Math.min(amount, parseFloat(document.getElementById('debt-paid-init')?.value) || 0);
    const currency = document.getElementById('debt-currency')?.value || 'SYP';
    const dateVal  = document.getElementById('debt-date')?.value;
    const notes    = document.getElementById('debt-notes')?.value || '';

    if (!customer) { showToast('warning', 'يرجى إدخال اسم العميل'); return; }
    if (amount <= 0) { showToast('warning', 'يرجى إدخال مبلغ الدين'); return; }

    const status = paidInit >= amount ? 'paid' : paidInit > 0 ? 'partial' : 'pending';
    const debts = window._debts || [];

    if (id) {
      const idx = debts.findIndex(d => d.id === id);
      if (idx >= 0) debts[idx] = { ...debts[idx], customerName: customer, amount, paid: paidInit, currency, notes, status,
                                    date: dateVal ? new Date(dateVal).getTime() : debts[idx].date };
    } else {
      debts.unshift({
        id: 'DEBT-' + Date.now().toString().slice(-8),
        customerName: customer, amount, paid: paidInit, currency,
        date: dateVal ? new Date(dateVal).getTime() : Date.now(),
        notes, status, createdAt: Date.now(),
      });
    }
    window._debts = debts;
    window._saveData();
    closeModal('debt-modal');
    navigate('debts');
    showToast('success', 'تم حفظ الدين ✓');
  };

  window.deleteDebt = function(id) {
    if (!confirm('هل تريد حذف هذا الدين؟')) return;
    window._debts = (window._debts || []).filter(d => d.id !== id);
    window._saveData();
    navigate('debts');
    showToast('success', 'تم حذف الدين ✓');
  };

  window.openDebtPayment = function(id) {
    const d = (window._debts || []).find(x => x.id === id);
    if (!d) return;
    document.getElementById('dp-debt-id').value = d.id;
    const rem = Math.max(0, (d.amount||0) - (d.paid||0));
    const sumEl = document.getElementById('dp-summary');
    if (sumEl) sumEl.innerHTML = `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--sp-2);">
        <div>العميل: <strong>${d.customerName||'—'}</strong></div>
        <div>الإجمالي: <strong>${_fmt(d.amount||0, d.currency||'SYP')}</strong></div>
        <div>المسدّد: <strong style="color:var(--success);">${_fmt(d.paid||0, d.currency||'SYP')}</strong></div>
        <div>المتبقي: <strong style="color:var(--danger);">${_fmt(rem, d.currency||'SYP')}</strong></div>
      </div>`;
    document.getElementById('dp-amount').value = '';
    openModal('debt-payment-modal');
  };

  window.debtPayFull = function() {
    const id = document.getElementById('dp-debt-id')?.value;
    const d = (window._debts || []).find(x => x.id === id);
    if (!d) return;
    const rem = Math.max(0, (d.amount||0) - (d.paid||0));
    document.getElementById('dp-amount').value = rem;
  };

  window.confirmDebtPayment = function() {
    const id  = document.getElementById('dp-debt-id')?.value;
    const pay = parseFloat(document.getElementById('dp-amount')?.value) || 0;
    if (!id || pay <= 0) { showToast('warning', 'يرجى إدخال مبلغ الدفعة'); return; }
    const debts = window._debts || [];
    const idx = debts.findIndex(d => d.id === id);
    if (idx < 0) return;
    const d = debts[idx];
    const newPaid = Math.min(d.amount || 0, (d.paid || 0) + pay);
    debts[idx] = { ...d, paid: newPaid, status: newPaid >= (d.amount||0) ? 'paid' : newPaid > 0 ? 'partial' : 'pending', lastPaymentAt: Date.now() };
    window._debts = debts;
    window._saveData();
    closeModal('debt-payment-modal');
    navigate('debts');
    showToast('success', `تم تسجيل الدفعة ${_fmt(pay, d.currency||'SYP')} ✓`);
  };

  // SUPPLIERS (الموردين)
  async function renderSuppliers() {
    return `
    <div class="module-wrap">
      <div class="module-header">
        <div>
          <h1 class="module-title">الموردين 🏭</h1>
          <p class="module-subtitle">الموردون الذين يجلبون البضاعة إلى المخزون</p>
        </div>
        <button class="btn btn-primary" onclick="openModal('supplier-modal')">+ مورد جديد</button>
      </div>

      <div class="kpi-grid" style="margin-bottom:var(--sp-5);">
        <div class="kpi-card"><div class="kpi-icon kpi-icon-blue">🏭</div><div class="kpi-info"><div class="kpi-label">إجمالي الموردين</div><div class="kpi-value">${(window._suppliers||[]).length}</div></div></div>
        <div class="kpi-card"><div class="kpi-icon kpi-icon-green">📦</div><div class="kpi-info"><div class="kpi-label">بضائع مرتبطة بمورد</div><div class="kpi-value">${(window._products||[]).filter(p=>!!p.supplier).length}</div></div></div>
      </div>

      <div class="chart-box">
        <div class="chart-header"><h3 class="chart-title">قائمة الموردين</h3></div>
        <div style="overflow-x:auto;">
          <table class="table">
            <thead><tr><th>المورد</th><th>الهاتف</th><th>ملاحظات</th><th>عدد البضائع</th><th></th></tr></thead>
            <tbody id="suppliers-tbody">${generateSupplierRows()}</tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Supplier Modal -->
    <div class="modal-overlay" id="supplier-modal">
      <div class="modal" style="max-width:460px;">
        <div class="modal-header">
          <h3 class="modal-title">إضافة مورد</h3>
          <button class="modal-close" onclick="closeModal('supplier-modal')">✕</button>
        </div>
        <div class="modal-body">
          <div class="form-group"><label class="form-label">اسم المورد <span>*</span></label>
            <input type="text" class="form-input" id="sup-name" placeholder="اسم المورد أو الشركة" /></div>
          <div class="form-group"><label class="form-label">رقم الهاتف</label>
            <input type="text" class="form-input" id="sup-phone" placeholder="09xxxxxxxx" /></div>
          <div class="form-group"><label class="form-label">ملاحظات</label>
            <input type="text" class="form-input" id="sup-note" placeholder="نوع البضائع / ملاحظات" /></div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" onclick="closeModal('supplier-modal')">إلغاء</button>
          <button class="btn btn-primary" onclick="saveSupplier()">حفظ المورد</button>
        </div>
      </div>
    </div>

    <!-- Supplier Profile Modal -->
    <div class="modal-overlay" id="supplier-profile-modal">
      <div class="modal modal-lg">
        <div class="modal-header">
          <h3 class="modal-title" id="sp-title">بروفايل المورد</h3>
          <button class="modal-close" onclick="closeModal('supplier-profile-modal')">✕</button>
        </div>
        <div class="modal-body">
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--sp-4);margin-bottom:var(--sp-5);">
            <div><span class="form-label">الاسم</span><div id="sp-name" style="font-weight:700;font-size:var(--text-lg);margin-top:4px;"></div></div>
            <div><span class="form-label">الهاتف</span><div id="sp-phone" style="margin-top:4px;"></div></div>
            <div style="grid-column:span 2;"><span class="form-label">ملاحظات</span><div id="sp-note" style="color:var(--text-muted);margin-top:4px;"></div></div>
          </div>
          <h4 style="font-weight:700;margin-bottom:var(--sp-3);">المنتجات المرتبطة</h4>
          <div class="table-wrap">
            <table class="table">
              <thead><tr><th>المنتج</th><th>المخزون</th><th>السعر</th></tr></thead>
              <tbody id="sp-products-list"></tbody>
            </table>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" onclick="closeModal('supplier-profile-modal')">إغلاق</button>
        </div>
      </div>
    </div>
    `;
  }

  function generateSupplierRows() {
    const list = (window._suppliers || []);
    if (!list.length) {
      return `<tr><td colspan="5"><div class="empty-state" style="padding:var(--sp-8) var(--sp-4);text-align:center;color:var(--text-muted);">
        <div class="empty-icon" style="font-size:32px;">🏭</div>
        <div class="empty-title">لا يوجد موردون بعد</div></div></td></tr>`;
    }
    return list.map(s => {
      const count = (window._products||[]).filter(p => p.supplier === s.id).length;
      return `
      <tr>
        <td style="font-weight:700;cursor:pointer;color:var(--primary);" onclick="openSupplierProfile('${s.id}')">${s.name}</td>
        <td style="color:var(--text-muted);">${s.phone || '—'}</td>
        <td style="color:var(--text-muted);">${s.note || '—'}</td>
        <td>${count}</td>
        <td><button class="btn btn-ghost btn-sm" onclick="deleteSupplier('${s.id}')">🗑️</button></td>
      </tr>`;
    }).join('');
  }

  window.saveSupplier = function() {
    const name  = document.getElementById('sup-name')?.value.trim();
    const phone = document.getElementById('sup-phone')?.value.trim();
    const note  = document.getElementById('sup-note')?.value.trim();
    if (!name) { showToast('warning','أدخل اسم المورد'); return; }
    const sup = { id:'SUP-'+Date.now().toString().slice(-6), name, phone, note };
    window._suppliers.unshift(sup);
    window._saveData();
    closeModal('supplier-modal');
    showToast('success','تم إضافة المورد ✓');
    navigate('suppliers');
  };

  window.deleteSupplier = function(id) {
    window._suppliers = (window._suppliers||[]).filter(s => s.id !== id);
    window._saveData();
    navigate('suppliers');
  };

  window.openSupplierProfile = function(id) {
    const s = (window._suppliers||[]).find(x => x.id === id);
    if (!s) return;
    document.getElementById('sp-title').textContent = `بروفايل: ${s.name}`;
    document.getElementById('sp-name').textContent  = s.name;
    document.getElementById('sp-phone').textContent = s.phone || '—';
    document.getElementById('sp-note').textContent  = s.note  || '—';
    const prods = (window._products||[]).filter(p => p.supplier === id);
    document.getElementById('sp-products-list').innerHTML = prods.length
      ? prods.map(p => `<tr>
          <td style="font-weight:600;">${p.name}</td>
          <td>${Number(p.stock)||0}</td>
          <td>${_fmt(p.price, p.currency)}</td>
        </tr>`).join('')
      : `<tr><td colspan="3" style="text-align:center;color:var(--text-muted);padding:var(--sp-8);">لا توجد منتجات مرتبطة بهذا المورد</td></tr>`;
    openModal('supplier-profile-modal');
  };

  function generateSupplierOptions() {
    const list = window._suppliers || [];
    const opts = list.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
    return `<option value="">— بدون مورد —</option>${opts}`;
  }

  // PURCHASES (المشتريات)
  async function renderPurchases() {
    return `
    <div class="module-wrap">
      <div class="module-header">
        <div>
          <h1 class="module-title">المشتريات 🛒</h1>
          <p class="module-subtitle">طلبات الشراء من الموردين وإدخال البضاعة إلى المخزون</p>
        </div>
        <button class="btn btn-primary" onclick="openPurchaseModal()">+ طلب شراء</button>
      </div>

      <div class="kpi-grid" style="margin-bottom:var(--sp-5);">
        <div class="kpi-card"><div class="kpi-icon kpi-icon-blue">🏭</div><div class="kpi-info"><div class="kpi-label">إجمالي الموردين</div><div class="kpi-value" id="pur-kpi-suppliers">0</div></div></div>
        <div class="kpi-card"><div class="kpi-icon kpi-icon-green">📋</div><div class="kpi-info"><div class="kpi-label">طلبات الشراء</div><div class="kpi-value" id="pur-kpi-count">0</div></div></div>
        <div class="kpi-card"><div class="kpi-icon kpi-icon-amber">💰</div><div class="kpi-info"><div class="kpi-label">مشتريات هذا الشهر</div><div class="kpi-value" id="pur-kpi-month">0 ل.س</div></div></div>
        <div class="kpi-card"><div class="kpi-icon kpi-icon-red">⏳</div><div class="kpi-info"><div class="kpi-label">طلبات معلقة</div><div class="kpi-value" id="pur-kpi-pending">0</div></div></div>
      </div>

      <div class="chart-box">
        <div class="chart-header" style="display:flex;justify-content:space-between;align-items:center;"><h3 class="chart-title">طلبات الشراء</h3>${window._sortSelectHTML('purchases-tbody')}</div>
        <div style="overflow-x:auto;">
          <table class="table">
            <thead><tr><th>رقم الطلب</th><th>المورد</th><th>عدد البنود</th><th>الإجمالي</th><th>الحالة</th><th>التاريخ</th><th>إجراءات</th></tr></thead>
            <tbody id="purchases-tbody">${generatePurchaseRows()}</tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Purchase Modal -->
    <div class="modal-overlay" id="purchase-modal">
      <div class="modal modal-xl">
        <div class="modal-header">
          <h3 class="modal-title">طلب شراء جديد</h3>
          <button class="modal-close" onclick="closeModal('purchase-modal')">✕</button>
        </div>
        <div class="modal-body">
          <div class="form-row">
            <div class="form-group"><label class="form-label">المورد</label>
              <select class="form-select" id="pur-supplier">${generateSupplierOptions()}</select>
            </div>
            <div class="form-group"><label class="form-label">التاريخ <span>*</span></label>
              <input type="date" class="form-input" id="pur-date" />
            </div>
            <div class="form-group"><label class="form-label">العملة</label>
              <select class="form-select" id="pur-currency" onchange="calcPurchaseTotal()">${_curOptions()}</select>
            </div>
            <div class="form-group"><label class="form-label">الحالة</label>
              <select class="form-select" id="pur-status">
                <option value="received">مستلَم (إضافة للمخزون)</option>
                <option value="pending">معلق</option>
              </select>
            </div>
          </div>
          <div style="border:1px solid var(--border);border-radius:var(--r-lg);overflow:hidden;margin-bottom:var(--sp-4);">
            <table class="table">
              <thead><tr><th>المنتج</th><th>الكمية</th><th>سعر التكلفة</th><th>الإجمالي</th><th></th></tr></thead>
              <tbody id="purchase-items">${purchaseItemRow()}</tbody>
            </table>
            <div style="padding:var(--sp-3) var(--sp-4);">
              <button type="button" class="btn btn-ghost btn-sm" onclick="addPurchaseItem()">+ إضافة بند</button>
            </div>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--sp-6);">
            <div class="form-group"><label class="form-label">ملاحظات</label><textarea class="form-input form-textarea" id="pur-note" placeholder="ملاحظات على الطلب..."></textarea></div>
            <div style="display:flex;flex-direction:column;gap:var(--sp-2);justify-content:flex-end;">
              <div style="display:flex;justify-content:space-between;padding:var(--sp-3) 0;font-size:var(--text-xl);font-weight:800;color:var(--primary);">
                <span>الإجمالي</span><span id="pur-grand-total">0 ل.س</span>
              </div>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" onclick="closeModal('purchase-modal')">إلغاء</button>
          <button class="btn btn-primary" onclick="savePurchase()">💾 حفظ الطلب</button>
        </div>
      </div>
    </div>
    `;
  }

  function _purchaseProductOptions(sel) {
    const list = window._products || [];
    return `<option value="">— منتج يدوي / جديد —</option>` +
      list.map(p => `<option value="${p.id}" ${sel===p.id?'selected':''}>${p.name}</option>`).join('');
  }
  function purchaseItemRow() {
    return `<tr class="pur-item-row">
      <td style="min-width:180px;">
        <select class="form-select pur-item-prod" style="height:36px;" onchange="onPurchaseProdChange(this)">${_purchaseProductOptions()}</select>
        <input type="text" class="form-input pur-item-name" style="height:36px;margin-top:4px;" placeholder="اسم المنتج (يدوي)" />
      </td>
      <td><input type="number" class="form-input pur-item-qty" style="height:36px;width:80px;" value="1" min="1" oninput="calcPurchaseTotal()" /></td>
      <td><input type="number" class="form-input pur-item-cost" style="height:36px;width:120px;" placeholder="0" min="0" oninput="calcPurchaseTotal()" /></td>
      <td class="pur-row-total" style="font-weight:700;color:var(--primary);white-space:nowrap;">0</td>
      <td><button type="button" class="btn btn-ghost btn-sm" onclick="removePurchaseItem(this)">🗑️</button></td>
    </tr>`;
  }

  function generatePurchaseRows() {
    const list = (window._purchases || []);
    if (!list.length) {
      return `<tr><td colspan="7"><div class="empty-state" style="padding:var(--sp-8) var(--sp-4);text-align:center;color:var(--text-muted);">
        <div class="empty-icon" style="font-size:32px;">🛒</div>
        <div class="empty-title">لا توجد طلبات شراء بعد</div></div></td></tr>`;
    }
    const stMap = { received:['badge-success','مستلَم'], pending:['badge-warning','معلق'] };
    return list.map(po => {
      const st = stMap[po.status] || ['badge-gray', po.status];
      return `<tr data-ts="${window._dateToTs(po.date || po.createdAt)}">
        <td style="font-weight:700;color:var(--primary);">${po.id}</td>
        <td>${po.supplierName || '—'}</td>
        <td>${(po.items||[]).length}</td>
        <td style="font-weight:700;">${_fmt(po.total, po.currency)}</td>
        <td><span class="badge ${st[0]}">${st[1]}</span></td>
        <td style="color:var(--text-muted);">${po.date}</td>
        <td><div class="table-actions">
          ${po.status==='pending' ? `<button class="btn btn-ghost btn-sm" title="استلام وإضافة للمخزون" onclick="receivePurchase('${po.id}')">📥</button>` : ''}
          <button class="btn btn-ghost btn-sm" onclick="deletePurchase('${po.id}')">🗑️</button>
        </div></td>
      </tr>`;
    }).join('');
  }

  window.init_purchases = function() {
    const base = window.Currency ? window.Currency.base : 'SYP';
    const list = (window._purchases || []);
    const n  = new Date();
    const ym = `${n.getFullYear()}/${String(n.getMonth()+1).padStart(2,'0')}`;
    const monthList = list
      .filter(po => String(po.date || '').startsWith(ym))
      .map(po => ({ amount: po.amount != null ? po.amount : po.total, currency: po.currency || 'SYP' }));
    const monthTotal = _sumBase(monthList);
    const pending = list.filter(po => po.status === 'pending').length;
    const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
    set('pur-kpi-suppliers', (window._suppliers||[]).length);
    set('pur-kpi-count',     list.length);
    set('pur-kpi-month',     _fmt(monthTotal, base));
    set('pur-kpi-pending',   pending);
  };

  window.openPurchaseModal = function() {
    const tb = document.getElementById('purchase-items');
    if (tb) tb.innerHTML = purchaseItemRow();
    const d = document.getElementById('pur-date'); if (d) d.value = new Date().toISOString().slice(0,10);
    const sup = document.getElementById('pur-supplier'); if (sup) sup.innerHTML = generateSupplierOptions();
    const note = document.getElementById('pur-note'); if (note) note.value = '';
    calcPurchaseTotal();
    openModal('purchase-modal');
  };

  window.onPurchaseProdChange = function(sel) {
    const row = sel.closest('tr');
    if (!row) return;
    const nameInput = row.querySelector('.pur-item-name');
    if (sel.value) {
      if (nameInput) nameInput.style.display = 'none';
      const p = (window._products||[]).find(x => x.id === sel.value);
      const costEl = row.querySelector('.pur-item-cost');
      if (p && costEl && !costEl.value) costEl.value = Number(p.cost != null ? p.cost : p.price) || 0;
    } else {
      if (nameInput) nameInput.style.display = '';
    }
    calcPurchaseTotal();
  };

  window.calcPurchaseTotal = function() {
    let total = 0;
    document.querySelectorAll('#purchase-items .pur-item-row').forEach(row => {
      const qty  = parseFloat(row.querySelector('.pur-item-qty')?.value)  || 0;
      const cost = parseFloat(row.querySelector('.pur-item-cost')?.value) || 0;
      const line = qty * cost;
      total += line;
      const cell = row.querySelector('.pur-row-total');
      if (cell) cell.textContent = line.toLocaleString('en-US');
    });
    const cur = document.getElementById('pur-currency')?.value || 'SYP';
    const gt  = document.getElementById('pur-grand-total');
    if (gt) gt.textContent = _fmt(total, cur);
  };

  window.addPurchaseItem = function() {
    const tb = document.getElementById('purchase-items');
    if (!tb) return;
    tb.insertAdjacentHTML('beforeend', purchaseItemRow());
    calcPurchaseTotal();
  };
  window.removePurchaseItem = function(btn) {
    const rows = document.querySelectorAll('#purchase-items .pur-item-row');
    if (rows.length <= 1) { showToast('warning','يجب أن يحتوي الطلب على بند واحد على الأقل'); return; }
    btn.closest('tr').remove();
    calcPurchaseTotal();
  };

  window.savePurchase = function() {
    const supId  = document.getElementById('pur-supplier')?.value || '';
    const date   = document.getElementById('pur-date')?.value;
    const cur    = document.getElementById('pur-currency')?.value || 'SYP';
    const status = document.getElementById('pur-status')?.value || 'received';
    const note   = document.getElementById('pur-note')?.value.trim() || '';
    if (!date) { showToast('warning','يرجى تحديد التاريخ'); return; }
    const sup = (window._suppliers||[]).find(s => s.id === supId);
    const items = [];
    let total = 0;
    document.querySelectorAll('#purchase-items .pur-item-row').forEach(row => {
      const prodId = row.querySelector('.pur-item-prod')?.value || '';
      const manual = row.querySelector('.pur-item-name')?.value.trim() || '';
      const qty    = parseFloat(row.querySelector('.pur-item-qty')?.value)  || 0;
      const cost   = parseFloat(row.querySelector('.pur-item-cost')?.value) || 0;
      let name = manual;
      if (prodId) { const p = (window._products||[]).find(x => x.id === prodId); if (p) name = p.name; }
      if (!name || qty <= 0) return;
      items.push({ productId: prodId || null, name, qty, cost });
      total += qty * cost;
    });
    if (!items.length) { showToast('warning','يرجى إضافة بند واحد على الأقل بكمية صحيحة'); return; }
    const po = {
      id: 'PO-' + Date.now().toString().slice(-6),
      supplier: supId || null,
      supplierName: sup ? sup.name : '—',
      date: date.replace(/-/g,'/'),
      currency: cur, amount: total, total, status, note, items,
      createdAt: Date.now(),
    };
    window._purchases = window._purchases || [];
    window._purchases.unshift(po);
    if (status === 'received') {
      items.forEach(it => {
        if (!it.productId) return;
        const p = (window._products||[]).find(x => x.id === it.productId);
        if (p) {
          recordStockMove(p, 'in', it.qty, `شراء ${po.id}`);
          if (it.cost > 0) p.cost = it.cost;
        }
      });
    }
    window._saveData();
    closeModal('purchase-modal');
    showToast('success', `تم حفظ طلب الشراء ${po.id} ✓`);
    navigate('purchases');
  };

  window.receivePurchase = function(id) {
    const po = (window._purchases||[]).find(p => p.id === id);
    if (!po || po.status === 'received') return;
    (po.items||[]).forEach(it => {
      if (!it.productId) return;
      const p = (window._products||[]).find(x => x.id === it.productId);
      if (p) {
        recordStockMove(p, 'in', it.qty, `شراء ${po.id}`);
        if (it.cost > 0) p.cost = it.cost;
      }
    });
    po.status = 'received';
    window._saveData();
    navigate('purchases');
    showToast('success', `تم استلام الطلب ${po.id} وإضافة الكميات للمخزون ✓`);
  };

  window.deletePurchase = function(id) {
    window._purchases = (window._purchases||[]).filter(p => p.id !== id);
    window._saveData();
    navigate('purchases');
  };

  async function renderAccounting() {
    return `
    <div class="module-wrap">
      <div class="module-header">
        <div>
          <h1 class="module-title">المحاسبة 💰</h1>
          <p class="module-subtitle">دليل الحسابات، القيود اليومية، والتقارير المالية</p>
        </div>
        <div style="display:flex;gap:var(--sp-3);">
          <button class="btn btn-secondary btn-sm" onclick="exportAccountingPDF()">📥 تصدير PDF</button>
          <button class="btn btn-primary" onclick="openModal('new-entry-modal')">+ قيد جديد</button>
        </div>
      </div>

      <!-- KPI -->
      <div class="kpi-grid" style="margin-bottom:var(--sp-5);">
        <div class="kpi-card"><div class="kpi-icon kpi-icon-green">📈</div><div class="kpi-info"><div class="kpi-label">الإيرادات</div><div class="kpi-value" id="acc-kpi-income">0 ل.س</div></div></div>
        <div class="kpi-card"><div class="kpi-icon kpi-icon-red">📉</div><div class="kpi-info"><div class="kpi-label">المصروفات</div><div class="kpi-value" id="acc-kpi-expense">0 ل.س</div></div></div>
        <div class="kpi-card"><div class="kpi-icon kpi-icon-blue">💹</div><div class="kpi-info"><div class="kpi-label">صافي الربح</div><div class="kpi-value" id="acc-kpi-profit">0 ل.س</div></div></div>
        <div class="kpi-card"><div class="kpi-icon kpi-icon-amber">🏦</div><div class="kpi-info"><div class="kpi-label">الرصيد النقدي</div><div class="kpi-value" id="acc-kpi-cash">0 ل.س</div></div></div>
      </div>

      <!-- Tabs -->
      <div class="tabs" style="margin-bottom:var(--sp-5);">
        <button class="tab-btn active" onclick="switchAccTab(this,'journal')">القيود اليومية</button>
        <button class="tab-btn" onclick="switchAccTab(this,'chart')">دليل الحسابات</button>
        <button class="tab-btn" onclick="switchAccTab(this,'pl')">الأرباح والخسائر</button>
        <button class="tab-btn" onclick="switchAccTab(this,'balance')">الميزانية</button>
      </div>

      <!-- Journal Entries -->
      <div id="acc-tab-journal">
        <div class="module-toolbar" style="margin-bottom:var(--sp-4);">
          <div class="search-wrap" style="flex:1;max-width:340px;">
            <input class="search-input" type="text" placeholder="بحث في القيود..." oninput="filterEntries(this.value)" />
            <span class="search-icon">🔍</span>
          </div>
          <input type="date" class="form-input" style="width:auto;height:38px;" onchange="filterEntriesByDate(this.value)" />
        </div>
        <div class="table-wrap">
          <table class="table">
            <thead><tr><th>#</th><th>التاريخ</th><th>الوصف</th><th>نوع الحساب</th><th>مدين</th><th>دائن</th><th>إجراءات</th></tr></thead>
            <tbody id="entries-tbody">
              <tr><td colspan="7" style="text-align:center;padding:var(--sp-10);color:var(--text-muted);">
                <div style="font-size:3rem;">📒</div>
                <div style="font-weight:700;margin:var(--sp-3) 0 var(--sp-2);">لا توجد قيود بعد</div>
                <button class="btn btn-primary btn-sm" onclick="openModal('new-entry-modal')">+ إضافة قيد</button>
              </td></tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Chart of Accounts -->
      <div id="acc-tab-chart" style="display:none;">
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,220px),1fr));gap:var(--sp-4);">
          ${[
            { type:'الأصول', icon:'🏦', color:'blue',  accounts:[['النقد','acc-cash'],['البنك','acc-bank'],['الذمم المدينة','acc-recv'],['المخزون','acc-inv'],['الأصول الثابتة','acc-fixed']] },
            { type:'الخصوم', icon:'💳', color:'red',   accounts:[['الذمم الدائنة','acc-pay'],['القروض','acc-loans'],['مستحقات الموظفين','acc-empdue']] },
            { type:'حقوق الملكية', icon:'💼', color:'green', accounts:[['رأس المال','acc-capital'],['الأرباح المرحّلة','acc-retained']] },
            { type:'الإيرادات', icon:'📈', color:'green', accounts:[['إيرادات المبيعات','acc-rev-sales'],['إيرادات أخرى','acc-rev-other']] },
            { type:'المصروفات', icon:'📉', color:'amber', accounts:[['تكلفة المبيعات','acc-exp-cogs'],['مصروفات التشغيل','acc-exp-op'],['الرواتب','acc-exp-sal'],['الإيجار','acc-exp-rent']] },
          ].map(cat => `
            <div class="card" style="padding:var(--sp-4);">
              <div style="display:flex;align-items:center;gap:var(--sp-3);margin-bottom:var(--sp-3);">
                <div class="kpi-icon kpi-icon-${cat.color}" style="width:36px;height:36px;">${cat.icon}</div>
                <strong style="font-size:var(--text-sm);">${cat.type}</strong>
              </div>
              <ul style="list-style:none;padding:0;display:flex;flex-direction:column;gap:var(--sp-2);">
                ${cat.accounts.map(([a, id]) => `
                  <li style="display:flex;justify-content:space-between;align-items:center;font-size:var(--text-sm);padding:var(--sp-1) 0;border-bottom:1px solid var(--border);">
                    <span>${a}</span><span id="${id}" style="font-weight:600;">0 ل.س</span>
                  </li>`).join('')}
              </ul>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- P&L -->
      <div id="acc-tab-pl" style="display:none;">
        <div class="card" style="padding:var(--sp-5);max-width:600px;margin:0 auto;">
          <h3 style="font-weight:800;margin-bottom:var(--sp-5);text-align:center;">قائمة الأرباح والخسائر</h3>
          <div style="display:flex;justify-content:space-between;font-weight:700;color:var(--success);padding:var(--sp-3) 0;border-bottom:2px solid var(--border);">
            <span>إجمالي الإيرادات</span><span id="pl-income">0 ل.س</span>
          </div>
          <div style="display:flex;justify-content:space-between;color:var(--danger);padding:var(--sp-3) 0;border-bottom:1px solid var(--border);">
            <span>إجمالي المصروفات</span><span id="pl-expense">0 ل.س</span>
          </div>
          <div style="display:flex;justify-content:space-between;font-weight:800;font-size:var(--text-xl);color:var(--primary);padding:var(--sp-4) 0;">
            <span>صافي الربح / الخسارة</span><span id="pl-profit">0 ل.س</span>
          </div>
          <button class="btn btn-secondary btn-sm" style="width:100%;" onclick="exportAccountingPDF()">📥 تصدير PDF</button>
        </div>
      </div>

      <!-- Balance Sheet -->
      <div id="acc-tab-balance" style="display:none;">
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,280px),1fr));gap:var(--sp-4);">
          <div class="card" style="padding:var(--sp-5);">
            <h3 style="font-weight:800;margin-bottom:var(--sp-4);color:var(--primary);">الأصول</h3>
            <div style="display:flex;justify-content:space-between;padding:var(--sp-2) 0;border-bottom:1px solid var(--border);"><span>النقد والصندوق</span><span id="bs-cash" style="font-weight:600;">0 ل.س</span></div>
            <div style="display:flex;justify-content:space-between;padding:var(--sp-2) 0;border-bottom:1px solid var(--border);"><span>الذمم المدينة</span><span id="bs-recv" style="font-weight:600;">0 ل.س</span></div>
            <div style="display:flex;justify-content:space-between;padding:var(--sp-2) 0;border-bottom:1px solid var(--border);"><span>المخزون</span><span id="bs-inv" style="font-weight:600;">0 ل.س</span></div>
            <div style="display:flex;justify-content:space-between;padding:var(--sp-3) 0;font-weight:800;color:var(--success);"><span>إجمالي الأصول</span><span id="bs-assets-total">0 ل.س</span></div>
          </div>
          <div class="card" style="padding:var(--sp-5);">
            <h3 style="font-weight:800;margin-bottom:var(--sp-4);color:var(--danger);">الخصوم وحقوق الملكية</h3>
            <div style="display:flex;justify-content:space-between;padding:var(--sp-2) 0;border-bottom:1px solid var(--border);"><span>الذمم الدائنة</span><span id="bs-pay" style="font-weight:600;">0 ل.س</span></div>
            <div style="display:flex;justify-content:space-between;padding:var(--sp-3) 0;font-weight:700;"><span>إجمالي الخصوم</span><span id="bs-liab-total">0 ل.س</span></div>
            <div style="display:flex;justify-content:space-between;padding:var(--sp-2) 0;border-bottom:1px solid var(--border);"><span>رأس المال</span><span id="bs-capital" style="font-weight:600;">0 ل.س</span></div>
            <div style="display:flex;justify-content:space-between;padding:var(--sp-2) 0;border-bottom:1px solid var(--border);"><span>الأرباح المرحّلة</span><span id="bs-retained" style="font-weight:600;">0 ل.س</span></div>
            <div style="display:flex;justify-content:space-between;padding:var(--sp-3) 0;font-weight:800;color:var(--primary);"><span>إجمالي الخصوم وحقوق الملكية</span><span id="bs-liabeq-total">0 ل.س</span></div>
          </div>
        </div>
      </div>
    </div>

    <!-- New Journal Entry Modal -->
    <div class="modal-overlay" id="new-entry-modal">
      <div class="modal modal-lg">
        <div class="modal-header">
          <h3 class="modal-title">📒 إضافة قيد محاسبي</h3>
          <button class="modal-close" onclick="closeModal('new-entry-modal')">✕</button>
        </div>
        <div class="modal-body">
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">التاريخ *</label>
              <input type="date" class="form-input" id="entry-date" />
            </div>
            <div class="form-group">
              <label class="form-label">نوع القيد *</label>
              <select class="form-select" id="entry-type">
                <option value="income">إيراد</option>
                <option value="expense">مصروف</option>
                <option value="asset">أصل</option>
                <option value="liability">التزام</option>
              </select>
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">الوصف *</label>
            <input type="text" class="form-input" id="entry-desc" placeholder="وصف العملية المحاسبية" />
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">مدين (ل.س)</label>
              <input type="number" class="form-input" id="entry-debit" placeholder="0" min="0" oninput="syncEntryCredit()" />
            </div>
            <div class="form-group">
              <label class="form-label">دائن (ل.س)</label>
              <input type="number" class="form-input" id="entry-credit" placeholder="0" min="0" />
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">ملاحظات</label>
            <textarea class="form-input" id="entry-notes" rows="2" placeholder="ملاحظات إضافية..."></textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-ghost" onclick="closeModal('new-entry-modal')">إلغاء</button>
          <button class="btn btn-primary" onclick="saveEntry()">💾 حفظ القيد</button>
        </div>
      </div>
    </div>
    `;
  }

  async function renderHR() {
    return `
    <div class="module-wrap">
      <div class="module-header">
        <div>
          <h1 class="module-title">الموظفون 👨‍💼</h1>
          <p class="module-subtitle">إدارة الموظفين، الحضور، الإجازات وكشف الرواتب</p>
        </div>
        <div style="display:flex;gap:var(--sp-3);">
          <button class="btn btn-secondary btn-sm" onclick="toggleEmpView()" id="emp-view-btn">☰ جدول</button>
          <button class="btn btn-primary" onclick="openModal('new-employee-modal')">+ موظف جديد</button>
        </div>
      </div>

      <!-- KPI -->
      <div class="kpi-grid" style="margin-bottom:var(--sp-5);">
        <div class="kpi-card">
          <div class="kpi-icon kpi-icon-blue">👥</div>
          <div class="kpi-info"><div class="kpi-label">إجمالي الموظفين</div><div class="kpi-value" id="emp-kpi-total">0</div></div>
        </div>
        <div class="kpi-card">
          <div class="kpi-icon kpi-icon-green">✅</div>
          <div class="kpi-info"><div class="kpi-label">نشطون</div><div class="kpi-value" id="emp-kpi-active">0</div></div>
        </div>
        <div class="kpi-card">
          <div class="kpi-icon kpi-icon-amber">🏖️</div>
          <div class="kpi-info"><div class="kpi-label">في إجازة</div><div class="kpi-value" id="emp-kpi-leave">0</div></div>
        </div>
        <div class="kpi-card">
          <div class="kpi-icon kpi-icon-red">💰</div>
          <div class="kpi-info"><div class="kpi-label">إجمالي الرواتب</div><div class="kpi-value" id="emp-kpi-salary">0 ل.س</div></div>
        </div>
      </div>

      <!-- Tabs -->
      <div class="tabs" style="margin-bottom:var(--sp-5);">
        <button class="tab-btn active" onclick="switchHRTab(this,'employees')">الموظفون</button>
        <button class="tab-btn" onclick="switchHRTab(this,'attendance')">الحضور والغياب</button>
        <button class="tab-btn" onclick="switchHRTab(this,'leaves')">الإجازات</button>
        <button class="tab-btn" onclick="switchHRTab(this,'payroll')">كشف الرواتب</button>
      </div>

      <!-- Tab: Employees -->
      <div id="hr-tab-employees">
        <!-- Toolbar -->
        <div class="module-toolbar" style="margin-bottom:var(--sp-4);">
          <div class="search-wrap" style="flex:1;max-width:340px;">
            <input class="search-input" type="text" placeholder="البحث باسم الموظف أو المسمى..." oninput="filterEmployees(this.value)" />
            <span class="search-icon">🔍</span>
          </div>
          <select class="form-input" style="width:auto;height:38px;font-size:var(--text-sm);" onchange="filterEmpDept(this.value)" id="emp-dept-filter">
            <option value="">كل الأقسام</option>
            <option>المبيعات</option><option>المحاسبة</option><option>التسويق</option>
            <option>الموظفون</option><option>المستودع</option><option>الإدارة</option>
          </select>
          <select class="form-input" style="width:auto;height:38px;font-size:var(--text-sm);" title="ترتيب حسب تاريخ التعيين" onchange="_sortRows('emp-cards-grid',this.value,'.emp-card');_sortRows('employees-body',this.value,'tr[data-emp-id]')">
            <option value="newest">الأحدث أولاً ↓</option>
            <option value="oldest">الأقدم أولاً ↑</option>
          </select>
          <button class="btn btn-secondary btn-sm" onclick="exportEmployeesCSV()">📥 Excel</button>
        </div>

        <!-- Card View (default) -->
        <div id="emp-cards-view">
          <div id="emp-cards-grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,270px),1fr));gap:var(--sp-4);">
            <!-- Empty State -->
            <div id="emp-empty-card" style="grid-column:1/-1;">
              <div class="empty-state">
                <div class="empty-icon">👥</div>
                <div class="empty-title">لا يوجد موظفون بعد</div>
                <div class="empty-desc">ابدأ بإضافة أول موظف للشركة</div>
                <button class="btn btn-primary" style="margin-top:var(--sp-4);" onclick="openModal('new-employee-modal')">+ إضافة موظف</button>
              </div>
            </div>
          </div>
        </div>

        <!-- Table View (hidden by default) -->
        <div id="emp-table-view" style="display:none;">
          <div class="table-wrap">
            <table class="table" id="employees-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>الموظف</th>
                  <th>المسمى الوظيفي</th>
                  <th>القسم</th>
                  <th>تاريخ التعيين</th>
                  <th>الراتب</th>
                  <th>نوع العقد</th>
                  <th>الحالة</th>
                  <th>إجراءات</th>
                </tr>
              </thead>
              <tbody id="employees-body">
                <tr><td colspan="9" style="text-align:center;padding:var(--sp-10);color:var(--text-muted);">لا يوجد موظفون</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Tab: Attendance -->
      <div id="hr-tab-attendance" style="display:none;">
        <div style="background:var(--surface);border-radius:var(--r-xl);border:1px dashed var(--border);padding:var(--sp-6);margin-bottom:var(--sp-5);">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--sp-4);">
            <div style="font-weight:700;font-size:var(--text-lg);">📅 سجل حضور اليوم</div>
            <span style="font-size:var(--text-sm);color:var(--text-muted);">${new Date().toLocaleDateString('ar-SY',{weekday:'long',year:'numeric',month:'long',day:'numeric'})}</span>
          </div>
          <div id="att-list">
            <div class="empty-state"><div class="empty-icon">📋</div><div class="empty-title">أضف موظفين أولاً لتتبع الحضور</div></div>
          </div>
        </div>
      </div>

      <!-- Tab: Leaves -->
      <div id="hr-tab-leaves" style="display:none;">
        <div style="display:flex;justify-content:flex-end;gap:var(--sp-2);margin-bottom:var(--sp-4);">
          ${window._sortSelectHTML('leaves-body')}
          <button class="btn btn-primary btn-sm" onclick="openModal('new-leave-modal')">+ طلب إجازة</button>
        </div>
        <div class="table-wrap">
          <table class="table">
            <thead><tr><th>الموظف</th><th>نوع الإجازة</th><th>من</th><th>إلى</th><th>الأيام</th><th>السبب</th><th>الحالة</th><th>إجراءات</th></tr></thead>
            <tbody id="leaves-body">
              <tr><td colspan="8" style="text-align:center;padding:var(--sp-10);color:var(--text-muted);">
                <div style="font-size:2rem;">🏖️</div>
                <div style="font-weight:700;margin-top:var(--sp-2);">لا توجد طلبات إجازة</div>
              </td></tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Tab: Payroll -->
      <div id="hr-tab-payroll" style="display:none;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--sp-4);">
          <div style="font-weight:700;">كشف رواتب شهر: <span style="color:var(--primary);">${new Date().toLocaleDateString('ar-SY',{month:'long',year:'numeric'})}</span></div>
          <button class="btn btn-primary btn-sm" onclick="printPayroll()">🖨️ طباعة الكشف</button>
        </div>
        <div class="table-wrap">
          <table class="table">
            <thead>
              <tr><th>#</th><th>الموظف</th><th>الراتب الأساسي</th><th>البدلات</th><th>الخصومات</th><th>صافي الراتب</th><th>الحالة</th><th>إجراءات</th></tr>
            </thead>
            <tbody id="payroll-body">
              <tr><td colspan="8" style="text-align:center;padding:var(--sp-10);color:var(--text-muted);">
                <div style="font-size:2rem;">💰</div>
                <div style="font-weight:700;margin-top:var(--sp-2);">أضف موظفين لبدء كشف الرواتب</div>
              </td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- New Employee Modal -->
    <div class="modal-overlay" id="new-employee-modal">
      <div class="modal modal-lg">
        <div class="modal-header">
          <h3 class="modal-title">👤 إضافة موظف جديد</h3>
          <button class="modal-close" onclick="closeModal('new-employee-modal')">✕</button>
        </div>
        <div class="modal-body">
          <!-- Avatar Color Picker -->
          <div style="display:flex;align-items:center;gap:var(--sp-4);padding:var(--sp-4);background:var(--surface-2);border-radius:var(--r-lg);margin-bottom:var(--sp-5);">
            <div id="emp-avatar-preview" style="width:60px;height:60px;border-radius:50%;background:var(--primary);display:flex;align-items:center;justify-content:center;font-size:1.5rem;font-weight:800;color:#fff;">م</div>
            <div>
              <div style="font-size:var(--text-sm);font-weight:600;margin-bottom:var(--sp-2);">لون الصورة الرمزية</div>
              <div style="display:flex;gap:var(--sp-2);">
                ${['#3b82f6','#8b5cf6','#10b981','#f59e0b','#ef4444','#ec4899','#06b6d4','#84cc16'].map(c =>
                  `<div onclick="setEmpColor('${c}')" style="width:22px;height:22px;border-radius:50%;background:${c};cursor:pointer;border:2px solid transparent;" data-color="${c}"></div>`
                ).join('')}
              </div>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">الاسم الكامل <span style="color:var(--danger);">*</span></label>
              <input type="text" class="form-input" id="emp-name" placeholder="اسم الموظف" oninput="updateEmpPreview(this.value)" />
            </div>
            <div class="form-group">
              <label class="form-label">رقم الهاتف</label>
              <input type="tel" class="form-input" id="emp-phone" placeholder="+963 9x xxx xxxx" />
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">المسمى الوظيفي <span style="color:var(--danger);">*</span></label>
              <input type="text" class="form-input" id="emp-title" placeholder="مثال: مدير مبيعات" />
            </div>
            <div class="form-group">
              <label class="form-label">القسم</label>
              <select class="form-input" id="emp-dept">
                <option>المبيعات</option><option>المحاسبة</option><option>التسويق</option>
                <option>الموظفون</option><option>المستودع</option><option>الإدارة</option>
              </select>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">تاريخ التعيين <span style="color:var(--danger);">*</span></label>
              <input type="date" class="form-input" id="emp-hire-date" />
            </div>
            <div class="form-group">
              <label class="form-label">الراتب الأساسي</label>
              <div style="display:flex;gap:var(--sp-2);">
                <input type="number" class="form-input" id="emp-salary" placeholder="0" style="flex:1;" />
                <select class="form-input" id="emp-salary-currency" style="max-width:120px;">
                  <option value="SYP">ليرة سورية (ل.س)</option>
                  <option value="USD">دولار ($)</option>
                  <option value="TRY">ليرة تركية (₺)</option>
                </select>
              </div>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">البريد الإلكتروني</label>
              <input type="email" class="form-input" id="emp-email" placeholder="employee@company.com" />
            </div>
            <div class="form-group">
              <label class="form-label">نوع العقد</label>
              <select class="form-input" id="emp-contract">
                <option>دوام كامل</option><option>دوام جزئي</option><option>عقد مؤقت</option><option>موسمي</option>
              </select>
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">ملاحظات</label>
            <textarea class="form-input" id="emp-notes" rows="2" placeholder="أي معلومات إضافية..." style="resize:vertical;"></textarea>
          </div>

          <!-- POS / Cashier login credentials -->
          <div style="margin-top:var(--sp-4);padding:var(--sp-4);border:1px dashed var(--border);border-radius:var(--r-lg);background:var(--surface-2);">
            <div style="display:flex;align-items:center;gap:var(--sp-2);font-weight:700;margin-bottom:var(--sp-3);">
              <span>🏪</span><span>بيانات الدخول لصفحة الكاشير (نقطة البيع)</span>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">اسم المستخدم <span style="color:var(--danger);">*</span></label>
                <input type="text" class="form-input" id="emp-username" placeholder="مثال: ahmad" autocomplete="off" dir="ltr" style="text-align:left;" />
              </div>
              <div class="form-group">
                <label class="form-label">كلمة المرور <span style="color:var(--danger);">*</span></label>
                <input type="text" class="form-input" id="emp-password" placeholder="كلمة مرور للكاشير" autocomplete="off" dir="ltr" style="text-align:left;" />
              </div>
            </div>
            <div class="form-group" style="margin-bottom:0;">
              <label class="form-label">صلاحية الكاشير</label>
              <select class="form-input" id="emp-role">
                <option value="cashier">كاشير — بيع فقط</option>
                <option value="supervisor">مشرف — بيع + تقارير الجلسة</option>
              </select>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-ghost" onclick="closeModal('new-employee-modal')">إلغاء</button>
          <button class="btn btn-primary" onclick="saveEmployee()">💾 حفظ الموظف</button>
        </div>
      </div>
    </div>

    <!-- Employee Profile / Stats Modal -->
    <div class="modal-overlay" id="emp-stats-modal">
      <div class="modal modal-lg">
        <div class="modal-header">
          <h3 class="modal-title" id="emp-stats-title">ملف الموظف</h3>
          <button class="modal-close" onclick="closeModal('emp-stats-modal')">✕</button>
        </div>
        <div class="modal-body" id="emp-stats-body" style="padding:var(--sp-5);"></div>
        <div class="modal-footer">
          <button class="btn btn-secondary" onclick="closeModal('emp-stats-modal')">إغلاق</button>
        </div>
      </div>
    </div>

    <!-- Leave Request Modal -->
    <div class="modal-overlay" id="new-leave-modal">
      <div class="modal">
        <div class="modal-header">
          <h3 class="modal-title">🏖️ طلب إجازة</h3>
          <button class="modal-close" onclick="closeModal('new-leave-modal')">✕</button>
        </div>
        <div class="modal-body">
          <div class="form-group"><label class="form-label">الموظف *</label>
            <select class="form-input" id="leave-emp">
              <option value="">— اختر الموظف —</option>
            </select>
          </div>
          <div class="form-row">
            <div class="form-group"><label class="form-label">نوع الإجازة</label>
              <select class="form-input" id="leave-type" onchange="onLeaveTypeChange(this.value)"><option>سنوية</option><option>مرضية</option><option>طارئة</option><option>أمومة/أبوة</option><option>بدون راتب</option></select>
            </div>
            <div class="form-group"><label class="form-label">احتساب الراتب</label>
              <select class="form-input" id="leave-paid">
                <option value="paid">مدفوعة (بدون خصم)</option>
                <option value="unpaid">بدون راتب (تُخصم)</option>
              </select>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group"><label class="form-label">من *</label><input type="date" class="form-input" id="leave-from" /></div>
            <div class="form-group"><label class="form-label">إلى *</label><input type="date" class="form-input" id="leave-to" /></div>
          </div>
          <div class="form-group"><label class="form-label">السبب</label><textarea class="form-input" id="leave-reason" rows="2" placeholder="سبب الإجازة..."></textarea></div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-ghost" onclick="closeModal('new-leave-modal')">إلغاء</button>
          <button class="btn btn-primary" onclick="saveLeave()">💾 حفظ الطلب</button>
        </div>
      </div>
    </div>
    `;
  }

  async function renderOperations() {
    const today = new Date().toISOString().slice(0,10);
    const orders = window._workOrders || [];
    const activeOrders  = orders.filter(o => o.status === 'active').length;
    const todayBookings = orders.filter(o => o.type === 'booking' && o.date === today).length;
    const rentedUnits   = orders.filter(o => o.type === 'rental'  && o.status === 'active').length;
    const todayHours    = orders.filter(o => o.date === today).reduce((s,o) => s + (Number(o.hours)||0), 0);

    const rows = orders.length
      ? orders.map(o => `
          <tr data-ts="${window._dateToTs(o.date || o.createdAt)}">
            <td style="font-weight:700;">${o.id}</td>
            <td>${{work:'أمر عمل',booking:'حجز',rental:'إيجار'}[o.type]||o.type}</td>
            <td>${o.title||'—'}</td>
            <td>${o.date||'—'}</td>
            <td>${o.hours ? o.hours+' ساعة' : '—'}</td>
            <td><span class="badge badge-${o.status==='active'?'success':'gray'}">${o.status==='active'?'نشط':'مغلق'}</span></td>
            <td>
              <button class="btn btn-ghost btn-sm" onclick="closeWorkOrder('${o.id}')">✓ إغلاق</button>
              <button class="btn btn-ghost btn-sm" style="color:var(--danger);" onclick="deleteWorkOrder('${o.id}')">🗑️</button>
            </td>
          </tr>`).join('')
      : `<tr><td colspan="7" style="text-align:center;padding:48px;color:var(--text-muted);">لا توجد عمليات مسجّلة بعد</td></tr>`;

    return `
    <div class="module-wrap">
      <div class="module-header">
        <div><h1 class="module-title">العمليات 🔧</h1><p class="module-subtitle">أوامر العمل، الإيجار، الحجوزات وتتبع الوقت</p></div>
        <button class="btn btn-primary" onclick="openWorkOrderModal()">+ إضافة جديد</button>
      </div>

      <div class="kpi-grid" style="margin-bottom:var(--sp-5);">
        <div class="kpi-card"><div class="kpi-icon kpi-icon-blue">🔧</div><div class="kpi-info"><div class="kpi-label">أوامر عمل نشطة</div><div class="kpi-value" style="font-size:var(--text-2xl);">${activeOrders}</div></div></div>
        <div class="kpi-card"><div class="kpi-icon kpi-icon-green">📅</div><div class="kpi-info"><div class="kpi-label">حجوزات اليوم</div><div class="kpi-value" style="font-size:var(--text-2xl);">${todayBookings}</div></div></div>
        <div class="kpi-card"><div class="kpi-icon kpi-icon-amber">🏠</div><div class="kpi-info"><div class="kpi-label">وحدات مؤجرة</div><div class="kpi-value" style="font-size:var(--text-2xl);">${rentedUnits}</div></div></div>
        <div class="kpi-card"><div class="kpi-icon kpi-icon-red">⏱️</div><div class="kpi-info"><div class="kpi-label">ساعات عمل (اليوم)</div><div class="kpi-value" style="font-size:var(--text-2xl);">${todayHours} ساعة</div></div></div>
      </div>

      <div class="module-toolbar">
        <div class="search-wrap" style="flex:1;max-width:340px;">
          <input class="search-input" type="text" placeholder="بحث..." oninput="filterWorkOrders(this.value)" />
          <span class="search-icon">🔍</span>
        </div>
        <select class="form-select" style="width:auto;height:38px;" onchange="filterWorkOrderType(this.value)">
          <option value="">الكل</option>
          <option value="work">أوامر عمل</option>
          <option value="booking">حجوزات</option>
          <option value="rental">إيجار</option>
        </select>
        ${window._sortSelectHTML('work-orders-body')}
      </div>

      <div class="card" style="padding:0;overflow:hidden;margin-top:var(--sp-4);">
        <table class="table" id="work-orders-table">
          <thead><tr>
            <th>رقم</th><th>النوع</th><th>العنوان</th><th>التاريخ</th><th>الساعات</th><th>الحالة</th><th>إجراءات</th>
          </tr></thead>
          <tbody id="work-orders-body">${rows}</tbody>
        </table>
      </div>
    </div>

    <!-- Work Order Modal -->
    <div class="modal-overlay" id="work-order-modal">
      <div class="modal" style="max-width:460px;">
        <div class="modal-header">
          <h3 class="modal-title">إضافة عملية جديدة</h3>
          <button class="modal-close" onclick="closeModal('work-order-modal')">✕</button>
        </div>
        <div class="modal-body" style="display:flex;flex-direction:column;gap:var(--sp-4);">
          <div class="form-group">
            <label class="form-label">النوع <span style="color:var(--danger)">*</span></label>
            <select class="form-select" id="wo-type">
              <option value="work">أمر عمل</option>
              <option value="booking">حجز</option>
              <option value="rental">إيجار</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">العنوان / الوصف <span style="color:var(--danger)">*</span></label>
            <input class="form-input" type="text" id="wo-title" placeholder="وصف العملية" />
          </div>
          <div class="form-group">
            <label class="form-label">التاريخ</label>
            <input class="form-input" type="date" id="wo-date" />
          </div>
          <div class="form-group">
            <label class="form-label">عدد الساعات</label>
            <input class="form-input" type="number" id="wo-hours" min="0" step="0.5" placeholder="0" />
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" onclick="closeModal('work-order-modal')">إلغاء</button>
          <button class="btn btn-primary" onclick="saveWorkOrder()">حفظ</button>
        </div>
      </div>
    </div>
    `;
  }

  window.openWorkOrderModal = function() {
    const today = new Date().toISOString().slice(0,10);
    const d = document.getElementById('wo-date');
    if (d) d.value = today;
    openModal('work-order-modal');
  };

  window.saveWorkOrder = function() {
    const type  = document.getElementById('wo-type')?.value  || 'work';
    const title = document.getElementById('wo-title')?.value.trim();
    const date  = document.getElementById('wo-date')?.value  || new Date().toISOString().slice(0,10);
    const hours = document.getElementById('wo-hours')?.value || 0;
    if (!title) { showToast('warning','يرجى إدخال عنوان العملية'); return; }
    const order = { id:'WO-'+Date.now().toString().slice(-6), type, title, date, hours: Number(hours)||0, status:'active' };
    window._workOrders.unshift(order);
    window._saveData();
    closeModal('work-order-modal');
    navigate('operations');
    showToast('success','تمت إضافة العملية');
  };

  window.closeWorkOrder = function(id) {
    const o = (window._workOrders||[]).find(x => x.id===id);
    if (!o) return;
    o.status = 'closed';
    window._saveData();
    navigate('operations');
    showToast('success','تم إغلاق العملية');
  };

  window.deleteWorkOrder = function(id) {
    window._workOrders = (window._workOrders||[]).filter(x => x.id!==id);
    window._saveData();
    navigate('operations');
    showToast('success','تم الحذف');
  };

  window.filterWorkOrders = function(q) {
    q = q.toLowerCase();
    document.querySelectorAll('#work-orders-body tr').forEach(tr => {
      tr.style.display = tr.textContent.toLowerCase().includes(q) ? '' : 'none';
    });
  };

  window.filterWorkOrderType = function(type) {
    const typeMap = { work:'أمر عمل', booking:'حجز', rental:'إيجار' };
    document.querySelectorAll('#work-orders-body tr').forEach(tr => {
      if (!type) { tr.style.display=''; return; }
      tr.style.display = tr.cells[1]?.textContent === (typeMap[type]||type) ? '' : 'none';
    });
  };

  async function renderReports() {
    const reports = [
      { icon:'💰', name:'تقرير الأرباح والخسائر', desc:'ملخص الإيرادات والمصروفات والأرباح', color:'green',  key:'pl' },
      { icon:'📊', name:'تقرير المبيعات',          desc:'تفصيل المبيعات حسب الفترة والعميل والمنتج', color:'blue',  key:'sales' },
      { icon:'📦', name:'تقرير المخزون',           desc:'حركات المخزون والقيمة الإجمالية',         color:'amber', key:'inventory' },
      { icon:'👥', name:'تقرير العملاء',           desc:'أداء العملاء ونشاطهم الشرائي',             color:'violet',key:'crm' },
      { icon:'👨‍💼', name:'تقرير الموظفين',          desc:'الحضور والإجازات وكشف الرواتب',           color:'red',   key:'hr' },
      { icon:'🏭', name:'تقرير الموردين',          desc:'المشتريات والمدفوعات لكل مورد',             color:'blue',  key:'suppliers' },
      { icon:'💳', name:'تقرير التدفق النقدي',     desc:'المقبوضات والمدفوعات النقدية',             color:'green', key:'cashflow' },
      { icon:'🏦', name:'الميزانية العمومية',      desc:'الأصول والخصوم وحقوق الملكية',             color:'amber', key:'balance' },
      { icon:'📋', name:'سجل العمليات',            desc:'تتبع جميع الأنشطة في النظام',              color:'gray',  key:'audit' },
    ];
    return `
    <div class="module-wrap">
      <div class="module-header">
        <div>
          <h1 class="module-title">التقارير 📈</h1>
          <p class="module-subtitle">تقارير مالية وتشغيلية — انقر على أي تقرير لتصديره PDF</p>
        </div>
      </div>

      <!-- Date range filter -->
      <div style="margin-bottom:var(--sp-5);display:flex;flex-direction:column;gap:var(--sp-3);">
        <div style="display:flex;flex-wrap:wrap;gap:var(--sp-2);">
          <button class="btn btn-sm btn-secondary rpt-range-btn" data-range="today"     onclick="setReportRange('today')">اليوم</button>
          <button class="btn btn-sm btn-secondary rpt-range-btn" data-range="yesterday" onclick="setReportRange('yesterday')">أمس</button>
          <button class="btn btn-sm btn-secondary rpt-range-btn" data-range="week"      onclick="setReportRange('week')">هذا الأسبوع</button>
          <button class="btn btn-sm btn-secondary rpt-range-btn" data-range="month"    onclick="setReportRange('month')">هذا الشهر</button>
          <button class="btn btn-sm btn-secondary rpt-range-btn" data-range="lastyear" onclick="setReportRange('lastyear')">السنة الماضية</button>
          <button class="btn btn-sm btn-secondary rpt-range-btn" data-range="all"      onclick="setReportRange('all')">كامل</button>
        </div>
        <div style="display:flex;align-items:center;flex-wrap:wrap;gap:var(--sp-3);">
          <label class="form-label" style="margin:0;white-space:nowrap;">من:</label>
          <input type="date" class="form-input" id="rpt-from" style="width:auto;height:38px;" oninput="clearRangeActive()" />
          <label class="form-label" style="margin:0;white-space:nowrap;">إلى:</label>
          <input type="date" class="form-input" id="rpt-to"   style="width:auto;height:38px;" oninput="clearRangeActive()" />
        </div>
      </div>

      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,260px),1fr));gap:var(--sp-5);">
        ${reports.map(r => `
          <div class="card card-hover cursor-pointer" style="padding:var(--sp-5);transition:transform 0.15s;" onclick="generateReport('${r.key}','${r.name}')"
               onmouseover="this.style.transform='translateY(-4px)'" onmouseout="this.style.transform=''">
            <div class="kpi-icon kpi-icon-${r.color}" style="margin-bottom:var(--sp-4);font-size:2rem;">${r.icon}</div>
            <h3 style="font-weight:700;margin-bottom:var(--sp-2);">${r.name}</h3>
            <p style="font-size:var(--text-sm);color:var(--text-muted);margin-bottom:var(--sp-4);">${r.desc}</p>
            <div style="display:flex;align-items:center;gap:var(--sp-2);font-size:var(--text-xs);color:var(--primary);font-weight:600;">
              <span>🖨️</span><span>انقر لتصدير PDF</span>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
    `;
  }

  const CASHIER_CUR_OPTIONS = [
    { code:'SYP', icon:'🇸🇾', label:'سورية',  sym:'ل.س' },
    { code:'USD', icon:'💵', label:'أمريكي',  sym:'$'   },
    { code:'TRY', icon:'🇹🇷', label:'تركية',  sym:'₺'   },
  ];
  function _cashierCurCardsHTML(selected) {
    return CASHIER_CUR_OPTIONS.map(c => {
      const isSel = selected === c.code;
      return `
      <div class="card card-hover" data-cur="${c.code}" onclick="pickCashierCurrency('${c.code}')"
        style="padding:var(--sp-3) var(--sp-2);text-align:center;cursor:pointer;position:relative;user-select:none;
               border:2px solid ${isSel?'var(--primary)':'var(--border)'};
               background:${isSel?'var(--primary-light)':'var(--surface)'};
               transition:all var(--tr-fast,.15s);">
        ${isSel ? '<span style="position:absolute;top:4px;left:6px;font-size:13px;">✅</span>' : ''}
        <div style="font-size:1.6rem;line-height:1;margin-bottom:4px;">${c.icon}</div>
        <div style="font-weight:700;font-size:var(--text-sm);${isSel?'color:var(--primary);':''}">${c.label}</div>
        <div style="font-size:var(--text-xs);color:var(--text-muted);margin-top:2px;">${c.sym}</div>
      </div>`;
    }).join('');
  }
  window.pickCashierCurrency = function(code) {
    const hidden = document.getElementById('s-cashier-currency');
    if (hidden) hidden.value = code;
    const picker = document.getElementById('cashier-cur-picker');
    if (picker) picker.innerHTML = _cashierCurCardsHTML(code);
    if (typeof window.toggleCashierTryRate === 'function') window.toggleCashierTryRate(code);
  };

  async function renderSettings() {
    const sections = ['معلومات الشركة','الإعدادات المالية','قوالب الطباعة','النسخ الاحتياطي','الأمان والجلسة','المظهر 🎨'];
    const _s = window._appSettings || {};
    const _companyName    = _s.companyName    || '';
    const _regNo          = _s.regNo          || '';
    const _phone          = _s.phone          || '';
    const _email          = _s.email          || '';
    const _address        = _s.address        || '';
    const _minStockAlert  = _s.minStockAlert  != null ? _s.minStockAlert  : 5;
    const _posDiscount    = _s.posDiscount    != null ? _s.posDiscount    : 0;
    const _invoiceNote    = _s.invoiceNote    || 'شكراً لتعاملكم معنا. البضاعة المباعة لا تُرد إلا خلال 7 أيام من تاريخ الشراء.';
    const _cashierCur     = _s.cashierCurrency || 'SYP';
    const _sessionTimeout = parseInt(_s.sessionTimeout) || 0;
    const hasPinSet       = !!localStorage.getItem('a3mali_pin_' + _acctKey());
    const _lastBackupTs   = _s._lastBackupAt ? new Date(_s._lastBackupAt).toLocaleString('en-US') : 'لم يتم بعد';
    const _tplDefs = [
      { key:'invoice',   name:'الفاتورة الرئيسية', icon:'🧾' },
      { key:'receipt',   name:'إيصال الكاشير',      icon:'🖨️' },
      { key:'po',        name:'طلب الشراء',         icon:'📦' },
      { key:'packing',   name:'قائمة التعبئة',      icon:'📋' },
      { key:'statement', name:'كشف حساب العميل',    icon:'📊' },
      { key:'stockrpt',  name:'تقرير المخزون',      icon:'🗂️' },
    ];
    return `
    <div class="module-wrap">
      <div class="module-header">
        <div>
          <h1 class="module-title">الإعدادات ⚙️</h1>
          <p class="module-subtitle">إعدادات الشركة والتفضيلات</p>
        </div>
      </div>

      <div style="display:grid;grid-template-columns:clamp(140px,20%,220px) 1fr;gap:var(--sp-6);align-items:start;">
        <!-- Settings Sidebar -->
        <div style="display:flex;flex-direction:column;gap:var(--sp-1);">
          ${sections.map((s,i) => `
            <button class="sidebar-item ${i===0?'active':''}" id="stab-${i}"
              style="border-radius:var(--r);text-align:right;justify-content:flex-start;padding:var(--sp-3) var(--sp-4);"
              onclick="settingsTab(${i})">${s}</button>
          `).join('')}
        </div>

        <!-- Settings Panels -->
        <div>

          <!-- Panel 0: Company Info -->
          <div id="spanel-0" class="card">
            <div class="card-header"><h3 style="font-weight:700;">معلومات الشركة</h3></div>
            <div class="card-body" style="display:flex;flex-direction:column;gap:var(--sp-4);">
              <div class="form-row">
                <div class="form-group"><label class="form-label">اسم الشركة / المحل <span>*</span></label><input type="text" class="form-input" id="s-company-name" value="${_companyName}" placeholder="اسم الشركة أو المحل" /></div>
                <div class="form-group"><label class="form-label">رقم السجل التجاري</label><input type="text" class="form-input" id="s-reg" value="${_regNo}" placeholder="1234567890" /></div>
                <div class="form-group"><label class="form-label">هاتف الشركة</label><input type="tel" class="form-input" id="s-phone" value="${_phone}" placeholder="+963 11 234 5678" /></div>
              </div>
              <div class="form-row">
                <div class="form-group"><label class="form-label">البريد الإلكتروني</label><input type="email" class="form-input" id="s-email" value="${_email}" placeholder="info@company.com" /></div>
                <div class="form-group"><label class="form-label">العنوان / موقع المحل</label><input type="text" class="form-input" id="s-address" value="${_address}" placeholder="دمشق، سوريا" /></div>
              </div>
              <div class="form-group" style="max-width:280px;"><label class="form-label">حد المخزون الأدنى للتنبيه</label>
                <input type="number" class="form-input" id="s-min-stock" value="${_minStockAlert}" min="0" placeholder="5" />
                <div style="font-size:var(--text-xs);color:var(--text-muted);margin-top:4px;">سيظهر تنبيه عندما تصل كمية أي منتج لهذا الرقم أو أقل</div>
              </div>
            </div>
            <div class="card-footer" style="display:flex;justify-content:flex-end;gap:var(--sp-3);">
              <button class="btn btn-secondary" onclick="window.navigate('settings')">إعادة التعيين</button>
              <button class="btn btn-primary" onclick="saveCompanySettings()">حفظ التغييرات</button>
            </div>
          </div>

          <!-- Panel 1: Financial Settings -->
          <div id="spanel-2" class="card" style="display:none;">
            <div class="card-header"><h3 style="font-weight:700;">الإعدادات المالية</h3></div>
            <div class="card-body" style="display:flex;flex-direction:column;gap:var(--sp-4);">
              <div class="form-group">
                <label class="form-label">نسبة خصم POS / عمولة البطاقة (%)</label>
                <input type="number" class="form-input" id="s-pos-discount" value="${_posDiscount}" min="0" max="100" step="0.1" placeholder="0" style="max-width:240px;" />
                <div style="font-size:var(--text-xs);color:var(--text-muted);margin-top:4px;">0 = لا خصم — 5 = خصم 5% تلقائياً عند اختيار POS</div>
              </div>
              <div class="form-group">
                <label class="form-label">عملة عرض الكاشير</label>
                <div id="cashier-cur-picker" style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:var(--sp-3);max-width:480px;">
                  ${_cashierCurCardsHTML(_cashierCur)}
                </div>
                <input type="hidden" id="s-cashier-currency" value="${_cashierCur}" />
                <div style="font-size:var(--text-xs);color:var(--text-muted);margin-top:8px;">👆 اضغط على العملة لاختيارها — هي ما يظهر للموظف في شاشة الكاشير</div>
              </div>
              <div class="form-group" id="s-cashier-try-rate-wrap" style="display:${_cashierCur === 'TRY' ? '' : 'none'};">
                <label class="form-label">سعر الصرف للكاشير — 1 دولار = ؟ ليرة تركية</label>
                <div style="display:flex;gap:var(--sp-2);max-width:320px;">
                  <input type="number" class="form-input" id="s-cashier-try-rate" min="0" step="any"
                    placeholder="مثال: 32" value="${(_s.usdToTry || '')}" style="flex:1;" />
                  <button class="btn btn-secondary btn-sm" onclick="fetchAutoTryRate()" style="white-space:nowrap;">🔄 جلب</button>
                </div>
                <div style="font-size:var(--text-xs);color:var(--text-muted);margin-top:4px;">مطلوب لتحويل الأسعار بين الليرة التركية والدولار</div>
              </div>
              <div class="form-group"><label class="form-label">ملاحظات الفاتورة الافتراضية</label>
                <textarea class="form-input form-textarea" id="s-invoice-note" style="height:80px;">${_invoiceNote}</textarea>
              </div>
            </div>
            <div class="card-footer" style="display:flex;justify-content:flex-end;">
              <button class="btn btn-primary" onclick="saveFinancialSettings()">حفظ الإعدادات المالية</button>
            </div>
          </div>

          <!-- Panel 3: Print Templates (functional) -->
          <div id="spanel-3" class="card" style="display:none;">
            <div class="card-header"><h3 style="font-weight:700;">قوالب الطباعة</h3></div>
            <div class="card-body">
              <p style="color:var(--text-muted);font-size:var(--text-sm);margin-bottom:var(--sp-4);">انقر على أي قالب لتعديل محتواه — يُحفظ تلقائياً في النظام والسحابة.</p>
              <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,180px),1fr));gap:var(--sp-4);">
                ${_tplDefs.map(t => {
                  const hasCustom = !!(window._printTemplates && window._printTemplates[t.key]);
                  return `<div class="card card-hover" style="padding:var(--sp-4);cursor:pointer;text-align:center;position:relative;" onclick="openTemplateEditor('${t.key}','${t.name}')">
                    ${hasCustom ? '<span style="position:absolute;top:8px;right:8px;font-size:10px;background:#d1fae5;color:#065f46;padding:2px 6px;border-radius:20px;">مخصص</span>' : ''}
                    <div style="font-size:2.5rem;margin-bottom:var(--sp-3);">${t.icon}</div>
                    <div style="font-weight:700;font-size:var(--text-sm);">${t.name}</div>
                    <div style="font-size:var(--text-xs);color:var(--text-muted);margin-top:4px;">${hasCustom?'معدّل — انقر للتعديل':'انقر للتعديل'}</div>
                  </div>`;
                }).join('')}
              </div>
            </div>
          </div>

          <!-- Panel 4: Backup (auto + manual export only) -->
          <div id="spanel-4" class="card" style="display:none;">
            <div class="card-header"><h3 style="font-weight:700;">النسخ الاحتياطي</h3></div>
            <div class="card-body" style="display:flex;flex-direction:column;gap:var(--sp-5);">
              <div style="padding:var(--sp-5);background:var(--surface-2);border-radius:var(--r-lg);border:1px solid var(--border);display:flex;align-items:flex-start;gap:var(--sp-4);">
                <div style="font-size:2rem;flex-shrink:0;">☁️</div>
                <div>
                  <h4 style="font-weight:700;margin-bottom:var(--sp-1);">النسخ الاحتياطي التلقائي</h4>
                  <p style="color:var(--text-muted);font-size:var(--text-sm);margin-bottom:var(--sp-2);">كل بياناتك تُحفظ تلقائياً على Firebase عند كل دخول للنظام.</p>
                  <div style="font-size:var(--text-xs);color:var(--text-muted);">آخر نسخة: <strong>${_lastBackupTs}</strong></div>
                </div>
              </div>
              <div style="padding:var(--sp-5);background:var(--surface-2);border-radius:var(--r-lg);border:1px solid var(--border);">
                <h4 style="font-weight:700;margin-bottom:var(--sp-2);">📤 تصدير يدوي</h4>
                <p style="color:var(--text-muted);font-size:var(--text-sm);margin-bottom:var(--sp-4);">تحميل نسخة كاملة من بياناتك كملف JSON</p>
                <button class="btn btn-secondary" onclick="exportDataJSON()">📥 تحميل نسخة JSON</button>
              </div>
              <div style="padding:var(--sp-5);background:#fef2f2;border-radius:var(--r-lg);border:1px solid #fecaca;">
                <h4 style="font-weight:700;margin-bottom:var(--sp-2);color:#b91c1c;">⚠️ منطقة الخطر</h4>
                <p style="color:var(--text-muted);font-size:var(--text-sm);margin-bottom:var(--sp-4);">حذف جميع بيانات النظام (الفواتير، العملاء، المنتجات، الموردين، المصاريف، الديون وغيرها) بشكل نهائي ولا يمكن التراجع عنه. يُفضّل تحميل نسخة JSON قبل المتابعة.</p>
                <button class="btn btn-danger" onclick="confirmClearAllData()">🗑️ مسح جميع البيانات</button>
              </div>
            </div>
          </div>

          <!-- Panel 5: Security & Session -->
          <div id="spanel-5" class="card" style="display:none;">
            <div class="card-header"><h3 style="font-weight:700;">الأمان والجلسة</h3></div>
            <div class="card-body" style="display:flex;flex-direction:column;gap:var(--sp-5);">

              <!-- Contact card to change PIN -->
              <div style="display:flex;align-items:flex-start;gap:var(--sp-4);padding:var(--sp-5);background:var(--surface-2);border-radius:var(--r-lg);border:1px solid var(--border);">
                <div style="font-size:36px;flex-shrink:0;">🔒</div>
                <div>
                  <div style="font-size:var(--text-base);font-weight:700;margin-bottom:4px;">رمز الدخول الشخصي (PIN)</div>
                  <div style="font-size:var(--text-sm);color:var(--text-muted);line-height:1.6;">
                    رمز الدخول مرتبط بحسابك ويُحدَّد عند التسجيل.<br/>
                    لتغيير الرمز، تواصل مع الشركة عبر قسم الدعم.
                  </div>
                  <a href="https://wa.me/905523223191?text=مرحباً، أريد تغيير رمز الدخول (PIN) الخاص بحسابي" target="_blank" style="display:inline-flex;align-items:center;gap:6px;margin-top:var(--sp-3);padding:8px 18px;background:#25D366;color:#fff;border-radius:var(--r);font-size:var(--text-sm);font-weight:600;text-decoration:none;">
                    💬 تواصل معنا لتغيير الرمز
                  </a>
                </div>
              </div>

              <!-- Session timeout -->
              <div class="form-group">
                <label class="form-label">مدة انتهاء الجلسة (بالدقائق)</label>
                <input type="number" class="form-input" id="s-session-timeout" value="${_sessionTimeout}" min="0" max="480" placeholder="0 = لا تنتهي" style="max-width:200px;" />
                <div style="font-size:var(--text-xs);color:var(--text-muted);margin-top:4px;">0 = لا تنتهي الجلسة تلقائياً — الحد الأقصى 480 دقيقة</div>
              </div>
            </div>
            <div class="card-footer" style="display:flex;justify-content:flex-end;">
              <button class="btn btn-primary" onclick="savePinSettings()">حفظ إعدادات الجلسة</button>
            </div>
          </div>

          <!-- Panel 6: Appearance / Theme -->
          <div id="spanel-6" class="card" style="display:none;">
            <div class="card-header"><h3 style="font-weight:700;">المظهر والثيم 🎨</h3></div>
            <div class="card-body">
              <p style="color:var(--text-muted);font-size:var(--text-sm);margin-bottom:var(--sp-4);">اختر مظهر النظام — يُطبَّق فوراً على لوحة التحكم، ويظهر تلقائياً على شاشة الكاشير عند فتحها.</p>
              <div id="theme-picker" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,150px),1fr));gap:var(--sp-4);">
                ${_themePickerHTML()}
              </div>
            </div>
          </div>

        </div><!-- end panels -->
      </div>
    </div>

    <!-- Template Editor Modal -->
    <div class="modal-overlay" id="template-editor-modal">
      <div class="modal modal-lg" style="max-width:720px;">
        <div class="modal-header">
          <h3 class="modal-title" id="tpl-modal-title">تعديل القالب</h3>
          <button class="modal-close" onclick="closeModal('template-editor-modal')">✕</button>
        </div>
        <div class="modal-body">
          <input type="hidden" id="tpl-key" />
          <p style="font-size:var(--text-sm);color:var(--text-muted);margin-bottom:var(--sp-4);">
            🔀 اسحب <strong>⠿</strong> لإعادة ترتيب الأقسام (أو استخدم الأسهم) — فعّل/عطّل أي قسم بالمفتاح، وعدّل نصه مباشرة. التغييرات تنعكس فوراً في المعاينة بالأسفل.
          </p>
          <div id="tpl-blocks-list" style="display:flex;flex-direction:column;gap:var(--sp-2);margin-bottom:var(--sp-3);"></div>
          <div style="display:flex;justify-content:flex-end;margin-bottom:var(--sp-4);">
            <button class="btn btn-ghost btn-sm" onclick="_tplResetDefault()">↺ استعادة الترتيب الافتراضي</button>
          </div>
          <div class="form-group">
            <label class="form-label">📄 معاينة القالب النهائي</label>
            <div id="tpl-preview" style="background:var(--surface-2);border:1px solid var(--border);border-radius:var(--r-lg);padding:var(--sp-4);font-family:monospace;font-size:12px;direction:ltr;text-align:left;white-space:pre-wrap;min-height:80px;color:var(--text-muted);"></div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" onclick="closeModal('template-editor-modal')">إلغاء</button>
          <button class="btn btn-primary" onclick="saveTemplate()">حفظ القالب</button>
        </div>
      </div>
    </div>
    `;
  }

  window.openNewCustomerModal = () => openModal('new-customer-modal');

  window.openNewInvoiceModal = function(mode) {
    const modal = document.getElementById('new-invoice-modal');
    if (modal) delete modal.dataset.editId;
    const titleEl = document.querySelector('#new-invoice-modal .modal-title');
    if (titleEl) titleEl.textContent = 'إنشاء فاتورة جديدة';
    const draftBtn   = document.getElementById('inv-save-draft-btn');
    const primaryBtn = document.getElementById('inv-save-primary-btn');
    if (draftBtn) draftBtn.style.display = '';
    if (primaryBtn) {
      primaryBtn.textContent = '✅ إصدار الفاتورة';
      primaryBtn.setAttribute('onclick', "saveInvoice('paid')");
    }
    openModal('new-invoice-modal');
    const today = new Date().toISOString().split('T')[0];
    const dateEl = document.getElementById('inv-date');
    if (dateEl) dateEl.value = today;
    const dl = document.getElementById('customers-datalist');
    if (dl) {
      dl.innerHTML = window._customers.map(c => `<option value="${c.name}">`).join('');
    }
    populateInvoiceRepSelect();
    calcInvoiceTotal();
  };

  window.populateInvoiceRepSelect = function(selected) {
    const sel = document.getElementById('inv-rep');
    if (!sel) return;
    const reps = window._salesReps || [];
    let html = '<option value="">— بدون مندوب —</option>';
    reps.forEach(r => {
      const name = r.name || '';
      const isSel = selected && String(selected).trim() === String(name).trim() ? ' selected' : '';
      html += `<option value="${name}"${isSel}>${name}</option>`;
    });
    if (selected && !reps.some(r => String(r.name).trim() === String(selected).trim())) {
      html += `<option value="${selected}" selected>${selected}</option>`;
    }
    sel.innerHTML = html;
  };

  window.saveCustomer = function() {
    const inputs = document.querySelectorAll('#new-customer-modal .form-input, #new-customer-modal .form-select, #new-customer-modal .form-textarea');
    const name    = inputs[0]?.value.trim();
    const phone   = inputs[1]?.value.trim();
    const email   = inputs[2]?.value.trim();
    const company = inputs[3]?.value.trim();
    const city    = inputs[4]?.value.trim();
    const type    = inputs[5]?.value || 'عميل عادي';
    const notes   = inputs[6]?.value.trim();
    if (!name || !phone) { showToast('warning','يرجى إدخال الاسم ورقم الهاتف على الأقل'); return; }

    const today = new Date().toLocaleDateString('ar-SY');
    const cust = { name, phone, email, company, city, type, notes, date: today };
    window._customers.push(cust);
    window._saveData();

    const tbody = document.getElementById('customers-body');
    if (tbody) tbody.innerHTML = generateCustomerRows();
    if (typeof window.init_crm === 'function') window.init_crm();

    const dl = document.getElementById('customers-datalist');
    if (dl) dl.innerHTML += `<option value="${name}">`;

    closeModal('new-customer-modal');
    inputs.forEach(i => { if (i.tagName !== 'SELECT') i.value = ''; });
    showToast('success', `تم إضافة العميل ${name} بنجاح ✓`);
  };

  window.settingsTab = function(index) {
    document.querySelectorAll('[id^="stab-"]').forEach((btn, i) => {
      btn.classList.toggle('active', i === index);
    });
    document.querySelectorAll('[id^="spanel-"]').forEach((panel, i) => {
      panel.style.display = i === index ? '' : 'none';
    });
  };

  window.saveCompanySettings = function() {
    const s = window._appSettings || {};
    s.companyName  = document.getElementById('s-company-name')?.value.trim() || s.companyName;
    s.regNo        = document.getElementById('s-reg')?.value.trim() || s.regNo;
    s.phone        = document.getElementById('s-phone')?.value.trim() || s.phone;
    s.email        = document.getElementById('s-email')?.value.trim() || s.email;
    s.address      = document.getElementById('s-address')?.value.trim() || s.address;
    s.minStockAlert = parseInt(document.getElementById('s-min-stock')?.value) || 5;
    window._appSettings = s;
    window._saveSettings();
    if (typeof window.refreshSidebarIdentity === 'function') window.refreshSidebarIdentity();
    showToast('success', 'تم حفظ معلومات الشركة بنجاح ✓');
  };

  window.refreshSidebarIdentity = function() {
    let u = {};
    try { u = JSON.parse(sessionStorage.getItem('a3mali_user') || '{}'); } catch(e) {}
    const shopName = (window._appSettings && window._appSettings.companyName) || u.name || u.email || 'متجري';
    const nameEl = document.getElementById('user-name');
    const roleEl = document.getElementById('user-role');
    const avEl   = document.getElementById('user-avatar');
    if (nameEl) nameEl.textContent = shopName;
    if (roleEl) roleEl.textContent = u.email || '—';
    if (avEl)   avEl.textContent   = (shopName || 'م').charAt(0);
  };

  window.toggleCashierTryRate = function(val) {
    const wrap = document.getElementById('s-cashier-try-rate-wrap');
    if (wrap) wrap.style.display = val === 'TRY' ? '' : 'none';
  };

  window.saveFinancialSettings = function() {
    const s = window._appSettings || {};
    s.posDiscount      = parseFloat(document.getElementById('s-pos-discount')?.value) || 0;
    s.cashierCurrency  = document.getElementById('s-cashier-currency')?.value || 'SYP';
    s.invoiceNote      = document.getElementById('s-invoice-note')?.value || '';
    const tryRate = parseFloat(document.getElementById('s-cashier-try-rate')?.value);
    if (tryRate > 0) s.usdToTry = tryRate;
    window._appSettings = s;
    window._saveSettings();
    showToast('success', 'تم حفظ الإعدادات المالية ✓');
  };

  const _TPL_BLOCK_DEFS = {
    invoice: [
      { id:'company',  icon:'🏢', label:'معلومات الشركة',      default:'{{companyName}}\n{{companyAddress}}' },
      { id:'meta',      icon:'🧾', label:'رقم وتاريخ الفاتورة', default:'فاتورة رقم: {{invoiceId}}\nالتاريخ: {{date}}' },
      { id:'customer',  icon:'👤', label:'بيانات العميل',       default:'العميل: {{customerName}}' },
      { id:'items',     icon:'📋', label:'جدول الأصناف',        default:'{{items}}' },
      { id:'total',     icon:'💰', label:'الإجمالي',            default:'الإجمالي: {{total}}' },
      { id:'note',      icon:'📝', label:'ملاحظات الفاتورة',     default:'{{invoiceNote}}' },
    ],
    receipt: [
      { id:'company', icon:'🏢', label:'اسم الشركة',         default:'{{companyName}}' },
      { id:'meta',     icon:'🧾', label:'رقم وتاريخ الإيصال',  default:'إيصال رقم: {{invoiceId}}\nالتاريخ: {{date}}' },
      { id:'items',    icon:'📋', label:'الأصناف',            default:'{{items}}' },
      { id:'total',    icon:'💰', label:'الإجمالي',           default:'الإجمالي: {{total}}' },
      { id:'footer',   icon:'🙏', label:'رسالة الختام',        default:'شكراً لزيارتكم' },
    ],
    po: [
      { id:'meta',     icon:'🧾', label:'رقم وتاريخ الطلب', default:'طلب شراء رقم: {{poId}}\nالتاريخ: {{date}}' },
      { id:'supplier', icon:'🏭', label:'المورد',          default:'المورد: {{supplierName}}' },
      { id:'items',    icon:'📋', label:'جدول الأصناف',     default:'{{items}}' },
      { id:'total',    icon:'💰', label:'الإجمالي',         default:'الإجمالي: {{total}}' },
    ],
    packing: [
      { id:'header', icon:'📦', label:'عنوان القائمة', default:'قائمة تعبئة' },
      { id:'meta',   icon:'🧾', label:'رقم الطلب',     default:'رقم الطلب: {{orderId}}' },
      { id:'items',  icon:'📋', label:'جدول الأصناف',   default:'{{items}}' },
    ],
    statement: [
      { id:'header',       icon:'👤', label:'بيانات العميل', default:'كشف حساب: {{customerName}}' },
      { id:'period',       icon:'📅', label:'الفترة',        default:'الفترة: {{from}} - {{to}}' },
      { id:'transactions', icon:'📋', label:'الحركات',       default:'{{transactions}}' },
      { id:'balance',      icon:'💰', label:'الرصيد',        default:'الرصيد: {{balance}}' },
    ],
    stockrpt: [
      { id:'header', icon:'🗂️', label:'عنوان التقرير', default:'تقرير المخزون' },
      { id:'meta',   icon:'📅', label:'التاريخ',        default:'التاريخ: {{date}}' },
      { id:'items',  icon:'📋', label:'جدول الأصناف',    default:'{{items}}' },
      { id:'total',  icon:'💰', label:'إجمالي القيمة',  default:'إجمالي القيمة: {{totalValue}}' },
    ],
  };
  function _tplDefaultBlocks(key) {
    return (_TPL_BLOCK_DEFS[key] || []).map(d => ({ id: d.id, content: d.default, hidden: false }));
  }
  function _tplBlockDef(key, id) {
    return (_TPL_BLOCK_DEFS[key] || []).find(d => d.id === id) || { icon:'📄', label:id };
  }
  function _tplEsc(s) {
    return String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  let _tplEditorState = null;
  let _tplDragIdx = null;

  window.openTemplateEditor = function(key, name) {
    const titleEl = document.getElementById('tpl-modal-title');
    const keyEl   = document.getElementById('tpl-key');
    if (titleEl) titleEl.textContent = 'تعديل: ' + name;
    if (keyEl) keyEl.value = key;
    const existing = (window._printTemplates || {})[key];
    _tplEditorState = {
      key,
      blocks: Array.isArray(existing)
        ? existing.map(b => ({ id: b.id, content: b.content || '', hidden: !!b.hidden }))
        : _tplDefaultBlocks(key),
    };
    _renderTplEditor();
    openModal('template-editor-modal');
  };

  function _renderTplEditor() {
    if (!_tplEditorState) return;
    const list = document.getElementById('tpl-blocks-list');
    if (list) {
      list.innerHTML = _tplEditorState.blocks.map((b, i) => {
        const def = _tplBlockDef(_tplEditorState.key, b.id);
        return `
        <div class="card" draggable="true" data-idx="${i}"
          ondragstart="_tplDragStart(event,${i})" ondragover="_tplDragOver(event)" ondrop="_tplDrop(event,${i})" ondragend="_tplDragEnd(event)"
          style="display:flex;align-items:flex-start;gap:var(--sp-3);padding:var(--sp-3);${b.hidden?'opacity:.5;':''}">
          <span style="cursor:grab;font-size:1.2rem;color:var(--text-muted);padding-top:6px;user-select:none;" title="اسحب لإعادة الترتيب">⠿</span>
          <div style="display:flex;flex-direction:column;gap:2px;padding-top:2px;">
            <button type="button" class="btn btn-ghost btn-sm" style="padding:1px 6px;line-height:1.2;" title="نقل للأعلى" onclick="_tplMove(${i},-1)" ${i===0?'disabled':''}>▲</button>
            <button type="button" class="btn btn-ghost btn-sm" style="padding:1px 6px;line-height:1.2;" title="نقل للأسفل" onclick="_tplMove(${i},1)" ${i===_tplEditorState.blocks.length-1?'disabled':''}>▼</button>
          </div>
          <span style="font-size:1.3rem;padding-top:2px;">${def.icon}</span>
          <div style="flex:1;min-width:0;">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px;">
              <span style="font-weight:700;font-size:var(--text-sm);">${def.label}</span>
              <label style="display:flex;align-items:center;gap:4px;font-size:var(--text-xs);color:var(--text-muted);cursor:pointer;">
                <input type="checkbox" ${b.hidden?'':'checked'} onchange="_tplToggleBlock(${i},this.checked)" /> إظهار
              </label>
            </div>
            <textarea class="form-input" oninput="_tplUpdateBlock(${i},this.value)" style="width:100%;min-height:50px;font-family:monospace;font-size:12px;direction:ltr;text-align:left;resize:vertical;">${_tplEsc(b.content)}</textarea>
          </div>
        </div>`;
      }).join('');
    }
    _renderTplPreview();
  }

  function _renderTplPreview() {
    const prev = document.getElementById('tpl-preview');
    if (!prev || !_tplEditorState) return;
    const text = _tplEditorState.blocks.filter(b => !b.hidden).map(b => b.content).join('\n\n');
    prev.textContent = text || '(لا يوجد محتوى ظاهر — كل الأقسام معطّلة)';
  }

  window._tplToggleBlock = function(i, visible) {
    if (!_tplEditorState || !_tplEditorState.blocks[i]) return;
    _tplEditorState.blocks[i].hidden = !visible;
    _renderTplEditor();
  };

  window._tplUpdateBlock = function(i, value) {
    if (!_tplEditorState || !_tplEditorState.blocks[i]) return;
    _tplEditorState.blocks[i].content = value;
    _renderTplPreview();
  };

  window._tplMove = function(i, dir) {
    if (!_tplEditorState) return;
    const blocks = _tplEditorState.blocks;
    const j = i + dir;
    if (j < 0 || j >= blocks.length) return;
    [blocks[i], blocks[j]] = [blocks[j], blocks[i]];
    _renderTplEditor();
  };

  window._tplResetDefault = function() {
    if (!_tplEditorState) return;
    if (!confirm('استعادة الترتيب والمحتوى الافتراضي لهذا القالب؟ سيتم فقد التعديلات الحالية.')) return;
    _tplEditorState.blocks = _tplDefaultBlocks(_tplEditorState.key);
    _renderTplEditor();
  };

  window._tplDragStart = function(ev, i) {
    _tplDragIdx = i;
    ev.dataTransfer.effectAllowed = 'move';
    try { ev.dataTransfer.setData('text/plain', String(i)); } catch(e) {}
  };
  window._tplDragOver = function(ev) {
    ev.preventDefault();
    ev.dataTransfer.dropEffect = 'move';
  };
  window._tplDrop = function(ev, i) {
    ev.preventDefault();
    if (_tplDragIdx === null || _tplDragIdx === i || !_tplEditorState) { _tplDragIdx = null; return; }
    const blocks = _tplEditorState.blocks;
    const [moved] = blocks.splice(_tplDragIdx, 1);
    blocks.splice(i, 0, moved);
    _tplDragIdx = null;
    _renderTplEditor();
  };
  window._tplDragEnd = function() { _tplDragIdx = null; };

  window.saveTemplate = function() {
    if (!_tplEditorState || !_tplEditorState.key) return;
    if (!window._printTemplates) window._printTemplates = {};
    window._printTemplates[_tplEditorState.key] = _tplEditorState.blocks.map(b => ({ id: b.id, content: b.content, hidden: !!b.hidden }));
    window._saveData();
    closeModal('template-editor-modal');
    window.navigate('settings');
    setTimeout(() => { if (typeof settingsTab === 'function') settingsTab(2); }, 150);
    showToast('success', 'تم حفظ القالب ✓');
  };

  window.exportDataJSON = function() {
    try {
      const key = _acctKey();
      const stores = ['invoices','customers','products','suppliers','expenses','cashbox',
                      'workOrders','employees','stockMoves','categories',
                      'debts','settings','printTemplates'];
      const data = { exportedAt: new Date().toISOString(), stores: {} };
      stores.forEach(k => {
        try { data.stores[k] = JSON.parse(localStorage.getItem('a3mali_' + k + '_' + key) || 'null'); } catch(e) {}
      });
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'a3mali-backup-' + new Date().toISOString().split('T')[0] + '.json';
      a.click();
      URL.revokeObjectURL(a.href);
      showToast('success', 'تم تحميل ملف النسخة الاحتياطية ✓');
    } catch(e) {
      showToast('error', 'خطأ في تصدير البيانات');
    }
  };

  window.confirmClearAllData = function() {
    if (!confirm('⚠️ سيتم حذف جميع البيانات (الفواتير، العملاء، المنتجات، الموردين، المصاريف، الديون، الكاشير وغيرها) بشكل نهائي ولا يمكن التراجع عن هذا الإجراء.\n\nهل تريد الاستمرار؟')) return;
    const typed = prompt('للتأكيد النهائي، اكتب كلمة "مسح" بدون اقتباس:');
    if (typed !== 'مسح') {
      showToast('info', 'تم إلغاء العملية');
      return;
    }
    window.clearAllData();
  };

  window.clearAllData = function() {
    window._invoices     = [];
    window._customers    = [];
    window._products     = [];
    window._suppliers    = [];
    window._expenses     = [];
    window._cashbox       = [];
    window._workOrders    = [];
    window._employees     = [];
    window._stockMoves    = [];
    window._categories    = [];
    window._debts          = [];
    window._purchases      = [];
    window._salesReps      = [];
    window._salesTargets   = [];
    window._printTemplates = {};
    window._saveData();
    if (typeof window._fsDeleteAllInvoices === 'function') {
      window._fsDeleteAllInvoices(_acctKey()).catch(e => console.warn('[ClearAllData] invoices cleanup failed', e));
    }
    showToast('success', 'تم حذف جميع البيانات بنجاح ✓');
    window.navigate('dashboard');
  };

  window.savePinSettings = function(clear) {
    if (clear === true) {
      localStorage.removeItem('a3mali_pin_' + _acctKey());
      const s = window._appSettings || {};
      delete s.pin;
      window._appSettings = s;
      window._saveSettings();
      window.__pinUnlocked = false;
      showToast('success', 'تم إلغاء رمز الدخول ✓');
      window.navigate('settings');
      setTimeout(() => { if (typeof settingsTab === 'function') settingsTab(4); }, 150);
      return;
    }
    const newPin  = (document.getElementById('s-pin-new')?.value  || '').trim();
    const confirm = (document.getElementById('s-pin-confirm')?.value || '').trim();
    const timeout = Math.min(480, Math.max(0, parseInt(document.getElementById('s-session-timeout')?.value) || 0));
    if (newPin && newPin.length < 4) {
      showToast('warning', 'الرمز يجب أن يكون 4 خانات على الأقل'); return;
    }
    if (newPin && newPin !== confirm) {
      showToast('warning', 'رمز التأكيد لا يطابق الرمز الجديد'); return;
    }
    const s = window._appSettings || {};
    s.sessionTimeout = timeout;
    if (newPin) {
      localStorage.setItem('a3mali_pin_' + _acctKey(), newPin);
      s.pin = newPin;
    }
    window._appSettings = s;
    window._saveSettings();
    window._startSessionTimeout(timeout);
    showToast('success', newPin ? 'تم حفظ رمز الدخول ✓' : 'تم حفظ مدة الجلسة ✓');
    window.navigate('settings');
    setTimeout(() => { if (typeof settingsTab === 'function') settingsTab(5); }, 150);
  };

  let _sessTimer = null;
  window._startSessionTimeout = function(minutes) {
    if (_sessTimer) { clearTimeout(_sessTimer); _sessTimer = null; }
    const mins = parseInt(minutes) || 0;
    if (mins <= 0) return;
    const ms = mins * 60 * 1000;
    const _reset = () => {
      if (_sessTimer) clearTimeout(_sessTimer);
      _sessTimer = setTimeout(() => {
        showToast('warning', 'انتهت مدة الجلسة — جاري تسجيل الخروج...');
        setTimeout(() => { if (typeof window.logout === 'function') window.logout(); }, 1500);
      }, ms);
    };
    _reset();
    ['mousemove','keydown','click','touchstart'].forEach(ev => {
      document.removeEventListener(ev, _reset);
      document.addEventListener(ev, _reset, { passive: true });
    });
  };

  window.switchHRTab = function(btn, tab) {
    document.querySelectorAll('.tabs .tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    ['employees','attendance','leaves','payroll'].forEach(t => {
      const el = document.getElementById(`hr-tab-${t}`);
      if (el) el.style.display = t === tab ? '' : 'none';
    });
  };

  window.filterEmployees = function(q) {
    const term = q.toLowerCase();
    document.querySelectorAll('.emp-card').forEach(card => {
      card.style.display = card.dataset.empSearch?.includes(term) ? '' : 'none';
    });
    document.querySelectorAll('tr[data-emp]').forEach(row => {
      row.style.display = row.dataset.emp?.includes(term) ? '' : 'none';
    });
  };

  let _empColor = '#3b82f6';
  window.setEmpColor = function(color) {
    _empColor = color;
    const preview = document.getElementById('emp-avatar-preview');
    if (preview) preview.style.background = color;
    document.querySelectorAll('[data-color]').forEach(el => {
      el.style.border = el.dataset.color === color ? '2px solid var(--text)' : '2px solid transparent';
    });
  };
  window.updateEmpPreview = function(name) {
    const preview = document.getElementById('emp-avatar-preview');
    if (preview) preview.textContent = name ? name.charAt(0) : 'م';
  };

  function _empInitial(name) { return (name || 'م').trim().charAt(0) || 'م'; }
  function _fmtSalary(emp) {
    const amount = Number(emp && emp.salary || 0);
    const from   = (emp && emp.salaryCurrency) || 'SYP';
    return _fmtAmt(amount, from);
  }
  function _fmtAmt(amount, currency) {
    const cur = currency || 'SYP';
    if (window.Currency && typeof window.Currency.formatCompact === 'function') return window.Currency.formatCompact(Number(amount) || 0, cur);
    return (Number(amount) || 0).toLocaleString('en-US') + ' ل.س';
  }
  function _daysInMonth(y, m) { return new Date(y, m + 1, 0).getDate(); }
  function _parseYMD(str) {
    if (!str) return null;
    const m = String(str).replace(/\//g,'-').match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (!m) return null;
    const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    return isNaN(d.getTime()) ? null : d;
  }
  function _monthKey(y, m) { return `${y}-${String(m + 1).padStart(2, '0')}`; }
  function _curMonthKey() { const n = new Date(); return _monthKey(n.getFullYear(), n.getMonth()); }
  function _empSalaryBaseFor(emp, year, monthIdx) {
    const salary = Number(emp && emp.salary || 0);
    const dim    = _daysInMonth(year, monthIdx);
    const hire   = _parseYMD(emp && emp.hireDate);
    if (!hire) return { amount: salary, prorated: false, daysWorked: dim, daysInMonth: dim };
    const monthEnd = new Date(year, monthIdx, dim);
    if (hire > monthEnd) return { amount: 0, prorated: false, daysWorked: 0, daysInMonth: dim };
    if (hire.getFullYear() === year && hire.getMonth() === monthIdx) {
      const daysWorked = dim - hire.getDate() + 1;
      return { amount: salary * daysWorked / dim, prorated: daysWorked < dim, daysWorked, daysInMonth: dim };
    }
    return { amount: salary, prorated: false, daysWorked: dim, daysInMonth: dim };
  }
  function _leaveBelongsTo(lv, emp) {
    if (!lv || !emp) return false;
    if (lv.empId && emp.id) return lv.empId === emp.id;
    return String(lv.empName || '').trim().toLowerCase() === String(emp.name || '').trim().toLowerCase();
  }
  function _leaveDaysInMonth(lv, year, monthIdx) {
    const from = _parseYMD(lv.from), to = _parseYMD(lv.to);
    if (!from || !to) return 0;
    const dim = _daysInMonth(year, monthIdx);
    const mStart = new Date(year, monthIdx, 1);
    const mEnd   = new Date(year, monthIdx, dim);
    const s = from > mStart ? from : mStart;
    const e = to   < mEnd   ? to   : mEnd;
    const days = Math.round((e - s) / 86400000) + 1;
    return days > 0 ? days : 0;
  }
  function _empDeductionsFor(emp, year, monthIdx) {
    const salary = Number(emp && emp.salary || 0);
    if (salary <= 0) return 0;
    const dim = _daysInMonth(year, monthIdx);
    const dailyRate = salary / dim;
    let deduction = 0;
    (window._leaves || []).forEach(lv => {
      if (lv.status !== 'approved') return;
      if (lv.paid !== false) return;
      if (!_leaveBelongsTo(lv, emp)) return;
      deduction += dailyRate * _leaveDaysInMonth(lv, year, monthIdx);
    });
    return deduction;
  }
  function _payrollRecord(empId, monthKey) {
    return (window._payroll || []).find(p => p.empId === empId && p.month === monthKey);
  }
  function _payrollFor(emp, year, monthIdx) {
    const baseInfo   = _empSalaryBaseFor(emp, year, monthIdx);
    const deductions = _empDeductionsFor(emp, year, monthIdx);
    const allowances = 0;
    const net = Math.max(0, baseInfo.amount + allowances - deductions);
    return {
      base: baseInfo.amount, allowances, deductions, net,
      prorated: baseInfo.prorated, daysWorked: baseInfo.daysWorked, daysInMonth: baseInfo.daysInMonth,
      currency: emp.salaryCurrency || 'SYP', monthKey: _monthKey(year, monthIdx),
    };
  }
  function _empActiveLeave(emp) {
    if (!emp) return null;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const t = today.getTime();
    const toTs = (v) => {
      if (!v) return NaN;
      const d = new Date(String(v).replace(/\//g,'-'));
      return d.getTime();
    };
    return (window._leaves || []).find(lv => {
      if (lv.status !== 'approved') return false;
      const sameEmp = (lv.empId && lv.empId === emp.id) || (lv.empName && emp.name && lv.empName === emp.name);
      if (!sameEmp) return false;
      const from = toTs(lv.from), to = toTs(lv.to);
      if (isNaN(from)) return false;
      return t >= from && (isNaN(to) ? true : t <= to);
    }) || null;
  }
  function _empStatusBadge(emp) {
    if (emp.active === false) return '<span class="badge badge-danger">معطل</span>';
    if (_empActiveLeave(emp)) return '<span class="badge badge-amber">🏖️ في إجازة</span>';
    return '<span class="badge badge-success">نشط</span>';
  }
  function _empCardHTML(emp) {
    const color = emp.color || '#3b82f6';
    return `
      <div class="emp-card card card-hover" data-emp-id="${emp.id}" data-ts="${window._dateToTs(emp.hireDate || emp.joinDate || emp.createdAt)}" data-emp-search="${`${emp.name} ${emp.title} ${emp.dept} ${emp.username||''}`.toLowerCase()}" data-emp-dept="${emp.dept||''}" style="padding:var(--sp-5);display:flex;flex-direction:column;gap:var(--sp-3);">
        <div style="display:flex;align-items:center;gap:var(--sp-4);">
          <div style="width:52px;height:52px;border-radius:50%;background:${color};display:flex;align-items:center;justify-content:center;font-size:1.25rem;font-weight:800;color:#fff;flex-shrink:0;">${_empInitial(emp.name)}</div>
          <div style="flex:1;min-width:0;">
            <div style="font-weight:700;font-size:var(--text-base);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${emp.name}</div>
            <div style="font-size:var(--text-sm);color:var(--text-muted);">${emp.title||''}</div>
          </div>
          <span style="flex-shrink:0;">${_empStatusBadge(emp)}</span>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--sp-2);font-size:var(--text-sm);">
          <div style="display:flex;align-items:center;gap:var(--sp-2);color:var(--text-muted);"><span>🏢</span>${emp.dept||'—'}</div>
          <div style="display:flex;align-items:center;gap:var(--sp-2);color:var(--text-muted);"><span>📄</span>${emp.contract||'—'}</div>
          ${emp.username ? `<div style="display:flex;align-items:center;gap:var(--sp-2);color:var(--text-muted);"><span>🏪</span><span dir="ltr">${emp.username}</span></div>` : ''}
          ${emp.phone ? `<div style="display:flex;align-items:center;gap:var(--sp-2);color:var(--text-muted);"><span>📞</span>${emp.phone}</div>` : ''}
        </div>
        <div style="padding:var(--sp-3);background:var(--surface-2);border-radius:var(--r);display:flex;justify-content:space-between;align-items:center;">
          <span style="font-size:var(--text-xs);color:var(--text-muted);">الراتب الأساسي</span>
          <span style="font-weight:700;color:var(--primary);">${_fmtSalary(emp)}</span>
        </div>
        <div style="display:flex;gap:var(--sp-2);">
          <button class="btn btn-primary btn-sm" style="flex:1;" onclick="showEmployeeStats('${emp.id}')">📊 الإحصائيات</button>
          <button class="btn btn-secondary btn-sm" onclick="showEmployeeCreds('${emp.id}')">🔑</button>
          <button class="btn ${emp.active!==false?'btn-secondary':'btn-primary'} btn-sm" title="${emp.active!==false?'تعطيل الموظف':'تفعيل الموظف'}" onclick="toggleEmployeeActive('${emp.id}')">${emp.active!==false?'⏸️':'▶️'}</button>
          <button class="btn btn-ghost btn-sm" onclick="deleteEmployee('${emp.id}')">🗑️</button>
        </div>
      </div>`;
  }
  function _empRowHTML(emp, idx) {
    const color = emp.color || '#3b82f6';
    return `
      <tr data-emp-id="${emp.id}" data-ts="${window._dateToTs(emp.hireDate || emp.joinDate || emp.createdAt)}" data-emp="${`${emp.name} ${emp.title} ${emp.dept} ${emp.username||''}`.toLowerCase()}" data-emp-dept="${emp.dept||''}">
        <td style="color:var(--text-muted);">${idx}</td>
        <td>
          <div style="display:flex;align-items:center;gap:var(--sp-3);">
            <div style="width:34px;height:34px;border-radius:50%;background:${color};display:flex;align-items:center;justify-content:center;font-weight:700;color:#fff;">${_empInitial(emp.name)}</div>
            <div>
              <div style="font-weight:600;">${emp.name}</div>
              ${emp.username ? `<div style="font-size:var(--text-xs);color:var(--text-muted);" dir="ltr">🏪 ${emp.username}</div>` : (emp.email ? `<div style="font-size:var(--text-xs);color:var(--text-muted);">${emp.email}</div>` : '')}
            </div>
          </div>
        </td>
        <td>${emp.title||'—'}</td>
        <td>${emp.dept||'—'}</td>
        <td style="color:var(--text-muted);">${emp.hireDate || '—'}</td>
        <td style="font-weight:700;">${_fmtSalary(emp)}</td>
        <td>${emp.contract||'—'}</td>
        <td>${_empStatusBadge(emp)}</td>
        <td><div class="table-actions">
          <button class="btn btn-ghost btn-sm" title="الإحصائيات" onclick="showEmployeeStats('${emp.id}')">📊</button>
          <button class="btn btn-ghost btn-sm" title="بيانات الدخول" onclick="showEmployeeCreds('${emp.id}')">🔑</button>
          <button class="btn btn-ghost btn-sm" title="${emp.active!==false?'تعطيل الموظف':'تفعيل الموظف'}" onclick="toggleEmployeeActive('${emp.id}')">${emp.active!==false?'⏸️':'▶️'}</button>
          <button class="btn btn-ghost btn-sm" title="حذف" onclick="deleteEmployee('${emp.id}')">🗑️</button>
        </div></td>
      </tr>`;
  }

  window.hydrateEmployees = function() {
    const list = (window._employees || []);
    const grid = document.getElementById('emp-cards-grid');
    const tbody = document.getElementById('employees-body');
    const payrollBody = document.getElementById('payroll-body');

    if (grid) {
      if (!list.length) {
        grid.innerHTML = `<div id="emp-empty-card" style="grid-column:1/-1;"><div class="empty-state"><div class="empty-icon">👥</div><div class="empty-title">لا يوجد موظفون بعد</div><div class="empty-desc">ابدأ بإضافة أول موظف للشركة</div><button class="btn btn-primary" style="margin-top:var(--sp-4);" onclick="openModal('new-employee-modal')">+ إضافة موظف</button></div></div>`;
      } else {
        grid.innerHTML = list.map(e => _empCardHTML(e)).join('');
      }
    }
    if (tbody) {
      tbody.innerHTML = list.length
        ? list.map((e,i) => _empRowHTML(e, i+1)).join('')
        : `<tr><td colspan="9" style="text-align:center;padding:var(--sp-10);color:var(--text-muted);">لا يوجد موظفون</td></tr>`;
    }
    if (payrollBody) {
      const n = new Date();
      const year = n.getFullYear(), monthIdx = n.getMonth();
      const payList = list.filter(e => e.active !== false);
      payrollBody.innerHTML = payList.length
        ? payList.map((e,i) => {
            const pf  = _payrollFor(e, year, monthIdx);
            const rec = _payrollRecord(e.id, pf.monthKey);
            const baseFmt = _fmtAmt(pf.base, pf.currency) +
              (pf.prorated ? ` <span style="font-size:11px;color:var(--text-muted);">(${pf.daysWorked}/${pf.daysInMonth} يوم)</span>` : '');
            const dedFmt  = pf.deductions > 0
              ? `<span style="color:var(--danger);">- ${_fmtAmt(pf.deductions, pf.currency)}</span>`
              : _fmtAmt(0, pf.currency);
            const statusCell = rec
              ? `<span class="badge badge-success">مدفوع</span>`
              : `<span class="badge badge-amber">معلق</span>`;
            const actionCell = rec
              ? `<div style="display:flex;align-items:center;gap:var(--sp-2);">
                   <span style="font-size:11px;color:var(--text-muted);">${rec.date}</span>
                   <button class="btn btn-ghost btn-sm" title="تراجع عن الصرف" onclick="undoSalary('${e.id}')">↩️</button>
                 </div>`
              : `<button class="btn btn-primary btn-sm" onclick="disburseSalary('${e.id}')">💰 صرف</button>`;
            return `<tr><td>${i+1}</td><td style="font-weight:600;">${e.name}</td><td>${baseFmt}</td><td>${_fmtAmt(pf.allowances, pf.currency)}</td><td>${dedFmt}</td><td style="font-weight:700;color:var(--primary);">${_fmtAmt(pf.net, pf.currency)}</td><td>${statusCell}</td><td>${actionCell}</td></tr>`;
          }).join('')
        : `<tr><td colspan="8" style="text-align:center;padding:var(--sp-8);color:var(--text-muted);">أضف موظفين لبدء كشف الرواتب</td></tr>`;
    }

    const totalEl  = document.getElementById('emp-kpi-total');
    const activeEl = document.getElementById('emp-kpi-active');
    const leaveEl  = document.getElementById('emp-kpi-leave');
    const salEl    = document.getElementById('emp-kpi-salary');
    if (totalEl)  totalEl.textContent  = list.length;
    if (activeEl) activeEl.textContent = list.filter(e => e.active !== false).length;
    if (leaveEl)  leaveEl.textContent  = _onLeaveTodayCount();
    if (salEl) {
      if (window.Currency && typeof window.Currency.convert === 'function') {
        const base = window.Currency.base;
        const totalBase = list.reduce((s,e)=> s + window.Currency.convert(Number(e.salary||0), e.salaryCurrency||'SYP', base), 0);
        salEl.textContent = window.Currency.formatCompact(totalBase, base);
      } else {
        salEl.textContent = list.reduce((s,e)=>s+Number(e.salary||0),0).toLocaleString('en-US') + ' ل.س';
      }
    }
  };
  window.init_hr = function() { window.hydrateEmployees(); window.hydrateLeaves(); };

  function _onLeaveTodayCount() {
    const today = new Date(); today.setHours(0,0,0,0);
    const names = new Set();
    (window._leaves || []).forEach(lv => {
      if (lv.status !== 'approved') return;
      const from = _parseYMD(lv.from), to = _parseYMD(lv.to);
      if (!from || !to) return;
      if (today >= from && today <= to) names.add((lv.empId || lv.empName || '').toString().toLowerCase());
    });
    return names.size;
  }

  window.disburseSalary = function(empId) {
    const emp = (window._employees || []).find(e => e.id === empId);
    if (!emp) { showToast('error','الموظف غير موجود'); return; }
    const n = new Date();
    const year = n.getFullYear(), monthIdx = n.getMonth();
    const pf = _payrollFor(emp, year, monthIdx);
    if (_payrollRecord(emp.id, pf.monthKey)) {
      showToast('warning', `تم صرف راتب ${emp.name} لهذا الشهر مسبقاً`);
      return;
    }
    if (pf.net <= 0) { showToast('warning','لا يوجد راتب مستحق لهذا الموظف هذا الشهر'); return; }

    const monthLabel = n.toLocaleDateString('ar-SY', { month:'long', year:'numeric' });
    const detail = pf.prorated ? ` (محسوب لـ ${pf.daysWorked} يوم)` : '';
    const dedLine = pf.deductions > 0 ? ` بعد خصم ${_fmtAmt(pf.deductions, pf.currency)}` : '';
    const titleEl = document.getElementById('confirm-title');
    const msgEl   = document.getElementById('confirm-msg');
    const okEl    = document.getElementById('confirm-ok');
    if (titleEl) titleEl.textContent = 'تأكيد صرف الراتب';
    if (msgEl)   msgEl.textContent   = `هل أنت متأكد من صرف راتب الموظف "${emp.name}" عن شهر ${monthLabel}؟ صافي الراتب ${_fmtAmt(pf.net, pf.currency)}${detail}${dedLine}.`;
    if (okEl) {
      okEl.textContent = '💰 تأكيد الصرف';
      okEl.className   = 'btn btn-primary';
      okEl.onclick = function() {
        window._payroll = window._payroll || [];
        window._payroll.unshift({
          id: 'PAY-' + Date.now().toString().slice(-7),
          empId: emp.id, empName: emp.name, month: pf.monthKey,
          base: pf.base, allowances: pf.allowances, deductions: pf.deductions, net: pf.net,
          currency: pf.currency, prorated: pf.prorated, daysWorked: pf.daysWorked, daysInMonth: pf.daysInMonth,
          date: new Date().toLocaleDateString('ar-SY'), createdAt: Date.now(),
        });
        window._saveData();
        okEl.textContent = 'تأكيد الحذف';
        okEl.className   = 'btn btn-danger';
        closeModal('confirm-modal');
        window.hydrateEmployees();
        showToast('success', `تم صرف راتب ${emp.name} ✓`);
      };
    }
    openModal('confirm-modal');
  };

  window.undoSalary = function(empId) {
    const emp = (window._employees || []).find(e => e.id === empId);
    const monthKey = _curMonthKey();
    const rec = _payrollRecord(empId, monthKey);
    if (!rec) return;
    window._payroll = (window._payroll || []).filter(p => p.id !== rec.id);
    window._saveData();
    window.hydrateEmployees();
    showToast('info', `تم التراجع عن صرف راتب ${emp ? emp.name : ''}`);
  };

  window.printPayroll = function() {
    const n = new Date();
    const year = n.getFullYear(), monthIdx = n.getMonth();
    const monthLabel = n.toLocaleDateString('ar-SY', { month:'long', year:'numeric' });
    const payList = (window._employees || []).filter(e => e.active !== false);
    if (!payList.length) { showToast('warning','لا يوجد موظفون في كشف الرواتب'); return; }
    const rows = payList.map((e,i) => {
      const pf  = _payrollFor(e, year, monthIdx);
      const rec = _payrollRecord(e.id, pf.monthKey);
      return `<tr>
        <td>${i+1}</td><td>${e.name}</td>
        <td>${_fmtAmt(pf.base, pf.currency)}${pf.prorated ? ` (${pf.daysWorked}/${pf.daysInMonth})` : ''}</td>
        <td>${_fmtAmt(pf.deductions, pf.currency)}</td>
        <td>${_fmtAmt(pf.net, pf.currency)}</td>
        <td>${rec ? 'مدفوع' : 'معلق'}</td>
      </tr>`;
    }).join('');
    generatePDF(`كشف رواتب ${monthLabel}`, `
      <table>
        <thead><tr><th>#</th><th>الموظف</th><th>الراتب الأساسي</th><th>الخصومات</th><th>صافي الراتب</th><th>الحالة</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    `);
  };

  window.saveEmployee = function() {
    const name     = document.getElementById('emp-name')?.value.trim();
    const phone    = document.getElementById('emp-phone')?.value.trim();
    const title    = document.getElementById('emp-title')?.value.trim();
    const dept     = document.getElementById('emp-dept')?.value;
    const date     = document.getElementById('emp-hire-date')?.value;
    const salary   = document.getElementById('emp-salary')?.value || '0';
    const salaryCurrency = document.getElementById('emp-salary-currency')?.value || 'SYP';
    const contract = document.getElementById('emp-contract')?.value || 'دوام كامل';
    const email    = document.getElementById('emp-email')?.value.trim();
    const username = document.getElementById('emp-username')?.value.trim();
    const password = document.getElementById('emp-password')?.value.trim();
    const role     = document.getElementById('emp-role')?.value || 'cashier';
    const color    = _empColor;

    if (!name)     { showToast('error','أدخل اسم الموظف'); return; }
    if (!title)    { showToast('error','أدخل المسمى الوظيفي'); return; }
    if (!username) { showToast('error','أدخل اسم المستخدم لدخول الكاشير'); return; }
    if (!password) { showToast('error','أدخل كلمة المرور لدخول الكاشير'); return; }

    const uname = username.toLowerCase();
    if ((window._employees||[]).some(e => (e.username||'').toLowerCase() === uname)) {
      showToast('error','اسم المستخدم مستخدم بالفعل، اختر اسماً آخر');
      return;
    }

    const emp = {
      id: 'EMP-' + Date.now().toString().slice(-7),
      name, phone, title, dept, hireDate: date || '',
      salary: Number(salary) || 0, salaryCurrency, contract, email,
      username, password, role, color,
      active: true, createdAt: new Date().toISOString(),
    };
    window._employees.unshift(emp);
    window._saveData();
    window.hydrateEmployees();

    closeModal('new-employee-modal');
    showToast('success', `تم إضافة الموظف ${name} ويمكنه الآن الدخول للكاشير ✓`);
    _empColor = '#3b82f6';
    ['emp-name','emp-phone','emp-title','emp-hire-date','emp-salary','emp-email','emp-notes','emp-username','emp-password'].forEach(id => {
      const el = document.getElementById(id); if (el) el.value = '';
    });
    const roleEl = document.getElementById('emp-role'); if (roleEl) roleEl.value = 'cashier';
    const salCurEl = document.getElementById('emp-salary-currency'); if (salCurEl) salCurEl.value = 'SYP';
    const prev = document.getElementById('emp-avatar-preview');
    if (prev) { prev.style.background = '#3b82f6'; prev.textContent = 'م'; }
  };

  window.deleteEmployee = function(id) {
    const emp = (window._employees||[]).find(e => e.id === id);
    if (!emp) return;
    window._confirmAction = function() {
      window._employees = (window._employees||[]).filter(e => e.id !== id);
      window._saveData();
      window.hydrateEmployees();
      closeModal('confirm-modal');
      showToast('success', `تم حذف الموظف ${emp.name}`);
    };
    const titleEl = document.getElementById('confirm-title');
    const msgEl   = document.getElementById('confirm-msg');
    const okEl    = document.getElementById('confirm-ok');
    if (titleEl) titleEl.textContent = 'حذف موظف';
    if (msgEl)   msgEl.textContent   = `هل تريد حذف الموظف "${emp.name}"؟ لن يتمكن من الدخول للكاشير بعد الحذف.`;
    if (okEl)    okEl.onclick = window._confirmAction;
    openModal('confirm-modal');
  };

  window.toggleEmployeeActive = function(id) {
    const emp = (window._employees||[]).find(e => e.id === id);
    if (!emp) return;
    emp.active = emp.active === false ? true : false;
    window._saveData();
    window.hydrateEmployees();
    showToast('success', emp.active === false
      ? `تم تعطيل الموظف ${emp.name} — لن يستطيع تسجيل الدخول للكاشير`
      : `تم تفعيل الموظف ${emp.name} ✓`);
  };

  window.showEmployeeCreds = function(id) {
    const emp = (window._employees||[]).find(e => e.id === id);
    if (!emp) return;
    showToast('info', `🏪 المستخدم: ${emp.username}  |  كلمة المرور: ${emp.password}`);
  };

  function _empSales(emp) {
    const uname = (emp.username||'').toLowerCase();
    const name  = (emp.name||'').toLowerCase();
    return (window._invoices || []).filter(s => {
      if (s.source !== 'pos') return false;
      if (uname && (s.cashierUser||'').toLowerCase() === uname) return true;
      if (!s.cashierUser && name && (s.cashier||'').toLowerCase() === name) return true;
      return false;
    });
  }
  function _fmtMoney(n) {
    return window.Currency ? window.Currency.formatCompact(Number(n)||0, window.Currency.base) : (Number(n)||0).toLocaleString('en-US')+' ل.س';
  }
  function _fmtDateTime(v) {
    if (!v) return '—';
    const d = new Date(v);
    return isNaN(d) ? '—' : d.toLocaleString('en-US');
  }
  const _CUR_NAMES = { SYP: 'ليرة سورية', USD: 'دولار أمريكي', TRY: 'ليرة تركية' };
  function _fmtMethodCur(inv) {
    const m = inv.method || '—';
    const c = inv.paymentCurrency || inv.currency;
    return c ? m + ' · ' + (_CUR_NAMES[c] || c) : m;
  }
  function _fmtInvRate(inv) {
    const r = Number(inv.fxRate) || 0;
    if (r <= 0) return '—';
    return r.toLocaleString('en-US') + ' ل.س/$';
  }
  function _fmtInvAmount(inv) {
    const amt = Number(inv.amount) || 0;
    if (!window.Currency) return amt.toLocaleString('en-US') + ' ل.س';
    let cur, val;
    if (inv.source === 'pos' && inv.paymentCurrency) {
      cur = inv.paymentCurrency;
      val = (inv.paymentAmount != null)
        ? (Number(inv.paymentAmount) || 0)
        : window.Currency.convert(amt, window.Currency.base || 'SYP', cur);
    } else {
      cur = inv.currency || window.Currency.base || 'SYP';
      val = amt;
    }
    const d   = window.Currency.digits(cur);
    const sym = window.Currency.symbol(cur);
    return val.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d }) + ' ' + sym;
  }
  let _empStatsId = null;
  let _empStatsRange = 'all';
  function _empWeekStart(now) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const diff = (d.getDay() + 1) % 7;
    d.setDate(d.getDate() - diff);
    return d;
  }
  function _inEmpRange(ts, range) {
    if (range === 'all') return true;
    if (!ts) return false;
    const d = new Date(ts), now = new Date();
    const sameDay = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
    if (range === 'today')     return sameDay(d, now);
    if (range === 'yesterday') { const y = new Date(now); y.setDate(now.getDate() - 1); return sameDay(d, y); }
    if (range === 'week')      { const ws = _empWeekStart(now); const we = new Date(ws); we.setDate(ws.getDate() + 7); return d >= ws && d < we; }
    if (range === 'month')     return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    return true;
  }
  window.setEmpStatsRange = function(range, btn) {
    _empStatsRange = range;
    _renderEmpStats();
  };
  window.showEmployeeStats = function(id) {
    _empStatsId = id;
    _empStatsRange = 'all';
    _renderEmpStats();
    openModal('emp-stats-modal');
  };
  function _renderEmpStats() {
    const emp = (window._employees||[]).find(e => e.id === _empStatsId);
    if (!emp) return;
    const sales = _empSales(emp).filter(s => _inEmpRange(s.timestamp||s.createdAt, _empStatsRange));
    const total = sales.reduce((s,x) => s + (Number(x.total)||0), 0);
    const count = sales.length;
    const avg   = count ? total / count : 0;
    const sorted = [...sales].sort((a,b) => new Date(b.timestamp||b.createdAt||0) - new Date(a.timestamp||a.createdAt||0));
    const lastSale = sorted[0];
    const qty = {};
    sales.forEach(s => (s.items||[]).forEach(it => { qty[it.name] = (qty[it.name]||0) + (Number(it.qty)||0); }));
    let topName = '—', topQty = 0;
    Object.keys(qty).forEach(n => { if (qty[n] > topQty) { topName = n; topQty = qty[n]; } });

    const title = document.getElementById('emp-stats-title');
    if (title) title.textContent = `ملف الموظف — ${emp.name}`;

    const _rb = (r, lbl) => `<button class="btn ${_empStatsRange === r ? 'btn-primary' : 'btn-secondary'} btn-sm" onclick="setEmpStatsRange('${r}', this)">${lbl}</button>`;
    const rangeBar = `
      <div style="display:flex;gap:var(--sp-2);flex-wrap:wrap;margin-bottom:var(--sp-4);">
        ${_rb('today','اليوم')}${_rb('yesterday','أمس')}${_rb('week','هذا الأسبوع')}${_rb('month','هذا الشهر')}${_rb('all','الكل')}
      </div>`;

    const recent = sorted.slice(0, 10).map(s => `
      <tr>
        <td style="font-weight:700;color:var(--primary);">${s.id}</td>
        <td>${s.client||'—'}</td>
        <td style="font-weight:700;">${_fmtMoney(s.total)}</td>
        <td>${_fmtMethodCur(s)}</td>
        <td style="color:var(--text-muted);">${_fmtDateTime(s.timestamp||s.createdAt)}</td>
      </tr>`).join('') || '<tr><td colspan="5" style="text-align:center;color:var(--text-muted);padding:var(--sp-8);">لا توجد مبيعات في هذه الفترة</td></tr>';

    document.getElementById('emp-stats-body').innerHTML = `
      <div style="display:flex;align-items:center;gap:var(--sp-4);margin-bottom:var(--sp-5);">
        <div style="width:56px;height:56px;border-radius:50%;background:${emp.color||'#3b82f6'};display:flex;align-items:center;justify-content:center;font-size:1.4rem;font-weight:800;color:#fff;">${(emp.name||'م').charAt(0)}</div>
        <div>
          <div style="font-weight:800;font-size:var(--text-lg);">${emp.name}</div>
          <div style="font-size:var(--text-sm);color:var(--text-muted);">${emp.title||''} ${emp.username ? `· <span dir="ltr">🏪 ${emp.username}</span>` : ''}</div>
        </div>
      </div>
      ${rangeBar}
      <div class="kpi-grid" style="margin-bottom:var(--sp-5);">
        <div class="kpi-card"><div class="kpi-icon kpi-icon-green">💰</div><div class="kpi-info"><div class="kpi-label">إجمالي المبيعات</div><div class="kpi-value">${_fmtMoney(total)}</div></div></div>
        <div class="kpi-card"><div class="kpi-icon kpi-icon-blue">🧾</div><div class="kpi-info"><div class="kpi-label">عدد الفواتير</div><div class="kpi-value">${count}</div></div></div>
        <div class="kpi-card"><div class="kpi-icon kpi-icon-amber">📊</div><div class="kpi-info"><div class="kpi-label">متوسط الفاتورة</div><div class="kpi-value">${_fmtMoney(avg)}</div></div></div>
        <div class="kpi-card"><div class="kpi-icon kpi-icon-red">🏆</div><div class="kpi-info"><div class="kpi-label">الأكثر مبيعاً</div><div class="kpi-value" style="font-size:var(--text-base);">${topName}${topQty ? ` (${topQty})` : ''}</div></div></div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--sp-4);margin-bottom:var(--sp-5);">
        <div style="padding:var(--sp-4);background:var(--surface-2);border-radius:var(--r-lg);">
          <div style="font-size:var(--text-xs);color:var(--text-muted);margin-bottom:4px;">🕓 آخر تسجيل دخول</div>
          <div style="font-weight:700;">${_fmtDateTime(emp.lastLogin)}</div>
          <div style="font-size:var(--text-xs);color:var(--text-muted);margin-top:4px;">عدد مرات الدخول: ${Number(emp.loginCount)||0}</div>
        </div>
        <div style="padding:var(--sp-4);background:var(--surface-2);border-radius:var(--r-lg);">
          <div style="font-size:var(--text-xs);color:var(--text-muted);margin-bottom:4px;">🧾 آخر عملية بيع</div>
          <div style="font-weight:700;">${lastSale ? _fmtMoney(lastSale.total) : '—'}</div>
          <div style="font-size:var(--text-xs);color:var(--text-muted);margin-top:4px;">${lastSale ? _fmtDateTime(lastSale.timestamp||lastSale.createdAt) : 'لا يوجد'}</div>
        </div>
      </div>
      <h4 style="font-weight:700;margin-bottom:var(--sp-3);">آخر المبيعات</h4>
      <div class="table-wrap" style="max-height:320px;overflow-y:auto;">
        <table class="table">
          <thead><tr><th>رقم الفاتورة</th><th>العميل</th><th>المبلغ</th><th>الدفع</th><th>التاريخ والوقت</th></tr></thead>
          <tbody>${recent}</tbody>
        </table>
      </div>`;
    openModal('emp-stats-modal');
  };

  window.toggleEmpView = function() {
    const cardView  = document.getElementById('emp-cards-view');
    const tableView = document.getElementById('emp-table-view');
    const btn       = document.getElementById('emp-view-btn');
    if (!cardView || !tableView) return;
    const showingCards = cardView.style.display !== 'none';
    cardView.style.display  = showingCards ? 'none' : '';
    tableView.style.display = showingCards ? ''     : 'none';
    if (btn) btn.textContent = showingCards ? '⊞ بطاقات' : '☰ جدول';
  };

  window.filterEmpDept = function(dept) {
    document.querySelectorAll('.emp-card').forEach(card => {
      card.style.display = (!dept || card.dataset.empDept === dept) ? '' : 'none';
    });
    document.querySelectorAll('tr[data-emp]').forEach(row => {
      row.style.display = (!dept || row.dataset.empDept === dept) ? '' : 'none';
    });
  };

  window.onLeaveTypeChange = function(type) {
    const paidSel = document.getElementById('leave-paid');
    if (!paidSel) return;
    // "بدون راتب" → auto deduct; otherwise keep paid (no deduction)
    if (String(type || '').includes('بدون راتب')) paidSel.value = 'unpaid';
    else paidSel.value = 'paid';
  };

  window.populateLeaveEmpDatalist = function() {
    const sel = document.getElementById('leave-emp');
    if (!sel) return;
    const prev = sel.value;
    sel.innerHTML = '<option value="">— اختر الموظف —</option>' +
      (window._employees || [])
        .map(e => `<option value="${e.id}">${e.name || '—'}</option>`).join('');
    if (prev) sel.value = prev;
  };

  window.saveLeave = function() {
    const empId  = document.getElementById('leave-emp')?.value;
    const type   = document.getElementById('leave-type')?.value;
    const from   = document.getElementById('leave-from')?.value;
    const to     = document.getElementById('leave-to')?.value;
    const reason = document.getElementById('leave-reason')?.value.trim();
    const paid   = (document.getElementById('leave-paid')?.value || 'paid') === 'paid';
    if (!empId || !from || !to) { showToast('warning','يرجى ملء الحقول المطلوبة'); return; }
    if (new Date(to) < new Date(from)) { showToast('warning','تاريخ النهاية قبل البداية'); return; }
    const days = Math.max(1, Math.round((new Date(to)-new Date(from))/(1000*60*60*24)) + 1);
    const empRec = (window._employees || []).find(e => String(e.id) === String(empId));
    const leave = {
      id: 'LV-' + Date.now().toString(36) + Math.random().toString(36).slice(2,6),
      empId: empRec ? empRec.id : empId,
      empName: empRec ? empRec.name : '—',
      type: type || 'إجازة',
      from, to, days,
      reason: reason || '',
      paid,
      status: 'pending',
      createdAt: new Date().toISOString()
    };
    window._leaves = window._leaves || [];
    window._leaves.push(leave);
    if (typeof _saveData === 'function') _saveData();
    window.hydrateLeaves();
    window.hydrateEmployees();
    closeModal('new-leave-modal');
    showToast('success', `تم تسجيل طلب إجازة ${leave.empName} ✓`);
    ['leave-emp','leave-from','leave-to','leave-reason'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
    const paidSel = document.getElementById('leave-paid'); if (paidSel) paidSel.value = 'paid';
  };

  window.hydrateLeaves = function() {
    window.populateLeaveEmpDatalist();
    const tbody = document.getElementById('leaves-body');
    if (!tbody) return;
    const list = (window._leaves || []).slice().sort((a, b) =>
      String(b.from || '').localeCompare(String(a.from || '')));
    if (!list.length) {
      tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:var(--sp-10);color:var(--text-muted);">
        <div style="font-size:2rem;">🏖️</div>
        <div style="font-weight:700;margin-top:var(--sp-2);">لا توجد طلبات إجازة</div>
      </td></tr>`;
      return;
    }
    const statusBadge = {
      pending:  '<span class="badge badge-amber">معلق</span>',
      approved: '<span class="badge badge-success">موافق</span>',
      rejected: '<span class="badge badge-danger">مرفوض</span>'
    };
    tbody.innerHTML = list.map(lv => {
      const paidBadge = lv.paid
        ? '<span class="badge badge-success" style="margin-inline-start:4px;">مدفوعة</span>'
        : '<span class="badge badge-danger" style="margin-inline-start:4px;">تُخصم</span>';
      let actions = '';
      if (lv.status === 'pending') {
        actions = `
          <button class="btn btn-primary btn-sm" onclick="approveLeave('${lv.id}')">✓ موافقة</button>
          <button class="btn btn-ghost btn-sm" onclick="rejectLeave('${lv.id}')">✕ رفض</button>`;
      } else {
        actions = `<button class="btn btn-ghost btn-sm" onclick="deleteLeave('${lv.id}')">🗑️ حذف</button>`;
      }
      return `
        <tr data-ts="${window._dateToTs(lv.from || lv.createdAt)}">
          <td style="font-weight:600;">${lv.empName || '—'}</td>
          <td>${lv.type || '—'} ${paidBadge}</td>
          <td>${lv.from || '—'}</td>
          <td>${lv.to || '—'}</td>
          <td style="font-weight:700;">${lv.days || 0} أيام</td>
          <td>${lv.reason || '—'}</td>
          <td>${statusBadge[lv.status] || statusBadge.pending}</td>
          <td>${actions}</td>
        </tr>`;
    }).join('');
  };

  window.approveLeave = function(id) {
    const lv = (window._leaves || []).find(l => l.id === id);
    if (!lv) return;
    lv.status = 'approved';
    lv.updatedAt = Date.now();
    if (typeof _saveData === 'function') _saveData();
    window.hydrateLeaves();
    window.hydrateEmployees();
    showToast('success','تم الموافقة على الإجازة ✓');
  };

  window.rejectLeave = function(id) {
    const lv = (window._leaves || []).find(l => l.id === id);
    if (!lv) return;
    lv.status = 'rejected';
    lv.updatedAt = Date.now();
    if (typeof _saveData === 'function') _saveData();
    window.hydrateLeaves();
    window.hydrateEmployees();
    showToast('info','تم رفض الإجازة');
  };

  window.deleteLeave = function(id) {
    window._leaves = (window._leaves || []).filter(l => l.id !== id);
    if (typeof _saveData === 'function') _saveData();
    window.hydrateLeaves();
    window.hydrateEmployees();
    showToast('info','تم حذف الإجازة');
  };
  window.filterCustomers = function(q) {
    const term = (q || '').toLowerCase();
    document.querySelectorAll('#customers-body tr[data-cust]').forEach(row => {
      row.style.display = row.dataset.cust.includes(term) ? '' : 'none';
    });
  };
  window.filterCustomerType = function(type) {
    document.querySelectorAll('#customers-body tr[data-cust]').forEach(row => {
      row.style.display = (!type || row.dataset.custType === type) ? '' : 'none';
    });
  };
  window.exportCustomersCSV = function() {
    const rows = [['#','الاسم','الهاتف','البريد الإلكتروني','الشركة','النوع','المدينة']];
    document.querySelectorAll('#customers-body tr[data-cust]').forEach(tr => {
      const cells = tr.querySelectorAll('td');
      rows.push([...cells].slice(0,7).map(c => c.textContent.trim()));
    });
    if (rows.length === 1) { showToast('warning','لا يوجد عملاء للتصدير'); return; }
    exportToCSV(rows, 'customers.csv');
    showToast('success', 'تم تصدير ملف العملاء ✓');
  };

  window.exportInstallmentsCSV = function() {
    const rows = [['#','العميل','الهاتف','المنتج / الفاتورة','إجمالي القيمة','المدفوع','المتبقي','الأقساط المدفوعة','القسط الشهري','تاريخ القسط القادم','أقساط متأخرة','الحالة']];
    const statusLabel = { active:'نشط', overdue:'متأخر', completed:'مكتمل' };
    (window._installments || []).forEach((p, i) => {
      const s = _instStats(p);
      rows.push([
        i + 1, p.customer || '', p.phone || '', p.product || '',
        s.total, (s.paidAmount + s.down), s.remaining,
        `${s.paidCount}/${s.count}`, Math.round(s.monthly),
        s.completed ? '—' : _instDateStr(s.nextDue), s.overdueCount,
        statusLabel[s.status] || s.status,
      ]);
    });
    if (rows.length === 1) { showToast('warning','لا توجد أقساط للتصدير'); return; }
    exportToCSV(rows, 'installments.csv');
    showToast('success', 'تم تصدير ملف الأقساط ✓');
  };

  window.exportCommissionsCSV = function() {
    const rows = [['نوع السجل','#','الاسم','تفاصيل','المستهدف / النسبة','المحقق / المبيعات','العمولة','الحالة']];
    document.querySelectorAll('#targets-table-body tr[data-target]').forEach(tr => {
      const c = tr.querySelectorAll('td');
      rows.push(['هدف', c[0].textContent.trim(), c[1].textContent.trim(), c[2].textContent.trim(), c[3].textContent.trim(), c[4].textContent.trim(), c[6].textContent.trim(), c[7].textContent.trim()]);
    });
    document.querySelectorAll('#reps-table-body tr[data-rep]').forEach(tr => {
      const c = tr.querySelectorAll('td');
      rows.push(['مندوب', c[0].textContent.trim(), c[1].textContent.trim(), c[2].textContent.trim(), c[3].textContent.trim(), c[4].textContent.trim(), c[5].textContent.trim(), c[6].textContent.trim()]);
    });
    if (rows.length === 1) { showToast('warning','لا توجد أهداف أو مندوبون للتصدير'); return; }
    exportToCSV(rows, 'commissions.csv');
    showToast('success', 'تم تصدير ملف العمولات ✓');
  };

  window.exportEmployeesCSV = function() {
    const rows = [['#','الموظف','المسمى الوظيفي','القسم','تاريخ التعيين','الراتب','نوع العقد','الحالة']];
    document.querySelectorAll('#employees-body tr[data-emp-id]').forEach(tr => {
      const cells = tr.querySelectorAll('td');
      rows.push([...cells].slice(0,8).map(c => c.textContent.trim()));
    });
    if (rows.length === 1) { showToast('warning','لا يوجد موظفون للتصدير'); return; }
    exportToCSV(rows, 'employees.csv');
    showToast('success', 'تم تصدير ملف الموظفين ✓');
  };

  window.switchSalesTab = function(btn, tab) {
    document.querySelectorAll('.tabs .tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    document.querySelectorAll('#invoices-tbody tr[data-inv-status]').forEach(row => {
      if (tab === 'all') {
        row.style.display = '';
      } else {
        row.style.display = row.dataset.invStatus === tab ? '' : 'none';
      }
    });
  };
  window.filterInvoices = function(q) {
    const term = (q || '').toLowerCase();
    document.querySelectorAll('#invoices-tbody tr[data-inv-status]').forEach(row => {
      const search = (row.querySelector('td:first-child')?.textContent || '') + ' ' + (row.querySelector('td:nth-child(2)')?.textContent || '');
      row.style.display = search.toLowerCase().includes(term) ? '' : 'none';
    });
  };
  window.filterInvoicesByDate = function(date) {
    document.querySelectorAll('#invoices-tbody tr[data-inv-status]').forEach(row => {
      if (!date) { row.style.display = ''; return; }
      const dateTd = row.querySelector('td:nth-child(6)');
      const rowDate = dateTd?.textContent.trim().replace(/\//g,'-');
      row.style.display = rowDate.includes(date) ? '' : 'none';
    });
  };
  window.filterInvoicesByEmployee = function(key) {
    const k = (key || 'all').toLowerCase();
    document.querySelectorAll('#invoices-tbody tr[data-inv-status]').forEach(row => {
      row.style.display = (k === 'all' || row.dataset.invSeller === k) ? '' : 'none';
    });
  };
  window.filterInvoicesByType = function(type) {
    document.querySelectorAll('#invoices-tbody tr[data-inv-status]').forEach(row => {
      if (type === 'all') { row.style.display = ''; return; }
      row.style.display = row.dataset.invType === type ? '' : 'none';
    });
  };
  window.sortInvoices = function(order) {
    const tbody = document.getElementById('invoices-tbody');
    if (!tbody) return;
    const rows = Array.from(tbody.querySelectorAll('tr[data-inv-status]'));
    rows.sort((a, b) => {
      const da = (a.querySelector('td:nth-child(6)')?.textContent || '').trim();
      const db = (b.querySelector('td:nth-child(6)')?.textContent || '').trim();
      if (da === db) return 0;
      const cmp = da < db ? -1 : 1;
      return order === 'oldest' ? cmp : -cmp;
    });
    rows.forEach(r => tbody.appendChild(r));
  };

  window._dateToTs = function(v) {
    if (v == null || v === '') return 0;
    if (typeof v === 'number') return v;
    const d = new Date(String(v).replace(/\//g,'-'));
    return isNaN(d) ? 0 : d.getTime();
  };

  window._sortRows = function(containerId, order, childSel) {
    const box = document.getElementById(containerId);
    if (!box) return;
    const items = Array.from(box.querySelectorAll(childSel || ':scope > *'))
      .filter(el => !(el.querySelector && el.querySelector('td[colspan]')));
    if (items.length < 2) return;
    items.sort((a, b) => {
      const ta = parseFloat(a.getAttribute('data-ts')) || 0;
      const tb = parseFloat(b.getAttribute('data-ts')) || 0;
      if (ta === tb) return 0;
      return order === 'oldest' ? ta - tb : tb - ta;
    });
    items.forEach(el => box.appendChild(el));
  };

  window._sortSelectHTML = function(containerId, childSel) {
    const arg = childSel ? `'${containerId}',this.value,'${childSel}'` : `'${containerId}',this.value`;
    return `<select class="form-select" style="width:auto;height:38px;" title="ترتيب حسب التاريخ" onchange="_sortRows(${arg})">
      <option value="newest">الأحدث أولاً ↓</option>
      <option value="oldest">الأقدم أولاً ↑</option>
    </select>`;
  };

  window.addInvoiceItem = function() {
    const tbody = document.getElementById('invoice-items');
    if (!tbody) return;
    const tr = document.createElement('tr');
    tr.className = 'inv-item-row';
    tr.innerHTML = `
      <td><input type="text" class="form-input" style="height:36px;" placeholder="اسم المنتج أو الخدمة" /></td>
      <td><input type="number" class="form-input" style="height:36px;width:80px;" value="1" min="1" oninput="calcInvoiceTotal()" /></td>
      <td><input type="number" class="form-input" style="height:36px;width:110px;" placeholder="0" min="0" oninput="calcInvoiceTotal()" /></td>
      <td><input type="number" class="form-input" style="height:36px;width:80px;" value="0" min="0" max="100" oninput="calcInvoiceTotal()" /></td>
      <td class="inv-row-total" style="font-weight:700;color:var(--primary);white-space:nowrap;">0 ل.س</td>
      <td><button type="button" class="btn btn-ghost btn-sm" onclick="removeInvoiceItem(this)">🗑️</button></td>
    `;
    tbody.appendChild(tr);
    calcInvoiceTotal();
  };
  window.saveProduct = function() {
    const name  = document.getElementById('prod-name')?.value.trim();
    const sku   = document.getElementById('prod-sku')?.value.trim();
    const price = document.getElementById('prod-price')?.value || '0';
    const cost  = document.getElementById('prod-cost')?.value || '0';
    const stock = document.getElementById('prod-stock')?.value || '0';
    const currency = document.getElementById('prod-currency')?.value || 'SYP';
    const cat   = document.getElementById('prod-cat')?.value || 'عام';
    const minStock = document.getElementById('prod-min-stock')?.value || '5';
    const supplier = document.getElementById('prod-supplier')?.value || '';
    if (!name) { showToast('error','أدخل اسم المنتج'); return; }

    const supName = (window._suppliers||[]).find(s => s.id === supplier)?.name || '';
    const emoji = document.getElementById('prod-emoji')?.value || '📦';
    const desc  = document.getElementById('prod-desc')?.value.trim() || '';
    const prod = {
      id:'PRD-'+Date.now().toString().slice(-6),
      name, sku, price:Number(price)||0, cost:Number(cost)||0, currency,
      cat, category:cat, minStock:Number(minStock)||0,
      stock:Number(stock)||0, supplier, supplierName:supName, emoji, desc,
      active: true, createdAt: Date.now(),
    };
    window._products.unshift(prod);
    window._saveData();

    const grid = document.getElementById('inventory-grid');
    if (grid) grid.innerHTML = generateProductCards();

    _checkLowStockNotify(prod);
    closeModal('new-product-modal');
    showToast('success',`تم إضافة المنتج ${name} بنجاح ✓`);
    ['prod-name','prod-sku','prod-price','prod-cost','prod-desc'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
    const stEl  = document.getElementById('prod-stock');     if (stEl)  stEl.value  = '0';
    const minEl = document.getElementById('prod-min-stock'); if (minEl) minEl.value = '5';
    const catEl = document.getElementById('prod-cat');       if (catEl) { catEl.innerHTML = generateCategoryOptions('عام'); catEl.value = 'عام'; }
    const supEl = document.getElementById('prod-supplier'); if (supEl) supEl.value = '';
    const curEl = document.getElementById('prod-currency'); if (curEl) curEl.value = 'SYP';
    const emEl  = document.getElementById('prod-emoji'); if (emEl) emEl.value = '📦';
    const emDsp = document.getElementById('prod-emoji-display'); if (emDsp) emDsp.textContent = '📦';
    refreshInvKpis();
  };

  function _curUserName() {
    let u = {};
    try { u = JSON.parse(sessionStorage.getItem('a3mali_user') || '{}'); } catch(e) {}
    return u.name || u.email || 'النظام';
  }

  function recordStockMove(prod, type, qty, reason) {
    qty = Number(qty) || 0;
    prod.stock = Math.max(0, (Number(prod.stock) || 0) + qty);
    const move = {
      id: 'MOV-' + Date.now().toString().slice(-8),
      productId: prod.id,
      productName: prod.name,
      type,
      qty,
      balanceAfter: prod.stock,
      reason: reason || '',
      user: _curUserName(),
      timestamp: Date.now(),
    };
    if (!window._stockMoves) window._stockMoves = [];
    window._stockMoves.unshift(move);
    window._saveData();
    return move;
  }

  function _checkLowStockNotify(prod) {
    const min   = _prodMin(prod);
    const stock = Number(prod.stock) || 0;
    if (stock <= 0)
      showToast('error',   `❌ ${prod.name} — نفد من المخزون تماماً`);
    else if (stock <= min)
      showToast('warning', `⚠️ ${prod.name} رح ينفذ من المخزون — المتبقي: ${stock}`);
  }

  let _lastLowStockToast = 0;
  function _checkAllLowStock() {
    const now = Date.now();
    if (now - _lastLowStockToast < 10 * 60 * 1000) return;
    _lastLowStockToast = now;
    const prods = (window._products || []);
    const out = prods.filter(p => (Number(p.stock) || 0) <= 0).length;
    const low = prods.filter(p => { const s = Number(p.stock) || 0; return s > 0 && s <= _prodMin(p); }).length;
    if (out)      showToast('error',   `❌ ${out} منتج نفد من المخزون`);
    if (low)      showToast('warning', `⚠️ ${low} منتج رح ينفذ من المخزون قريباً`);
  }

  function _refreshProductsGrid() {
    const grid = document.getElementById('inventory-grid');
    if (grid) grid.innerHTML = generateProductCards();
    filterInventory();
    refreshInvKpis();
  }
  function _refreshMovesPanel() {
    const tb = document.getElementById('moves-tbody');
    if (tb) tb.innerHTML = generateMovementRows();
  }
  function _refreshCategoriesPanel() {
    const el = document.getElementById('cat-list');
    if (el) el.innerHTML = generateCategoryList();
  }
  window.switchInvTab = function(btn, tab) {
    ['products','movements','adjust','categories'].forEach(t => {
      const panel = document.getElementById('inv-panel-' + t);
      if (panel) panel.style.display = (t === tab) ? '' : 'none';
    });
    if (btn && btn.closest('.tabs')) {
      btn.closest('.tabs').querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    }
    if (tab === 'movements')  _refreshMovesPanel();
    if (tab === 'categories') _refreshCategoriesPanel();
  };

  window.goToAddCategory = function() {
    if (typeof window.closeModal === 'function') window.closeModal('new-product-modal');
    let catBtn = null;
    document.querySelectorAll('.tabs .tab-btn').forEach(b => {
      if ((b.getAttribute('onclick') || '').includes("'categories'")) catBtn = b;
    });
    if (typeof window.switchInvTab === 'function') window.switchInvTab(catBtn, 'categories');
    const input = document.getElementById('cat-name');
    if (input) { input.focus(); input.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
  };

  window.filterInventory = function() {
    const q   = (document.getElementById('inv-search')?.value || '').trim().toLowerCase();
    const cat = document.getElementById('inv-cat-filter')?.value || 'all';
    document.querySelectorAll('#inventory-grid .product-card').forEach(card => {
      const name = card.getAttribute('data-prod-name') || '';
      const sku  = card.getAttribute('data-prod-sku') || '';
      const pcat = card.getAttribute('data-prod-cat') || '';
      const okText = !q || name.includes(q) || sku.includes(q);
      const okCat  = (cat === 'all' || cat === '') || pcat === cat;
      card.style.display = (okText && okCat) ? '' : 'none';
    });
  };

  window.refreshInvKpis = function() {
    const list = window._products || [];
    let inStock = 0, low = 0, out = 0;
    let valUSD = 0, valSYP = 0, valTRY = 0;
    let saleUSD = 0, saleSYP = 0, saleTRY = 0;
    list.forEach(p => {
      const s = Number(p.stock) || 0;
      const m = _prodMin(p);
      if (s <= 0) out++;
      else { inStock++; if (s <= m) low++; }
      const cur = p.currency || 'SYP';
      const costVal = s * (Number(p.cost)  || 0);
      const saleVal = s * (Number(p.price) || 0);
      if (window.Currency) {
        valUSD  += window.Currency.convert(costVal, cur, 'USD');
        valSYP  += window.Currency.convert(costVal, cur, 'SYP');
        valTRY  += window.Currency.convert(costVal, cur, 'TRY');
        saleUSD += window.Currency.convert(saleVal, cur, 'USD');
        saleSYP += window.Currency.convert(saleVal, cur, 'SYP');
        saleTRY += window.Currency.convert(saleVal, cur, 'TRY');
      } else {
        valSYP  += costVal;
        saleSYP += saleVal;
      }
    });
    const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
    const fmtCur = (val, code) => {
      if (!window.Currency) return (Number(val)||0).toLocaleString('en-US');
      const d = window.Currency.digits(code);
      return (Number(val)||0).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d })
             + ' ' + window.Currency.symbol(code);
    };
    set('inv-kpi-total', list.length);
    set('inv-kpi-instock', inStock);
    set('inv-kpi-low', low);
    set('inv-kpi-out', out);
    set('inv-value-usd', fmtCur(valUSD, 'USD'));
    set('inv-value-syp', fmtCur(valSYP, 'SYP'));
    set('inv-value-try', fmtCur(valTRY, 'TRY'));
    set('inv-sale-usd', fmtCur(saleUSD, 'USD'));
    set('inv-sale-syp', fmtCur(saleSYP, 'SYP'));
    set('inv-sale-try', fmtCur(saleTRY, 'TRY'));
  };
  function refreshInvKpis() { return window.refreshInvKpis(); }

  window.toggleEmojiPicker = function(which, event) {
    if (event) event.stopPropagation();
    const pickerId = 'emoji-picker-' + which;
    const picker = document.getElementById(pickerId);
    if (!picker) return;
    const isOpen = picker.style.display !== 'none';
    ['new','edit'].forEach(w => {
      const p = document.getElementById('emoji-picker-' + w);
      if (p) p.style.display = 'none';
    });
    if (!isOpen) picker.style.display = '';
  };

  window.pickProductEmoji = function(which, emoji) {
    const displayId = which === 'new' ? 'prod-emoji-display' : 'edit-prod-emoji-display';
    const inputId   = which === 'new' ? 'prod-emoji' : 'edit-prod-emoji';
    const dsp = document.getElementById(displayId);
    const inp = document.getElementById(inputId);
    if (dsp) dsp.textContent = emoji;
    if (inp) inp.value = emoji;
    const picker = document.getElementById('emoji-picker-' + which);
    if (picker) picker.style.display = 'none';
  };

  document.addEventListener('click', () => {
    ['new','edit'].forEach(w => {
      const p = document.getElementById('emoji-picker-' + w);
      if (p) p.style.display = 'none';
    });
  });

  window.editProduct = function(id) {
    const p = (window._products || []).find(x => x.id === id);
    if (!p) { showToast('error','المنتج غير موجود'); return; }
    const catSel = document.getElementById('edit-prod-cat');
    if (catSel) catSel.innerHTML = generateCategoryOptions(p.cat || p.category || 'عام');
    const supSel = document.getElementById('edit-prod-supplier');
    if (supSel) { supSel.innerHTML = generateSupplierOptions(); supSel.value = p.supplier || ''; }
    const set = (eid, v) => { const el = document.getElementById(eid); if (el) el.value = v; };
    set('edit-prod-id', p.id);
    set('edit-prod-name', p.name || '');
    set('edit-prod-sku', p.sku || '');
    set('edit-prod-currency', p.currency || 'SYP');
    set('edit-prod-price', Number(p.price) || 0);
    set('edit-prod-cost', Number(p.cost) || 0);
    set('edit-prod-min', _prodMin(p));
    if (catSel) catSel.value = p.cat || p.category || 'عام';
    const _em = p.emoji || '📦';
    set('edit-prod-emoji', _em);
    const _emDsp = document.getElementById('edit-prod-emoji-display');
    if (_emDsp) _emDsp.textContent = _em;
    openModal('edit-product-modal');
  };

  window.saveProductEdit = function() {
    const id = document.getElementById('edit-prod-id')?.value;
    const p  = (window._products || []).find(x => x.id === id);
    if (!p) { showToast('error','المنتج غير موجود'); return; }
    const name = document.getElementById('edit-prod-name')?.value.trim();
    if (!name) { showToast('error','أدخل اسم المنتج'); return; }
    const cat = document.getElementById('edit-prod-cat')?.value || 'عام';
    const supplier = document.getElementById('edit-prod-supplier')?.value || '';
    const supName = (window._suppliers||[]).find(s => s.id === supplier)?.name || '';
    p.name     = name;
    p.sku      = document.getElementById('edit-prod-sku')?.value.trim() || '';
    p.cat      = cat;
    p.category = cat;
    p.currency = document.getElementById('edit-prod-currency')?.value || 'SYP';
    p.price    = Number(document.getElementById('edit-prod-price')?.value) || 0;
    p.cost     = Number(document.getElementById('edit-prod-cost')?.value) || 0;
    p.minStock = Number(document.getElementById('edit-prod-min')?.value) || 0;
    p.supplier = supplier;
    p.supplierName = supName;
    p.emoji    = document.getElementById('edit-prod-emoji')?.value || '📦';
    window._saveData();
    _checkLowStockNotify(p);
    _refreshProductsGrid();
    closeModal('edit-product-modal');
    showToast('success', `تم تحديث المنتج ${name} ✓`);
  };

  window.openAddQty = function(id) {
    const p = (window._products || []).find(x => x.id === id);
    if (!p) { showToast('error','المنتج غير موجود'); return; }
    document.getElementById('qty-prod-id').value = p.id;
    document.getElementById('qty-prod-name').textContent = p.name;
    document.getElementById('qty-current').textContent = Number(p.stock) || 0;
    const t = document.getElementById('qty-type'); if (t) t.value = 'in';
    const a = document.getElementById('qty-amount'); if (a) a.value = '';
    const r = document.getElementById('qty-reason'); if (r) r.value = '';
    openModal('add-qty-modal');
  };

  window.confirmAddQty = function() {
    const id = document.getElementById('qty-prod-id')?.value;
    const p  = (window._products || []).find(x => x.id === id);
    if (!p) { showToast('error','المنتج غير موجود'); return; }
    const type   = document.getElementById('qty-type')?.value || 'in';
    const amount = Number(document.getElementById('qty-amount')?.value) || 0;
    const reason = document.getElementById('qty-reason')?.value.trim() || '';
    if (amount <= 0) { showToast('error','أدخل كمية صحيحة أكبر من صفر'); return; }
    if (type === 'out' && amount > (Number(p.stock) || 0)) {
      showToast('error','الكمية المطلوب صرفها أكبر من المتوفر'); return;
    }
    const signed = type === 'out' ? -amount : amount;
    recordStockMove(p, type, signed, reason || (type === 'in' ? 'استلام بضاعة' : 'صرف'));
    if (type === 'in') {
      const today = new Date().toISOString().slice(0,10).replace(/-/g,'/');
      const autoPoId = 'PO-' + Date.now().toString().slice(-6);
      const autoPo = {
        id: autoPoId,
        supplier: null, supplierName: '—',
        date: today,
        currency: p.currency || 'SYP',
        amount: amount * (Number(p.cost) || 0),
        total:  amount * (Number(p.cost) || 0),
        status: 'received',
        note: reason || 'إضافة مخزون',
        items: [{ productId: p.id, name: p.name, qty: amount, cost: Number(p.cost) || 0 }],
        createdAt: Date.now(),
      };
      window._purchases = window._purchases || [];
      window._purchases.unshift(autoPo);
    }
    _checkLowStockNotify(p);
    _refreshProductsGrid();
    _refreshMovesPanel();
    closeModal('add-qty-modal');
    showToast('success', `${type === 'in' ? 'تمت إضافة' : 'تم صرف'} ${amount} وحدة — الرصيد: ${p.stock}`);
  };

  window.toggleProductActive = function(id) {
    const p = (window._products || []).find(x => x.id === id);
    if (!p) return;
    p.active = p.active === false ? true : false;
    window._saveData();
    _refreshProductsGrid();
    showToast('success', p.active === false
      ? `تم توقيف ${p.name} — سيظهر "غير متوفر حالياً" في شاشة الكاشير`
      : `تم تفعيل ${p.name} ✓`);
  };

  window.deleteProduct = function(id) {
    const p = (window._products || []).find(x => x.id === id);
    if (!p) return;
    if (!confirm(`حذف المنتج "${p.name}"؟ لا يمكن التراجع عن هذا الإجراء.`)) return;
    window._products = (window._products || []).filter(x => x.id !== id);
    window._saveData();
    _refreshProductsGrid();
    showToast('success', `تم حذف المنتج ${p.name}`);
  };

  window.onAdjustProductChange = function() {
    const id = document.getElementById('adj-product')?.value;
    const p  = (window._products || []).find(x => x.id === id);
    const cur = document.getElementById('adj-current');
    if (cur) cur.value = p ? (Number(p.stock) || 0) : 0;
  };

  window.adjustStockSubmit = function() {
    const id = document.getElementById('adj-product')?.value;
    const p  = (window._products || []).find(x => x.id === id);
    if (!p) { showToast('error','اختر منتجاً أولاً'); return; }
    const actualRaw = document.getElementById('adj-actual')?.value;
    if (actualRaw === '' || actualRaw == null) { showToast('error','أدخل الكمية الفعلية'); return; }
    const actual = Number(actualRaw) || 0;
    const reason = document.getElementById('adj-reason')?.value.trim() || 'تسوية جرد';
    const diff = actual - (Number(p.stock) || 0);
    if (diff === 0) { showToast('info','لا يوجد فرق بين الكمية الفعلية والنظامية'); return; }
    recordStockMove(p, 'adjust', diff, reason);
    document.getElementById('adj-current').value = p.stock;
    document.getElementById('adj-actual').value = '';
    document.getElementById('adj-reason').value = '';
    _refreshProductsGrid();
    _refreshMovesPanel();
    showToast('success', `تم ضبط مخزون ${p.name} إلى ${actual} (${diff > 0 ? '+' : ''}${diff})`);
  };

  window.saveCategory = function() {
    const input = document.getElementById('cat-name');
    const name  = (input?.value || '').trim();
    if (!name) { showToast('error','أدخل اسم الفئة'); return; }
    const defaults = ['عام','مأكولات','مشروبات','قرطاسية','إلكترونيات','ملابس'];
    const exists = defaults.includes(name) || (window._categories||[]).some(c => c.name === name);
    if (exists) { showToast('warning','الفئة موجودة مسبقاً'); return; }
    if (!window._categories) window._categories = [];
    window._categories.push({ id: 'CAT-' + Date.now().toString().slice(-6), name });
    window._saveData();
    if (input) input.value = '';
    _refreshCategoriesPanel();
    const filter = document.getElementById('inv-cat-filter');
    if (filter) {
      const sel = filter.value;
      filter.innerHTML = '<option value="all">كل الفئات</option>' + generateCategoryOptions('');
      filter.value = sel;
    }
    const prodCat = document.getElementById('prod-cat');
    if (prodCat) {
      const currentVal = prodCat.value;
      prodCat.innerHTML = generateCategoryOptions(currentVal || 'عام');
      prodCat.value = name;
    }
    showToast('success', `تمت إضافة الفئة "${name}" ✓`);
  };

  window.deleteCategory = function(id) {
    const c = (window._categories || []).find(x => x.id === id);
    if (!c) return;
    if (!confirm(`حذف الفئة "${c.name}"؟ المنتجات المرتبطة بها لن تُحذف.`)) return;
    window._categories = (window._categories || []).filter(x => x.id !== id);
    window._saveData();
    _refreshCategoriesPanel();
    const filter = document.getElementById('inv-cat-filter');
    if (filter) filter.innerHTML = '<option value="all">كل الفئات</option>' + generateCategoryOptions('');
    showToast('success', `تم حذف الفئة "${c.name}"`);
  };

  window.init_inventory = function() {
    refreshInvKpis();
    const firstTab = document.querySelector('#content .tabs .tab-btn');
    ['products','movements','adjust','categories'].forEach(t => {
      const panel = document.getElementById('inv-panel-' + t);
      if (panel) panel.style.display = (t === 'products') ? '' : 'none';
    });
    _checkAllLowStock();
  };

  window.init_dashboard = function() {
    _checkAllLowStock();
    if (typeof window.renderNotifications === 'function') window.renderNotifications();
    if (typeof window.renderRevenueChart === 'function') window.renderRevenueChart('daily');
    if (typeof window.setDashPeriod === 'function') window.setDashPeriod('today', null);
    if (typeof window.autoFetchRateOnce === 'function') window.autoFetchRateOnce();
  };

  window.init_sales = function() {
    const invs = (window._invoices || []);
    const base = window.Currency ? window.Currency.base : 'SYP';
    const n  = new Date();
    const ym = `${n.getFullYear()}/${String(n.getMonth()+1).padStart(2,'0')}`;
    const monthInvs = invs.filter(inv =>
      inv.status !== 'draft' && inv.status !== 'quotation' && String(inv.date || '').startsWith(ym));
    const monthList = monthInvs
      .map(inv => ({ amount: inv.amount != null ? inv.amount : inv.total, currency: inv.currency || 'SYP' }));
    const monthTotal = _sumBase(monthList);
    const paid    = monthInvs.filter(inv => inv.status === 'paid').length;
    const pending = monthInvs.filter(inv => inv.status === 'pending').length;
    const overdue = monthInvs.filter(inv => inv.status === 'overdue').length;
    const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
    set('sales-kpi-month',   _fmt(monthTotal, base));
    set('sales-kpi-paid',    paid);
    set('sales-kpi-pending', pending);
    set('sales-kpi-overdue', overdue);
  };

  window.switchInstTab = function(btn, tab) {
    document.querySelectorAll('#inst-tab-active,#inst-tab-overdue,#inst-tab-completed,#inst-tab-schedule').forEach(el => el.style.display = 'none');
    const target = document.getElementById(`inst-tab-${tab}`);
    if (target) target.style.display = '';
    btn.closest('.tabs').querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  };
  window.calcInstallmentPreview = function() {
    const total    = parseFloat(document.getElementById('inst-total')?.value) || 0;
    const down     = parseFloat(document.getElementById('inst-down')?.value) || 0;
    const count    = parseInt(document.getElementById('inst-count')?.value) || 0;
    const interest = parseFloat(document.getElementById('inst-interest')?.value) || 0;
    const preview  = document.getElementById('inst-preview');
    if (!total || !count) { if (preview) preview.style.display = 'none'; return; }
    const remaining   = total - down;
    const withInterest = remaining * (1 + interest / 100);
    const monthly      = withInterest / count;
    if (preview) {
      preview.style.display = '';
      document.getElementById('inst-prev-monthly').textContent    = monthly.toFixed(2) + ' ل.س';
      document.getElementById('inst-prev-total').textContent      = (down + withInterest).toFixed(2) + ' ل.س';
      document.getElementById('inst-prev-remaining').textContent  = remaining.toFixed(2) + ' ل.س';
    }
  };
  window.saveInstallment = function() {
    const customer = document.getElementById('inst-customer')?.value.trim();
    const phone    = document.getElementById('inst-phone')?.value.trim();
    const product  = document.getElementById('inst-product')?.value.trim();
    const total    = parseFloat(document.getElementById('inst-total')?.value) || 0;
    const down     = parseFloat(document.getElementById('inst-down')?.value) || 0;
    const count    = parseInt(document.getElementById('inst-count')?.value) || 0;
    const startDate = document.getElementById('inst-start-date')?.value;
    const interest = parseFloat(document.getElementById('inst-interest')?.value) || 0;
    if (!customer || !product || !total || !count || !startDate) {
      showToast('warning','يرجى ملء الحقول المطلوبة');
      return;
    }
    const financed = (total - down) * (1 + interest / 100);
    const monthly  = financed / count;
    const plan = {
      id: 'INST-' + Date.now().toString().slice(-6),
      customer, phone, product,
      total, down, count, interest,
      monthly, financed,
      startDate,
      payments: [],
      createdAt: Date.now(),
    };
    window._installments = window._installments || [];
    window._installments.unshift(plan);
    window._saveData();

    closeModal('new-installment-modal');
    showToast('success', `تم إضافة خطة الأقساط لـ ${customer} ✓`);
    ['inst-customer','inst-phone','inst-product','inst-total','inst-down','inst-count','inst-start-date','inst-interest'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
    const preview = document.getElementById('inst-preview');
    if (preview) preview.style.display = 'none';

    refreshInstallments();
    if (typeof window.renderNotifications === 'function') window.renderNotifications();
  };

  const _instFmt = (n) => (Number(n) || 0).toLocaleString('en-US') + ' ل.س';
  function _instDueDate(startDate, i) {
    const d = new Date(startDate);
    if (isNaN(d)) return null;
    d.setMonth(d.getMonth() + i);
    d.setHours(0, 0, 0, 0);
    return d;
  }
  function _instDateStr(d) {
    return d ? d.toISOString().slice(0, 10) : '—';
  }
  function _instStats(p) {
    const count    = Number(p.count) || 0;
    const monthly  = Number(p.monthly) || 0;
    const financed = Number(p.financed) || (monthly * count);
    const paidCount  = (p.payments || []).length;
    const paidAmount = (p.payments || []).reduce((s, x) => s + (Number(x.amount) || 0), 0);
    const remaining  = Math.max(0, financed - paidAmount);
    const completed  = paidCount >= count;
    const today = new Date(); today.setHours(0, 0, 0, 0);

    let nextDue = null, overdueCount = 0, dueTodayCount = 0, status = 'active';
    if (completed) {
      status = 'completed';
    } else {
      nextDue = _instDueDate(p.startDate, paidCount);
      for (let i = paidCount; i < count; i++) {
        const due = _instDueDate(p.startDate, i);
        if (!due) break;
        if (due.getTime() === today.getTime()) dueTodayCount++;
        if (due < today) overdueCount++;
        else if (due > today) break;
      }
      status = overdueCount > 0 ? 'overdue' : 'active';
    }
    return { count, monthly, financed, paidCount, paidAmount, remaining,
             completed, nextDue, overdueCount, dueTodayCount, status,
             total: Number(p.total) || 0, down: Number(p.down) || 0 };
  }

  const _instStatusBadge = {
    active:    '<span class="badge badge-success">نشط</span>',
    overdue:   '<span class="badge badge-danger">متأخر</span>',
    completed: '<span class="badge badge-gray">مكتمل</span>',
  };

  function _instRow(p, idx) {
    const s = _instStats(p);
    const dueStr = s.completed ? '—' : _instDateStr(s.nextDue);
    const overdueNote = s.overdueCount > 0
      ? `<div style="font-size:var(--text-xs);color:var(--danger);">متأخر ${s.overdueCount} قسط</div>` : '';
    const payBtn = s.completed ? ''
      : `<button class="btn btn-primary btn-sm" onclick="recordInstallmentPayment('${p.id}')" title="تسجيل دفعة قسط">💵 دفع</button>`;
    return `
      <tr data-inst="${p.id}" data-ts="${window._dateToTs(p.startDate || p.createdAt)}">
        <td style="font-weight:700;color:var(--primary);">#${String(idx + 1).padStart(3, '0')}</td>
        <td>${p.customer || '—'}</td>
        <td>${p.product || '—'}</td>
        <td>${_instFmt(s.total)}</td>
        <td>${_instFmt(s.paidAmount + s.down)}<div style="font-size:var(--text-xs);color:var(--text-muted);">${s.paidCount}/${s.count} قسط</div></td>
        <td style="color:var(--warning);font-weight:700;">${_instFmt(s.remaining)}</td>
        <td style="color:var(--primary);font-weight:700;">${_instFmt(s.monthly)}</td>
        <td>${dueStr}${overdueNote}</td>
        <td>${_instStatusBadge[s.status] || ''}</td>
        <td style="white-space:nowrap;">
          ${payBtn}
          <button class="btn btn-ghost btn-sm" onclick="viewInstallmentSchedule('${p.id}')" title="جدول السداد">📆</button>
          <button class="btn btn-ghost btn-sm" onclick="deleteInstallment('${p.id}')" title="حذف">🗑️</button>
        </td>
      </tr>`;
  }

  const _instEmpty = (icon, title) =>
    `<tr><td colspan="10" style="text-align:center;padding:var(--sp-10);color:var(--text-muted);">
       <div style="font-size:3rem;">${icon}</div>
       <div style="font-weight:700;margin:var(--sp-3) 0 var(--sp-2);">${title}</div>
     </td></tr>`;

  function _instTableShell(bodyRows) {
    return `<div class="table-wrap"><table class="table">
      <thead><tr>
        <th>#</th><th>العميل</th><th>المنتج / الفاتورة</th><th>إجمالي القيمة</th>
        <th>المدفوع</th><th>المتبقي</th><th>القسط الشهري</th>
        <th>تاريخ القسط القادم</th><th>الحالة</th><th>إجراءات</th>
      </tr></thead>
      <tbody>${bodyRows}</tbody>
    </table></div>`;
  }

  window.refreshInstallments = function() {
    const plans = window._installments || [];
    const enriched = plans.map(p => ({ p, s: _instStats(p) }));

    const activeBody = document.getElementById('inst-table-body');
    if (activeBody) {
      const rows = enriched.filter(e => !e.s.completed);
      activeBody.innerHTML = rows.length
        ? rows.map((e, i) => _instRow(e.p, i)).join('')
        : `<tr><td colspan="10" style="text-align:center;padding:var(--sp-10);color:var(--text-muted);">
             <div style="font-size:3rem;">📅</div>
             <div style="font-weight:700;margin:var(--sp-3) 0 var(--sp-2);">لا توجد أقساط نشطة بعد</div>
             <button class="btn btn-primary btn-sm" onclick="openModal('new-installment-modal')">+ إضافة قسط جديد</button>
           </td></tr>`;
    }
    const overdueTab = document.getElementById('inst-tab-overdue');
    if (overdueTab) {
      const rows = enriched.filter(e => e.s.status === 'overdue');
      overdueTab.innerHTML = rows.length
        ? _instTableShell(rows.map((e, i) => _instRow(e.p, i)).join(''))
        : `<div class="empty-state"><div class="empty-icon">✅</div><div class="empty-title">لا توجد أقساط متأخرة</div></div>`;
    }
    const completedTab = document.getElementById('inst-tab-completed');
    if (completedTab) {
      const rows = enriched.filter(e => e.s.completed);
      completedTab.innerHTML = rows.length
        ? _instTableShell(rows.map((e, i) => _instRow(e.p, i)).join(''))
        : `<div class="empty-state"><div class="empty-icon">🏆</div><div class="empty-title">لا توجد أقساط مكتملة بعد</div></div>`;
    }

    let totalRemaining = 0, overdueInstallments = 0, collectedThisMonth = 0, dueToday = 0;
    const now = new Date();
    enriched.forEach(({ p, s }) => {
      if (!s.completed) totalRemaining += s.remaining;
      overdueInstallments += s.overdueCount;
      dueToday += s.dueTodayCount;
      (p.payments || []).forEach(pay => {
        const d = new Date(pay.date);
        if (!isNaN(d) && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear())
          collectedThisMonth += (Number(pay.amount) || 0);
      });
    });
    const setTxt = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
    setTxt('inst-kpi-total', _instFmt(totalRemaining));
    setTxt('inst-kpi-overdue', overdueInstallments);
    setTxt('inst-kpi-collected', _instFmt(collectedThisMonth));
    setTxt('inst-kpi-today', dueToday);
  };

  window.init_installments = function() {
    refreshInstallments();
  };

  window.recordInstallmentPayment = function(id) {
    const p = (window._installments || []).find(x => x.id === id);
    if (!p) { showToast('warning', 'الخطة غير موجودة'); return; }
    const s = _instStats(p);
    if (s.completed) { showToast('info', 'تم سداد جميع الأقساط لهذه الخطة'); return; }
    p.payments = p.payments || [];
    p.payments.push({ idx: p.payments.length, amount: Number(p.monthly) || 0, date: new Date().toISOString().slice(0, 10) });
    window._saveData();
    refreshInstallments();
    if (typeof window.renderNotifications === 'function') window.renderNotifications();
    const after = _instStats(p);
    showToast('success', after.completed
      ? `تم سداد القسط الأخير لـ ${p.customer} — اكتملت الخطة 🏆`
      : `تم تسجيل دفعة ${_instFmt(p.monthly)} لـ ${p.customer} ✓`);
  };

  // Show the full payment schedule of a plan in the "جدول السداد" tab.
  window.viewInstallmentSchedule = function(id) {
    const p = (window._installments || []).find(x => x.id === id);
    const tab = document.getElementById('inst-tab-schedule');
    if (!p || !tab) return;
    const s = _instStats(p);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const rows = [];
    for (let i = 0; i < s.count; i++) {
      const due = _instDueDate(p.startDate, i);
      const paid = i < s.paidCount;
      let badge, color;
      if (paid)               { badge = '<span class="badge badge-success">مدفوع</span>'; color = 'var(--success)'; }
      else if (due < today)   { badge = '<span class="badge badge-danger">متأخر</span>';  color = 'var(--danger)'; }
      else if (due.getTime() === today.getTime()) { badge = '<span class="badge badge-warning">مستحق اليوم</span>'; color = 'var(--warning)'; }
      else                    { badge = '<span class="badge badge-gray">قادم</span>';     color = 'var(--text-muted)'; }
      rows.push(`<tr>
        <td style="font-weight:700;">القسط ${i + 1}</td>
        <td style="color:${color};">${_instDateStr(due)}</td>
        <td style="font-weight:700;">${_instFmt(p.monthly)}</td>
        <td>${badge}</td>
      </tr>`);
    }
    tab.innerHTML = `
      <div style="margin-bottom:var(--sp-4);padding:var(--sp-4);background:var(--surface-2);border-radius:var(--r-lg);">
        <div style="font-weight:800;font-size:var(--text-lg);">${p.customer} — ${p.product}</div>
        <div style="color:var(--text-muted);font-size:var(--text-sm);margin-top:4px;">
          الإجمالي: ${_instFmt(s.total)} • المدفوع: ${s.paidCount}/${s.count} • المتبقي: ${_instFmt(s.remaining)}
        </div>
      </div>
      <div class="table-wrap"><table class="table">
        <thead><tr><th>القسط</th><th>تاريخ الاستحقاق</th><th>القيمة</th><th>الحالة</th></tr></thead>
        <tbody>${rows.join('')}</tbody>
      </table></div>`;
    document.querySelectorAll('#inst-tab-active,#inst-tab-overdue,#inst-tab-completed,#inst-tab-schedule')
      .forEach(el => el.style.display = 'none');
    tab.style.display = '';
    const tabBtns = document.querySelectorAll('.module-wrap .tabs .tab-btn');
    tabBtns.forEach(b => b.classList.remove('active'));
    if (tabBtns[3]) tabBtns[3].classList.add('active');
  };

  window.deleteInstallment = function(id) {
    const p = (window._installments || []).find(x => x.id === id);
    if (!p) return;
    document.getElementById('confirm-title').textContent = 'حذف خطة الأقساط';
    document.getElementById('confirm-msg').textContent =
      `هل أنت متأكد من حذف خطة الأقساط الخاصة بـ "${p.customer}"؟ لا يمكن التراجع.`;
    openModal('confirm-modal');
    document.getElementById('confirm-ok').onclick = () => {
      window._installments = (window._installments || []).filter(x => x.id !== id);
      window._saveData();
      closeModal('confirm-modal');
      refreshInstallments();
      if (typeof window.renderNotifications === 'function') window.renderNotifications();
      showToast('success', 'تم حذف خطة الأقساط ✓');
    };
  };

  window.switchComTab = function(btn, tab) {
    document.querySelectorAll('#com-tab-targets,#com-tab-reps,#com-tab-commissions,#com-tab-leaderboard').forEach(el => el.style.display = 'none');
    const target = document.getElementById(`com-tab-${tab}`);
    if (target) target.style.display = '';
    btn.closest('.tabs').querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  };
  function _invMatchesRep(inv, name) {
    const target = String(name || '').trim().toLowerCase();
    if (!target) return false;
    return [inv.rep, inv.cashier, inv.cashierUser].some(
      v => String(v || '').trim().toLowerCase() === target
    );
  }
  function _repSales(name, start, end) {
    const s = start ? String(start).replace(/-/g,'/') : null;
    const e = end   ? String(end).replace(/-/g,'/')   : null;
    const list = (window._invoices || []).filter(inv => {
      if (inv.status === 'draft' || inv.status === 'quotation') return false;
      if (!_invMatchesRep(inv, name)) return false;
      const d = String(inv.date || '');
      if (s && d < s) return false;
      if (e && d > e) return false;
      return true;
    }).map(inv => ({ amount: inv.amount != null ? inv.amount : inv.total, currency: inv.currency || 'SYP' }));
    return _sumBase(list);
  }
  function _repMonthSales(name) {
    const n = new Date();
    const mm = String(n.getMonth()+1).padStart(2,'0');
    return _repSales(name, `${n.getFullYear()}/${mm}/01`, `${n.getFullYear()}/${mm}/31`);
  }

  function generateTargetRows() {
    const list = window._salesTargets || [];
    if (!list.length) {
      return `<tr><td colspan="9" style="text-align:center;padding:var(--sp-10);color:var(--text-muted);">
        <div style="font-size:3rem;">🎯</div>
        <div style="font-weight:700;margin:var(--sp-3) 0 var(--sp-2);">لا توجد أهداف مبيعات بعد</div>
        <button class="btn btn-primary btn-sm" onclick="openModal('new-target-modal')">+ إضافة هدف</button>
      </td></tr>`;
    }
    const base = window.Currency ? window.Currency.base : 'SYP';
    const periodLabels = { monthly:'شهري', quarterly:'ربع سنوي', yearly:'سنوي', custom:'مخصص' };
    return list.map((t, i) => {
      const achieved = _repSales(t.rep, t.start, t.end);
      const value    = Number(t.value) || 0;
      const pct      = value > 0 ? Math.min(100, Math.round(achieved / value * 100)) : 0;
      const reached  = value > 0 && achieved >= value;
      const earned   = achieved * (Number(t.rate)||0) / 100 + (reached ? (Number(t.bonus)||0) : 0);
      return `<tr data-target="${t.id}">
        <td style="font-weight:700;color:var(--primary);">#${String(i+1).padStart(2,'0')}</td>
        <td>${t.rep}</td>
        <td>${periodLabels[t.period] || t.period} (${t.start} → ${t.end})</td>
        <td style="font-weight:700;">${_fmt(value, base)}</td>
        <td>${_fmt(achieved, base)}</td>
        <td><div class="progress" style="height:8px;"><div class="progress-fill" style="width:${pct}%;"></div></div><span style="font-size:var(--text-xs);">${pct}%</span></td>
        <td style="font-weight:700;color:var(--success);">${_fmt(earned, base)}</td>
        <td><span class="badge ${reached?'badge-success':'badge-warning'}">${reached?'محقق':'جارٍ'}</span></td>
        <td><button class="btn btn-ghost btn-sm" onclick="deleteTarget('${t.id}')">🗑️</button></td>
      </tr>`;
    }).join('');
  }

  function generateRepRows() {
    const list = window._salesReps || [];
    if (!list.length) {
      return `<tr><td colspan="8" style="text-align:center;padding:var(--sp-8);color:var(--text-muted);">
        <div style="font-size:2rem;">👥</div>
        <div style="font-weight:700;margin-top:var(--sp-2);">لا يوجد مندوبون مضافون</div>
      </td></tr>`;
    }
    const base = window.Currency ? window.Currency.base : 'SYP';
    return list.map((r, i) => {
      const sales      = _repMonthSales(r.name);
      const commission = sales * (Number(r.rate)||0) / 100;
      return `<tr data-rep="${r.id}">
        <td>${i+1}</td>
        <td style="font-weight:700;">${r.name}</td>
        <td>${r.dept || '—'}</td>
        <td style="color:var(--primary);font-weight:700;">${Number(r.rate)||0}%</td>
        <td>${_fmt(sales, base)}</td>
        <td style="color:var(--success);font-weight:700;">${_fmt(commission, base)}</td>
        <td><span class="badge badge-success">نشط</span></td>
        <td><button class="btn btn-ghost btn-sm" onclick="deleteRep('${r.id}')">🗑️</button></td>
      </tr>`;
    }).join('');
  }

  function _allRepNames() {
    const map = new Map();
    (window._salesReps || []).forEach(r => {
      const n = String(r.name || '').trim();
      if (n) map.set(n.toLowerCase(), n);
    });
    (window._salesTargets || []).forEach(t => {
      const n = String(t.rep || '').trim();
      if (n && !map.has(n.toLowerCase())) map.set(n.toLowerCase(), n);
    });
    return [...map.values()];
  }
  function _repRate(name) {
    const r = (window._salesReps || []).find(
      x => String(x.name || '').trim().toLowerCase() === String(name).trim().toLowerCase()
    );
    return r ? (Number(r.rate) || 0) : 0;
  }
  function _repTargetEarnings(name) {
    let earned = 0;
    (window._salesTargets || []).forEach(t => {
      if (String(t.rep || '').trim().toLowerCase() !== String(name).trim().toLowerCase()) return;
      const achieved = _repSales(t.rep, t.start, t.end);
      const value    = Number(t.value) || 0;
      const reached  = value > 0 && achieved >= value;
      earned += achieved * (Number(t.rate) || 0) / 100 + (reached ? (Number(t.bonus) || 0) : 0);
    });
    return earned;
  }

  function generateCommissionRows() {
    const names = _allRepNames();
    if (!names.length) {
      return `<tr><td colspan="7" style="text-align:center;padding:var(--sp-8);color:var(--text-muted);">
        <div style="font-size:2rem;">💵</div>
        <div style="font-weight:700;margin-top:var(--sp-2);">لا توجد عمولات محسوبة بعد</div>
        <div style="font-size:var(--text-sm);margin-top:var(--sp-1);">أضف مندوبين وحدد أهدافاً لبدء احتساب العمولات</div>
      </td></tr>`;
    }
    const base = window.Currency ? window.Currency.base : 'SYP';
    return names.map((name, i) => {
      const monthSales    = _repMonthSales(name);
      const rate          = _repRate(name);
      const repCommission = monthSales * rate / 100;
      const targetEarn    = _repTargetEarnings(name);
      const total         = repCommission + targetEarn;
      return `<tr>
        <td style="font-weight:700;color:var(--primary);">${i + 1}</td>
        <td style="font-weight:700;">${name}</td>
        <td>${_fmt(monthSales, base)}</td>
        <td style="color:var(--primary);font-weight:700;">${rate}%</td>
        <td>${_fmt(repCommission, base)}</td>
        <td>${_fmt(targetEarn, base)}</td>
        <td style="color:var(--success);font-weight:800;">${_fmt(total, base)}</td>
      </tr>`;
    }).join('');
  }

  function generateLeaderboardRows() {
    const names = _allRepNames();
    if (!names.length) {
      return `<tr><td colspan="4" style="text-align:center;padding:var(--sp-8);color:var(--text-muted);">
        <div style="font-size:2rem;">🏆</div>
        <div style="font-weight:700;margin-top:var(--sp-2);">لا يوجد مندوبون بعد</div>
      </td></tr>`;
    }
    const base = window.Currency ? window.Currency.base : 'SYP';
    const rows = names.map(name => {
      const sales = _repMonthSales(name);
      let tv = 0, ta = 0;
      (window._salesTargets || []).forEach(t => {
        if (String(t.rep || '').trim().toLowerCase() !== name.trim().toLowerCase()) return;
        tv += Number(t.value) || 0;
        ta += _repSales(t.rep, t.start, t.end);
      });
      const pct = tv > 0 ? Math.min(100, Math.round(ta / tv * 100)) : null;
      return { name, sales, pct };
    }).sort((a, b) => b.sales - a.sales);
    const medals = ['🥇', '🥈', '🥉'];
    return rows.map((r, i) => {
      const rank = medals[i] || `<span style="font-weight:700;">${i + 1}</span>`;
      const prog = r.pct == null
        ? '<span style="color:var(--text-muted);">—</span>'
        : `<div class="progress" style="height:8px;"><div class="progress-fill" style="width:${r.pct}%;"></div></div><span style="font-size:var(--text-xs);">${r.pct}%</span>`;
      return `<tr>
        <td style="font-size:1.2rem;">${rank}</td>
        <td style="font-weight:700;">${r.name}</td>
        <td style="font-weight:700;">${_fmt(r.sales, base)}</td>
        <td>${prog}</td>
      </tr>`;
    }).join('');
  }

  window.init_commissions = function() {
    const base = window.Currency ? window.Currency.base : 'SYP';
    const targets = window._salesTargets || [];
    const reps    = window._salesReps || [];
    let totalTarget = 0, totalAchieved = 0, totalCommission = 0;
    targets.forEach(t => {
      const achieved = _repSales(t.rep, t.start, t.end);
      const value    = Number(t.value) || 0;
      const reached  = value > 0 && achieved >= value;
      totalTarget     += value;
      totalAchieved   += achieved;
      totalCommission += achieved * (Number(t.rate)||0) / 100 + (reached ? (Number(t.bonus)||0) : 0);
    });
    const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
    set('com-kpi-target',     _fmt(totalTarget, base));
    set('com-kpi-achieved',   _fmt(totalAchieved, base));
    set('com-kpi-commission', _fmt(totalCommission, base));
    set('com-kpi-reps',       reps.length);
    const tb = document.getElementById('targets-table-body');      if (tb) tb.innerHTML = generateTargetRows();
    const rb = document.getElementById('reps-table-body');         if (rb) rb.innerHTML = generateRepRows();
    const cb = document.getElementById('commissions-table-body');  if (cb) cb.innerHTML = generateCommissionRows();
    const lb = document.getElementById('leaderboard-table-body');  if (lb) lb.innerHTML = generateLeaderboardRows();
  };

  window.saveTarget = function() {
    const rep    = document.getElementById('tgt-rep')?.value.trim();
    const period = document.getElementById('tgt-period')?.value;
    const start  = document.getElementById('tgt-start')?.value;
    const end    = document.getElementById('tgt-end')?.value;
    const value  = parseFloat(document.getElementById('tgt-value')?.value) || 0;
    const rate   = parseFloat(document.getElementById('tgt-commission')?.value) || 0;
    const bonus  = parseFloat(document.getElementById('tgt-bonus')?.value) || 0;
    if (!rep || !start || !end || !value) {
      showToast('warning','يرجى ملء الحقول المطلوبة');
      return;
    }
    const tgt = {
      id: 'TGT-' + Date.now().toString().slice(-6),
      rep, period,
      start: start.replace(/-/g,'/'),
      end:   end.replace(/-/g,'/'),
      value, rate, bonus,
    };
    window._salesTargets = window._salesTargets || [];
    window._salesTargets.unshift(tgt);
    window._saveData();
    closeModal('new-target-modal');
    if (typeof window.init_commissions === 'function') window.init_commissions();
    showToast('success', `تم إضافة هدف لـ ${rep} ✓`);
    ['tgt-rep','tgt-start','tgt-end','tgt-value','tgt-commission','tgt-bonus'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  };
  window.deleteTarget = function(id) {
    window._salesTargets = (window._salesTargets || []).filter(t => t.id !== id);
    window._saveData();
    if (typeof window.init_commissions === 'function') window.init_commissions();
  };

  window.saveRep = function() {
    const name = document.getElementById('rep-name')?.value.trim();
    const dept = document.getElementById('rep-dept')?.value.trim();
    const rate = parseFloat(document.getElementById('rep-rate')?.value) || 0;
    if (!name) { showToast('warning','يرجى إدخال اسم المندوب'); return; }
    const rep = { id: 'REP-' + Date.now().toString().slice(-6), name, dept, rate };
    window._salesReps = window._salesReps || [];
    window._salesReps.unshift(rep);
    window._saveData();
    closeModal('new-rep-modal');
    if (typeof window.init_commissions === 'function') window.init_commissions();
    showToast('success', `تم إضافة المندوب ${name} ✓`);
    ['rep-name','rep-dept','rep-rate'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  };
  window.deleteRep = function(id) {
    window._salesReps = (window._salesReps || []).filter(r => r.id !== id);
    window._saveData();
    if (typeof window.init_commissions === 'function') window.init_commissions();
  };

  window.setView = (v) => {
    const grid = document.getElementById('inventory-grid');
    if (!grid) return;
    if (v === 'list') {
      grid.style.gridTemplateColumns = '1fr';
    } else {
      grid.style.gridTemplateColumns = 'repeat(auto-fill,minmax(min(100%,200px),1fr))';
    }
  };
  window.confirmDelete = (name) => {
    document.getElementById('confirm-title').textContent = 'تأكيد الحذف';
    document.getElementById('confirm-msg').textContent = `هل أنت متأكد من حذف "${name}"؟ لا يمكن التراجع عن هذا الإجراء.`;
    openModal('confirm-modal');
    document.getElementById('confirm-ok').onclick = () => {
      closeModal('confirm-modal');
      showToast('success','تم الحذف بنجاح');
    };
  };
  window.markAllRead = () => {
    document.querySelectorAll('.notif-item.unread').forEach(el => el.classList.remove('unread'));
    if (typeof window.updateNotifBadge === 'function') window.updateNotifBadge();
    showToast('success','تم تعليم جميع الإشعارات كمقروءة');
  };

  window.updateNotifBadge = function() {
    const badge = document.querySelector('#notif-btn .header-btn-badge');
    if (!badge) return;
    const hasUnread = document.querySelectorAll('.notif-item.unread').length > 0;
    badge.classList.toggle('has-notif', hasUnread);
  };

  window.buildNotifications = function() {
    const items = [];
    (window._products || []).forEach(p => {
      const stock = Number(p.stock) || 0;
      const min   = _prodMin(p);
      if (stock <= 0)
        items.push({ icon:'❌', text:`<strong>${p.name}</strong> نفد من المخزون تماماً`, time:'المخزون' });
      else if (stock <= min)
        items.push({ icon:'⚠️', text:`<strong>${p.name}</strong> قارب على النفاد — المتبقي ${stock}`, time:'المخزون' });
    });
    (window._invoices || []).forEach(inv => {
      if (inv.status === 'overdue')
        items.push({ icon:'🔴', text:`فاتورة متأخرة <strong>${inv.id}</strong>${inv.client ? ' — '+inv.client : ''}`, time:inv.date || '' });
    });
    (window._debts || []).forEach(d => {
      const rem = Math.max(0, (d.amount || 0) - (d.paid || 0));
      if ((d.status && d.status !== 'paid') && rem > 0)
        items.push({ icon:'💳', text:`دين غير مسدّد — <strong>${d.customerName || '—'}</strong>`, time:_fmt(rem, d.currency || 'SYP') });
    });
    (window._installments || []).forEach(p => {
      const s = (typeof _instStats === 'function') ? _instStats(p) : null;
      if (!s) return;
      if (s.overdueCount > 0)
        items.push({ icon:'📅', text:`<strong>${p.customer || '—'}</strong> متأخر عن سداد ${s.overdueCount} قسط — المتبقي ${_instFmt(s.remaining)}`, time:`القسط القادم: ${_instDateStr(s.nextDue)}` });
      else if (s.dueTodayCount > 0)
        items.push({ icon:'🔔', text:`قسط <strong>${p.customer || '—'}</strong> مستحق اليوم — ${_instFmt(p.monthly)}`, time:'استحقاق اليوم' });
    });
    return items;
  };

  window.renderNotifications = function() {
    const list  = document.getElementById('notif-list');
    if (!list) return;
    const items = window.buildNotifications();
    if (!items.length) {
      list.innerHTML = `<div class="empty-state" style="padding:32px 16px;text-align:center;color:var(--text-muted);">
          <div class="empty-icon" style="font-size:32px;">🔔</div>
          <div class="empty-title">لا توجد إشعارات</div>
        </div>`;
      if (typeof window.updateNotifBadge === 'function') window.updateNotifBadge();
      return;
    }
    list.innerHTML = items.map(it => `
      <div class="notif-item unread">
        <div class="notif-icon">${it.icon}</div>
        <div class="notif-body">
          <div class="notif-text">${it.text}</div>
          <div class="notif-time">${it.time || ''}</div>
        </div>
      </div>`).join('');
    if (typeof window.updateNotifBadge === 'function') window.updateNotifBadge();
  };

  window.switchChartPeriod = function(btn, period) {
    const parentTabs = btn.closest('.tabs') || btn.parentElement;
    if (parentTabs) parentTabs.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    renderRevenueChart(period);
  };

  window.renderRevenueChart = function(period) {
    period = period || 'daily';
    const chart = document.getElementById('revenue-chart');
    if (!chart) return;

    const now = new Date();
    const base = window.Currency ? window.Currency.base : 'SYP';
    const invs = (window._invoices || []).filter(inv =>
      inv && inv.date && inv.status !== 'draft' && inv.status !== 'quotation');

    const buckets = [];
    if (period === 'daily') {
      const days = ['الأحد','الإثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت'];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now); d.setDate(now.getDate() - i); d.setHours(0,0,0,0);
        buckets.push({ label: days[d.getDay()], value: 0, start: d, end: new Date(d.getTime() + 86400000) });
      }
    } else if (period === 'weekly') {
      for (let i = 5; i >= 0; i--) {
        const end = new Date(now); end.setDate(now.getDate() - i * 7); end.setHours(23,59,59,999);
        const start = new Date(end); start.setDate(end.getDate() - 6); start.setHours(0,0,0,0);
        buckets.push({ label: 'أسبوع ' + (6 - i), value: 0, start, end: new Date(end.getTime() + 1) });
      }
    } else {
      const months = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
        buckets.push({ label: months[d.getMonth()], value: 0, start: d, end });
      }
    }

    // base currency so the figures match the "إجمالي المبيعات" KPI.
    invs.forEach(inv => {
      const d = new Date(inv.date.replace(/\//g,'-'));
      if (isNaN(d)) return;
      const b = buckets.find(bk => d >= bk.start && d < bk.end);
      if (!b) return;
      const v = window.Currency
        ? window.Currency.convert(Number(inv.amount) || 0, inv.currency || 'SYP', base)
        : (Number(inv.amount) || 0);
      b.value += v;
    });

    const max = Math.max(...buckets.map(b => b.value), 0);
    if (max <= 0) {
      chart.innerHTML = `
        <div class="empty-state" style="width:100%;padding:var(--sp-8) var(--sp-4);text-align:center;color:var(--text-muted);">
          <div class="empty-icon" style="font-size:32px;">📊</div>
          <div class="empty-title">لا توجد بيانات مبيعات في هذه الفترة</div>
        </div>`;
      return;
    }

    const sym = window.Currency ? window.Currency.symbol(base) : 'ل.س';
    const digits = window.Currency ? window.Currency.digits(base) : 0;
    // Full precise amount in the base currency (e.g. ٣١٧٬٩٨٦ ل.س / 1,250.00 $).
    const fmtFull = (n) => (Number(n) || 0).toLocaleString('en-US', {
      minimumFractionDigits: digits, maximumFractionDigits: digits
    }) + ' ' + sym;

    chart.innerHTML = buckets.map(b => {
      const h = max > 0 ? Math.max((b.value / max) * 100, b.value > 0 ? 4 : 0) : 0;
      const amountFmt = fmtFull(b.value);
      const valueLabel = b.value > 0 ? amountFmt : '—';
      return `
        <div class="bar-wrap" title="${b.label}: ${amountFmt}">
          <div class="bar" style="height:${h}%;"></div>
          <div class="bar-label">${b.label}</div>
          <div class="bar-value" style="font-size:10px;font-weight:700;color:var(--primary);line-height:1.2;text-align:center;">${valueLabel}</div>
        </div>`;
    }).join('');
  };

  window.exportDashboard = function() {
    const statusMap = { paid:'مدفوعة', pending:'معلقة', overdue:'متأخرة', draft:'مسودة', quotation:'عرض سعر' };
    const rows = [['#','العميل','المبلغ','طريقة الدفع','الحالة','التاريخ']];
    (window._invoices || []).forEach((inv, i) => {
      rows.push([i+1, inv.client, inv.amount, inv.method, statusMap[inv.status]||inv.status, inv.date]);
    });
    if (rows.length === 1) { showToast('warning','لا توجد بيانات للتصدير'); return; }
    exportToCSV(rows, 'dashboard-report.csv');
    showToast('success','تم تصدير تقرير لوحة التحكم ✓');
  };

  window.viewInvoice = function(id) {
    const inv = (window._invoices || []).find(i => i.id === id);
    if (!inv) { showToast('warning','الفاتورة غير موجودة'); return; }
    const statusLabel = { paid:'مدفوعة ✓', pending:'معلقة ⏳', overdue:'متأخرة ⚠️', draft:'مسودة', quotation:'عرض سعر' };
    const badgeClass  = { paid:'badge-success', pending:'badge-warning', overdue:'badge-danger', draft:'badge-gray', quotation:'badge-gray' };
    const body = document.getElementById('view-inv-body');
    if (body) {
      body.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:start;flex-wrap:wrap;gap:var(--sp-4);margin-bottom:var(--sp-6);">
          <div>
            <div style="font-size:var(--text-2xl);font-weight:800;color:var(--primary);">${inv.id}</div>
            <div style="color:var(--text-muted);font-size:var(--text-sm);">${inv.date}</div>
          </div>
          <span class="badge ${badgeClass[inv.status]||'badge-gray'}" style="font-size:var(--text-sm);padding:6px 16px;">${statusLabel[inv.status]||inv.status}</span>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--sp-4);margin-bottom:var(--sp-5);">
          <div style="padding:var(--sp-4);background:var(--surface-2);border-radius:var(--r-lg);">
            <div style="font-size:var(--text-xs);color:var(--text-muted);margin-bottom:4px;">العميل</div>
            <div style="font-weight:700;">${inv.client}</div>
          </div>
          <div style="padding:var(--sp-4);background:var(--surface-2);border-radius:var(--r-lg);">
            <div style="font-size:var(--text-xs);color:var(--text-muted);margin-bottom:4px;">طريقة الدفع</div>
            <div style="font-weight:700;">${_fmtMethodCur(inv)}</div>
          </div>
        </div>
        <div style="padding:var(--sp-5);background:var(--surface-2);border-radius:var(--r-lg);text-align:center;">
          <div style="font-size:var(--text-xs);color:var(--text-muted);margin-bottom:4px;">إجمالي الفاتورة</div>
          <div style="font-size:var(--text-3xl);font-weight:800;color:var(--primary);">${_fmtInvAmount(inv)}</div>
        </div>
        ${(inv.items && inv.items.length) ? `
        <div style="margin-top:var(--sp-5);">
          <div style="font-size:var(--text-xs);color:var(--text-muted);margin-bottom:var(--sp-3);font-weight:600;text-transform:uppercase;letter-spacing:.04em;">تفاصيل الأصناف</div>
          <div class="table-wrap" style="margin:0;">
            <table class="table" style="margin:0;">
              <thead><tr><th>الصنف</th><th>الكمية</th><th>السعر</th><th>الإجمالي</th></tr></thead>
              <tbody>
                ${(inv.items || []).map(it => {
                  const isSvc = it.type === 'service';
                  const C = window.Currency;
                  let priceStr, totalStr;
                  if (isSvc && it.servicePriceDisplay != null && it.serviceCurrency) {
                    const sc  = it.serviceCurrency;
                    const sym = C ? C.symbol(sc) : sc;
                    const d   = C ? C.digits(sc) : 0;
                    priceStr = Number(it.servicePriceDisplay).toLocaleString('en-US',{minimumFractionDigits:d,maximumFractionDigits:d}) + ' ' + sym;
                    totalStr = (Number(it.servicePriceDisplay) * (it.qty||1)).toLocaleString('en-US',{minimumFractionDigits:d,maximumFractionDigits:d}) + ' ' + sym;
                  } else {
                    const cur = inv.currency || 'SYP';
                    priceStr = _fmt(it.price || 0, cur);
                    totalStr = _fmt((it.price || 0) * (it.qty || 1), cur);
                  }
                  return `<tr>
                    <td>
                      ${isSvc ? '<span style="margin-left:4px;">⚙️</span>' : ''}
                      <span style="font-weight:600;">${it.name}</span>
                      ${isSvc ? '<span class="badge badge-info" style="margin-right:6px;font-size:10px;">خدمة</span>' : ''}
                      ${isSvc && it.notes ? `<div style="font-size:var(--text-xs);color:var(--text-muted);margin-top:2px;">${it.notes}</div>` : ''}
                    </td>
                    <td style="text-align:center;">×${it.qty||1}</td>
                    <td>${priceStr}</td>
                    <td style="font-weight:700;">${totalStr}</td>
                  </tr>`;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>
        ${(() => {
          const cogs   = _invoiceCOGS(inv);
          const base   = window.Currency ? window.Currency.base : (inv.currency || 'SYP');
          const invAmt = window.Currency ? window.Currency.convert(inv.amount||0, inv.currency||'SYP', base) : (inv.amount||0);
          const profit = invAmt - cogs;
          const pColor = profit > 0 ? 'var(--success)' : (profit < 0 ? 'var(--danger)' : 'var(--text-muted)');
          return `<div style="margin-top:var(--sp-4);padding:var(--sp-4);background:var(--surface-2);border-radius:var(--r-lg);display:flex;flex-direction:column;gap:var(--sp-2);">
            <div style="display:flex;justify-content:space-between;font-size:var(--text-sm);color:var(--text-muted);">
              <span>التكلفة (COGS)</span><span>${_fmt(cogs, base)}</span>
            </div>
            <div style="display:flex;justify-content:space-between;font-size:var(--text-sm);font-weight:700;color:${pColor};">
              <span>صافي الربح</span><span>${_fmt(profit, base)}</span>
            </div>
          </div>`;
        })()}
        ` : ''}
        ${inv.notes ? `<div style="margin-top:var(--sp-4);padding:var(--sp-3) var(--sp-4);background:var(--surface-2);border-radius:var(--r-lg);font-size:var(--text-sm);color:var(--text-muted);">📝 ${inv.notes}</div>` : ''}`;
    }
    const printBtn = document.getElementById('view-inv-print-btn');
    if (printBtn) printBtn.onclick = () => { closeModal('view-invoice-modal'); printInvoice(id); };
    openModal('view-invoice-modal');
  };

  window.printInvoice = function(id) {
    const inv = (window._invoices||[]).find(i=>i.id===id) || { id, client:'—', amount:0, method:'—', date:'—', status:'—' };
    const statusMap = { paid:'مدفوعة', pending:'معلقة', overdue:'متأخرة', draft:'مسودة', quotation:'عرض سعر' };
    generatePDF(`فاتورة ${inv.id}`, `
      <table>
        <thead><tr><th>البيان</th><th>التفاصيل</th></tr></thead>
        <tbody>
          <tr><td>رقم الفاتورة</td><td>${inv.id}</td></tr>
          <tr><td>العميل</td><td>${inv.client}</td></tr>
          <tr><td>التاريخ</td><td>${inv.date}</td></tr>
          <tr><td>طريقة الدفع</td><td>${_fmtMethodCur(inv)}</td></tr>
          <tr><td>الحالة</td><td>${statusMap[inv.status]||inv.status}</td></tr>
        </tbody>
      </table>
      <div class="totals">
        <table>
          <tr class="total-final"><td>الإجمالي</td><td>${_fmtInvAmount(inv)}</td></tr>
        </table>
      </div>
    `);
  };

  let _invPanelSort = 'newest';
  function _invPanelTs(inv) {
    if (inv.createdAt != null) {
      const c = typeof inv.createdAt === 'number' ? inv.createdAt : Date.parse(inv.createdAt);
      if (!isNaN(c)) return c;
    }
    if (inv.date) { const d = Date.parse(String(inv.date).replace(/\//g,'-')); if (!isNaN(d) && d > 0) return d; }
    return 0;
  }
  function _invPanelSorted() {
    const list = (window._invoices || []).slice();
    list.sort((a, b) => _invPanelSort === 'newest' ? _invPanelTs(b) - _invPanelTs(a) : _invPanelTs(a) - _invPanelTs(b));
    return list;
  }
  window.openInvoicesPanel = function() {
    _invPanelSort = 'newest';
    const sEl = document.getElementById('inv-panel-search'); if (sEl) sEl.value = '';
    const allChk = document.getElementById('inv-panel-check-all'); if (allChk) allChk.checked = false;
    const nb = document.getElementById('inv-panel-sort-newest');
    const ob = document.getElementById('inv-panel-sort-oldest');
    if (nb) { nb.classList.add('btn-primary'); nb.classList.remove('btn-secondary'); }
    if (ob) { ob.classList.add('btn-secondary'); ob.classList.remove('btn-primary'); }
    renderInvPanelList(_invPanelSorted());
    updateInvPanelCount();
    openModal('inv-panel-modal');
  };
  window.setInvPanelSort = function(order, btn) {
    _invPanelSort = order;
    ['inv-panel-sort-newest','inv-panel-sort-oldest'].forEach(id => {
      const b = document.getElementById(id);
      if (b) { b.classList.remove('btn-primary'); b.classList.add('btn-secondary'); }
    });
    if (btn) { btn.classList.remove('btn-secondary'); btn.classList.add('btn-primary'); }
    filterInvPanel();
  };
  function _invPanelFiltered() {
    const q = (document.getElementById('inv-panel-search')?.value || '').toLowerCase();
    let list = _invPanelSorted();
    if (q) list = list.filter(inv => (inv.id || '').toLowerCase().includes(q) || (inv.client || '').toLowerCase().includes(q));
    return list;
  }
  window.filterInvPanel = function() {
    const allChk = document.getElementById('inv-panel-check-all'); if (allChk) allChk.checked = false;
    renderInvPanelList(_invPanelFiltered());
    updateInvPanelCount();
  };
  function renderInvPanelList(list) {
    const st = {
      paid:      ['badge-success','مدفوعة'],
      pending:   ['badge-warning','معلقة'],
      overdue:   ['badge-danger','متأخرة'],
      draft:     ['badge-gray','مسودة'],
      quotation: ['badge-gray','عرض سعر'],
    };
    document.getElementById('inv-panel-tbody').innerHTML = list.map((r, i) => {
      const amount = _fmtInvAmount(r);
      return `
      <tr>
        <td style="text-align:center;"><input type="checkbox" class="inv-panel-check" value="${r.id}" onchange="updateInvPanelCount()" /></td>
        <td style="color:var(--text-muted);">${i + 1}</td>
        <td style="font-weight:700;color:var(--primary);">${r.id}</td>
        <td>${r.client || '—'}</td>
        <td style="font-weight:700;">${amount}</td>
        <td><span class="badge ${st[r.status]?.[0] || 'badge-gray'}">${st[r.status]?.[1] || r.status || '—'}</span></td>
        <td style="color:var(--text-muted);">${r.date || '—'}</td>
        <td>${invoiceSeller(r)}</td>
        <td style="text-align:center;"><button class="btn btn-ghost btn-sm" onclick="printInvoicesByIds(['${r.id}'])" title="طباعة الفاتورة">🖨️</button></td>
      </tr>`;
    }).join('') || '<tr><td colspan="9" style="text-align:center;color:var(--text-muted);padding:var(--sp-8);">لا توجد فواتير بعد</td></tr>';
  }
  window.toggleAllInvPanel = function(master) {
    document.querySelectorAll('#inv-panel-tbody .inv-panel-check').forEach(c => { c.checked = master.checked; });
    updateInvPanelCount();
  };
  window.updateInvPanelCount = function() {
    const n = document.querySelectorAll('#inv-panel-tbody .inv-panel-check:checked').length;
    const btn = document.getElementById('inv-panel-print-btn');
    if (btn) { btn.textContent = `🖨️ طباعة الفواتير المحددة (${n})`; btn.disabled = n === 0; }
  };
  window.printSelectedInvPanel = function() {
    const ids = Array.from(document.querySelectorAll('#inv-panel-tbody .inv-panel-check:checked')).map(c => c.value);
    if (!ids.length) { showToast('warning', 'حدّد فاتورة واحدة على الأقل'); return; }
    printInvoicesByIds(ids);
  };
  function _invoicePrintBlock(inv, pageBreak) {
    const statusMap = { paid:'مدفوعة', pending:'معلقة', overdue:'متأخرة', draft:'مسودة', quotation:'عرض سعر' };
    const f = (v) => window.Currency ? window.Currency.formatCompact(v || 0, inv.currency) : (Number(v)||0).toLocaleString('en-US') + ' ل.س';
    const itemsTable = (Array.isArray(inv.items) && inv.items.length)
      ? `<table style="margin-top:10px;">
           <thead><tr><th>المنتج/الخدمة</th><th>الكمية</th><th>السعر</th><th>الإجمالي</th></tr></thead>
           <tbody>${inv.items.map(it => {
             const qty = Number(it.qty) || 0, price = Number(it.price) || 0;
             const lt = it.total != null ? Number(it.total) : qty * price;
             return `<tr><td>${it.name || '—'}</td><td>${qty}</td><td>${f(price)}</td><td>${f(lt)}</td></tr>`;
           }).join('')}</tbody>
         </table>`
      : '';
    return `
      <div style="margin-bottom:28px;${pageBreak ? 'page-break-after:always;' : ''}">
        <div class="rpt-title">فاتورة ${inv.id}</div>
        <table>
          <tbody>
            <tr><td style="width:160px;">العميل</td><td>${inv.client || '—'}</td></tr>
            <tr><td>التاريخ</td><td>${inv.date || '—'}</td></tr>
            <tr><td>طريقة الدفع</td><td>${_fmtMethodCur(inv)}</td></tr>
            <tr><td>الحالة</td><td>${statusMap[inv.status] || inv.status || '—'}</td></tr>
            <tr><td>البائع</td><td>${invoiceSeller(inv)}</td></tr>
          </tbody>
        </table>
        ${itemsTable}
        <div class="totals"><table><tr class="total-final"><td>الإجمالي</td><td>${f(inv.amount)}</td></tr></table></div>
      </div>`;
  }
  window.printInvoicesByIds = function(ids) {
    const invs = ids.map(id => (window._invoices || []).find(i => i.id === id)).filter(Boolean);
    if (!invs.length) { showToast('warning', 'تعذّر العثور على الفواتير المحددة'); return; }
    const body = invs.map((inv, i) => _invoicePrintBlock(inv, i < invs.length - 1)).join('');
    const title = invs.length > 1 ? `الفواتير المحددة (${invs.length})` : `فاتورة ${invs[0].id}`;
    generatePDF(title, body);
  };

  window.editInvoice = function(id) {
    const inv = (window._invoices || []).find(x => x.id === id);
    if (!inv) { showToast('error', 'الفاتورة غير موجودة'); return; }

    const titleEl = document.querySelector('#new-invoice-modal .modal-title');
    if (titleEl) titleEl.textContent = `تعديل الفاتورة ${id}`;

    const modal = document.getElementById('new-invoice-modal');
    if (modal) modal.dataset.editId = id;

    const cl = document.getElementById('inv-client'); if (cl) cl.value = inv.client || '';
    const dt = document.getElementById('inv-date');
    if (dt) dt.value = (inv.date || '').replace(/\//g,'-');

    const methodReverseMap = { 'نقد':'نقد', 'تحويل بنكي':'بنك', 'POS / بطاقة':'POS', 'cash':'نقد', 'bank':'بنك', 'pos':'POS' };
    const mt = document.getElementById('inv-method');
    if (mt) mt.value = methodReverseMap[inv.method] || 'نقد';

    const cu = document.getElementById('inv-currency');
    if (cu) cu.value = inv.currency || 'SYP';

    const tbody = document.getElementById('invoice-items');
    if (tbody) {
      if (Array.isArray(inv.items) && inv.items.length) {
        tbody.innerHTML = inv.items.map(it => `<tr class="inv-item-row">
          <td><input type="text" class="form-input" style="height:36px;" placeholder="اسم المنتج أو الخدمة" value="${(it.name||'').replace(/"/g,'&quot;')}" /></td>
          <td><input type="number" class="form-input" style="height:36px;width:80px;" value="${it.qty||1}" min="1" oninput="calcInvoiceTotal()" /></td>
          <td><input type="number" class="form-input" style="height:36px;width:110px;" placeholder="0" min="0" value="${it.price||0}" oninput="calcInvoiceTotal()" /></td>
          <td><input type="number" class="form-input" style="height:36px;width:80px;" value="${it.disc||0}" min="0" max="100" oninput="calcInvoiceTotal()" /></td>
          <td class="inv-row-total" style="font-weight:700;color:var(--primary);white-space:nowrap;">0 ل.س</td>
          <td><button type="button" class="btn btn-ghost btn-sm" onclick="removeInvoiceItem(this)">🗑️</button></td>
        </tr>`).join('');
      } else {
        tbody.innerHTML = `<tr class="inv-item-row">
          <td><input type="text" class="form-input" style="height:36px;" placeholder="اسم المنتج أو الخدمة" value="خدمات" /></td>
          <td><input type="number" class="form-input" style="height:36px;width:80px;" value="1" min="1" oninput="calcInvoiceTotal()" /></td>
          <td><input type="number" class="form-input" style="height:36px;width:110px;" placeholder="0" min="0" value="${Number(inv.total||inv.amount||0)}" oninput="calcInvoiceTotal()" /></td>
          <td><input type="number" class="form-input" style="height:36px;width:80px;" value="0" min="0" max="100" oninput="calcInvoiceTotal()" /></td>
          <td class="inv-row-total" style="font-weight:700;color:var(--primary);white-space:nowrap;">0 ل.س</td>
          <td><button type="button" class="btn btn-ghost btn-sm" onclick="removeInvoiceItem(this)">🗑️</button></td>
        </tr>`;
      }
    }

    const nt = document.getElementById('inv-notes'); if (nt) nt.value = inv.notes || '';

    const dl = document.getElementById('customers-datalist');
    if (dl && window._customers) dl.innerHTML = window._customers.map(c => `<option value="${c.name}">`).join('');

    if (typeof window.populateInvoiceRepSelect === 'function') window.populateInvoiceRepSelect(inv.rep || inv.cashier || '');

    calcInvoiceTotal();
    openModal('new-invoice-modal');
  };

  window.calcInvoiceTotal = function() {
    const cur = document.getElementById('inv-currency')?.value || 'SYP';
    const sym = window.Currency ? window.Currency.symbol(cur) : 'ل.س';
    let sub = 0;
    document.querySelectorAll('#invoice-items .inv-item-row').forEach(row => {
      const inputs = row.querySelectorAll('input');
      const qty   = parseFloat(inputs[1]?.value || 1);
      const price = parseFloat(inputs[2]?.value || 0);
      const disc  = parseFloat(inputs[3]?.value || 0);
      const line  = qty * price * (1 - disc / 100);
      sub += line;
      const cell = row.querySelector('.inv-row-total');
      if (cell) cell.textContent = line.toLocaleString('en-US') + ' ' + sym;
    });
    const method = document.getElementById('inv-method')?.value || 'cash';
    const posPct = method === 'pos' ? (parseFloat(window._appSettings?.posDiscount) || 0) : 0;
    const discAmt = sub * posPct / 100;
    const grand   = sub - discAmt;
    const subEl   = document.getElementById('inv-subtotal');
    const discEl  = document.getElementById('inv-discount-amount');
    const grandEl = document.getElementById('inv-grand-total');
    if (subEl)   subEl.textContent   = sub.toLocaleString('en-US') + ' ' + sym;
    if (discEl)  discEl.textContent  = discAmt > 0 ? `- ${discAmt.toLocaleString('en-US')} ${sym}` : '0 ' + sym;
    if (grandEl) grandEl.textContent = grand.toLocaleString('en-US') + ' ' + sym;
  };

  window.onInvMethodChange = function(method) {
    const posRow  = document.getElementById('inv-pos-discount-row');
    const posPct  = parseFloat(window._appSettings?.posDiscount) || 0;
    const pctEl   = document.getElementById('inv-pos-discount-pct');
    if (posRow) posRow.style.display = (method === 'pos' && posPct > 0) ? '' : 'none';
    if (pctEl)  pctEl.textContent = posPct + '%';
    calcInvoiceTotal();
  };

  window.removeInvoiceItem = function(btn) {
    const tbody = document.getElementById('invoice-items');
    const rows  = tbody ? tbody.querySelectorAll('.inv-item-row') : [];
    if (rows.length <= 1) { showToast('warning','يجب أن تحتوي الفاتورة على عنصر واحد على الأقل'); return; }
    btn.closest('tr').remove();
    calcInvoiceTotal();
  };

  window.saveInvoice = function(status) {
    const client = document.getElementById('inv-client')?.value.trim();
    const date   = document.getElementById('inv-date')?.value;
    const method = document.getElementById('inv-method')?.value || 'cash';
    if (!client) { showToast('warning','يرجى اختيار اسم العميل'); return; }
    if (!date)   { showToast('warning','يرجى تحديد تاريخ الفاتورة'); return; }
    let sub = 0; let hasItems = false;
    const items = [];
    document.querySelectorAll('#invoice-items .inv-item-row').forEach(row => {
      const inputs = row.querySelectorAll('input');
      const name  = inputs[0]?.value.trim() || '';
      const qty   = parseFloat(inputs[1]?.value || 0);
      const price = parseFloat(inputs[2]?.value || 0);
      const disc  = parseFloat(inputs[3]?.value || 0);
      if (price > 0) hasItems = true;
      const lineTotal = qty * price * (1 - disc / 100);
      sub += lineTotal;
      if (name || price > 0) {
        // Snapshot the product's cost (in the invoice currency) so profit = بيع − تكلفة
        const invCur = document.getElementById('inv-currency')?.value || 'SYP';
        const prod   = _findProduct({ name });
        let cost = 0;
        if (prod) {
          cost = window.Currency
            ? window.Currency.convert(Number(prod.cost) || 0, prod.currency || 'SYP', invCur)
            : (Number(prod.cost) || 0);
        }
        items.push({ name, qty, price, disc, cost, productId: prod ? prod.id : null });
      }
    });
    if (!hasItems) { showToast('warning','يرجى إضافة بند بسعر'); return; }
    const methodMap = { 'نقد':'نقد', 'بنك':'تحويل بنكي', 'POS':'POS / بطاقة', cash:'نقد', bank:'تحويل بنكي', pos:'POS / بطاقة' };
    const posPct    = method === 'pos' ? (parseFloat(window._appSettings?.posDiscount)||0) : 0;
    const discAmt   = sub * posPct / 100;
    const total     = sub - discAmt;
    const currency  = document.getElementById('inv-currency')?.value || 'SYP';
    const notes     = document.getElementById('inv-notes')?.value.trim() || '';
    const rep       = document.getElementById('inv-rep')?.value.trim() || '';

    const modal   = document.getElementById('new-invoice-modal');
    const editId  = modal ? modal.dataset.editId : null;

    const fxRate     = (window.Currency && window.Currency.rate)     || 0;
    const fxUsdToTry = (window.Currency && window.Currency.usdToTry) || 0;

    let savedId;
    if (editId) {
      const idx = (window._invoices || []).findIndex(x => x.id === editId);
      if (idx !== -1) {
        const prev = window._invoices[idx] || {};
        window._invoices[idx] = Object.assign(prev, {
          client, date: date.replace(/-/g,'/'), method: methodMap[method]||method,
          currency, amount: total, total, status, items, notes, rep,
          fxRate:     (prev.fxRate     != null && prev.fxRate     !== '') ? prev.fxRate     : fxRate,
          fxUsdToTry: (prev.fxUsdToTry != null && prev.fxUsdToTry !== '') ? prev.fxUsdToTry : fxUsdToTry,
          fxBase:     prev.fxBase || currency,
          updatedAt: Date.now(),
        });
      }
      savedId = editId;
      if (modal) delete modal.dataset.editId;
    } else {
      const prefix = 'fatura';
      savedId = `${prefix}-${Date.now().toString().slice(-4)}`;
      const inv = { id:savedId, client, amount:total, total, currency, method:methodMap[method]||method, status, date:date.replace(/-/g,'/'), items, notes, rep,
        fxRate, fxUsdToTry, fxBase: currency, createdAt:Date.now() };
      window._invoices = window._invoices || [];
      window._invoices.unshift(inv);
    }

    window._saveData();

    const savedInv = (window._invoices || []).find(x => x.id === savedId);
    if (savedInv && window.OfflineDB && typeof window.OfflineDB.enqueue === 'function') {
      window.OfflineDB.enqueue({ type: 'INSERT', collection: 'accounts/' + _acctKey() + '/invoices', data: savedInv })
        .catch(e => console.warn('[FS] invoice sync failed', e));
    }

    if (typeof navigate === 'function') navigate('sales');

    closeModal('new-invoice-modal');
    const lbl = status === 'draft' ? 'المسودة' : 'الفاتورة';
    showToast('success',`تم حفظ ${lbl} ${savedId} بنجاح ✓`);

    const titleEl = document.querySelector('#new-invoice-modal .modal-title');
    if (titleEl) titleEl.textContent = 'إنشاء فاتورة جديدة';
    const cl = document.getElementById('inv-client'); if (cl) cl.value = '';
    const mt = document.getElementById('inv-method'); if (mt) mt.value = 'cash';
    const cu = document.getElementById('inv-currency'); if (cu) cu.value = (window.Currency ? window.Currency.base : 'SYP');
    const pr = document.getElementById('inv-pos-discount-row'); if (pr) pr.style.display = 'none';
    const tb = document.getElementById('invoice-items');
    if (tb) tb.innerHTML = `<tr class="inv-item-row">
      <td><input type="text" class="form-input" style="height:36px;" placeholder="اسم المنتج أو الخدمة" /></td>
      <td><input type="number" class="form-input" style="height:36px;width:80px;" value="1" min="1" oninput="calcInvoiceTotal()" /></td>
      <td><input type="number" class="form-input" style="height:36px;width:110px;" placeholder="0" min="0" oninput="calcInvoiceTotal()" /></td>
      <td><input type="number" class="form-input" style="height:36px;width:80px;" value="0" min="0" max="100" oninput="calcInvoiceTotal()" /></td>
      <td class="inv-row-total" style="font-weight:700;color:var(--primary);white-space:nowrap;">0 ل.س</td>
      <td><button type="button" class="btn btn-ghost btn-sm" onclick="removeInvoiceItem(this)">🗑️</button></td>
    </tr>`;
    ['inv-subtotal','inv-discount-amount','inv-grand-total'].forEach(eid => {
      const el = document.getElementById(eid); if (el) el.textContent = '0 ل.س';
    });
    const today = new Date().toISOString().split('T')[0];
    const dateEl = document.getElementById('inv-date'); if (dateEl) dateEl.value = today;
    const ntEl = document.getElementById('inv-notes'); if (ntEl) ntEl.value = '';
  };

  window.exportInvoicesPDF = function() {
    const statusMap = { paid:'مدفوعة', pending:'معلقة', overdue:'متأخرة', draft:'مسودة', quotation:'عرض سعر' };
    const badgeMap  = { paid:'badge-paid', pending:'badge-pending', overdue:'badge-overdue', draft:'badge-draft', quotation:'badge-draft' };
    const rows = (window._invoices||[]).map((inv,i) => `
      <tr>
        <td style="font-weight:700;">${inv.id}</td>
        <td>${inv.client}</td>
        <td>${inv.date}</td>
        <td style="font-weight:700;">${_fmtInvAmount(inv)}</td>
        <td>${inv.method}</td>
        <td><span class="badge ${badgeMap[inv.status]||'badge-draft'}">${statusMap[inv.status]||inv.status}</span></td>
      </tr>`).join('');
    const total = _fmt(_sumBase((window._invoices||[]).map(i => ({ amount: i.amount||0, currency: i.currency||'SYP' }))),
                       window.Currency ? window.Currency.base : 'SYP');
    generatePDF('تقرير الفواتير والمبيعات', `
      <table>
        <thead><tr><th>رقم الفاتورة</th><th>العميل</th><th>التاريخ</th><th>المبلغ</th><th>طريقة الدفع</th><th>الحالة</th></tr></thead>
        <tbody>${rows||'<tr><td colspan="6" style="text-align:center;color:#94a3b8;">لا توجد فواتير</td></tr>'}</tbody>
      </table>
      <div class="totals">
        <table><tr class="total-final"><td>إجمالي المبيعات</td><td>${total}</td></tr></table>
      </div>
    `);
  };

  window.switchAccTab = function(btn, tab) {
    ['journal','chart','pl','balance'].forEach(t => {
      const el = document.getElementById(`acc-tab-${t}`);
      if (el) el.style.display = t === tab ? '' : 'none';
    });
    const tabs = btn.closest('.tabs');
    if (tabs) tabs.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  };

  function _accConv(amount, cur) {
    const base = window.Currency ? window.Currency.base : 'SYP';
    return window.Currency ? window.Currency.convert(Number(amount) || 0, cur || 'SYP', base)
                           : (Number(amount) || 0);
  }

  function _accComputed() {
    const invoices  = window._invoices  || [];
    const expenses  = window._expenses  || [];
    const cashbox   = window._cashbox   || [];
    const products  = window._products  || [];
    const purchases = window._purchases || [];
    const entries   = window._entries   || [];

    const salesBase    = _sumBase(invoices);
    const deposits     = _sumBase(cashbox.filter(t => t.type === 'deposit'));
    const withdrawals  = _sumBase(cashbox.filter(t => t.type === 'withdraw'));
    const expensesBase = _sumBase(expenses);
    const debtUnpaid   = _creditDebtUnpaid();

    const manualIncome  = entries.filter(e => e.type === 'income')
      .reduce((s, e) => s + _accConv(e.debit, e.currency), 0);
    const manualExpense = entries.filter(e => e.type === 'expense')
      .reduce((s, e) => s + _accConv(e.credit, e.currency), 0);

    // Cost of goods sold (تكلفة البضاعة المباعة)
    const cogs = _cogsBase();

    const catSum = (m) => _sumBase(expenses.filter(e => m(String(e.category || ''))));
    const salaries = catSum(c => c.includes('راتب'));
    const rent     = catSum(c => c.includes('إيجار'));
    const operating = Math.max(0, expensesBase - salaries - rent);

    const inventory = products.reduce(
      (s, p) => s + _accConv((Number(p.stock) || 0) * (Number(p.cost) || 0), p.currency), 0);

    const payables = _sumBase(
      purchases.filter(p => p.status === 'pending')
               .map(p => ({ amount: p.amount != null ? p.amount : p.total, currency: p.currency || 'SYP' })));

    const income  = salesBase + manualIncome;
    const expense = cogs + expensesBase + manualExpense;     // التكلفة تُحتسب ضمن المصروفات
    const profit  = income - expense;                        // = مبيعات − تكلفة − مصاريف
    const cash    = salesBase + deposits - withdrawals - expensesBase - debtUnpaid + manualIncome - manualExpense;

    const totalAssets = cash + debtUnpaid + inventory;
    const capital     = deposits;
    const retained    = totalAssets - payables - capital;

    return {
      income, expense, profit, cash, cogs,
      salesBase, manualIncome, manualExpense,
      receivable: debtUnpaid, inventory, payables,
      salaries, rent, operating,
      capital, retained, totalAssets, totalLiab: payables,
    };
  }

  function _accJournal() {
    const rows = [];
    (window._invoices || []).forEach(inv => {
      if (inv.status === 'draft' || inv.status === 'quotation') return;
      rows.push({
        sort: inv.createdAt || 0, date: inv.date || '', type: 'مبيعات',
        desc: `فاتورة ${inv.id || ''}${inv.client ? ' — ' + inv.client : ''}`.trim(),
        debit: _accConv(inv.amount != null ? inv.amount : inv.total, inv.currency), credit: 0,
      });
    });
    (window._expenses || []).forEach(e => rows.push({
      sort: e.createdAt || 0, date: e.date || '', type: e.category || 'مصروف',
      desc: e.note || ('مصروف ' + (e.category || '')), debit: 0, credit: _accConv(e.amount, e.currency),
    }));
    (window._purchases || []).forEach(p => rows.push({
      sort: p.createdAt || 0, date: p.date || '', type: 'مشتريات',
      desc: `أمر شراء ${p.id || ''}${p.supplierName ? ' — ' + p.supplierName : ''}`.trim(),
      debit: 0, credit: _accConv(p.amount != null ? p.amount : p.total, p.currency),
    }));
    (window._cashbox || []).forEach(t => rows.push({
      sort: t.createdAt || 0, date: t.date || '', type: t.type === 'deposit' ? 'إيداع' : 'سحب',
      desc: t.note || t.person || (t.type === 'deposit' ? 'إيداع نقدي' : 'سحب نقدي'),
      debit: t.type === 'deposit' ? _accConv(t.amount, t.currency) : 0,
      credit: t.type === 'withdraw' ? _accConv(t.amount, t.currency) : 0,
    }));
    (window._entries || []).forEach(e => rows.push({
      sort: e.createdAt || 0, date: e.date || '', id: e.id, manual: true,
      type: { income:'إيراد', expense:'مصروف', asset:'أصل', liability:'التزام' }[e.type] || e.type,
      desc: e.desc || '', debit: _accConv(e.debit, e.currency), credit: _accConv(e.credit, e.currency),
    }));
    rows.sort((a, b) => (b.sort || 0) - (a.sort || 0));
    return rows;
  }

  function _accJournalRows() {
    const base = window.Currency ? window.Currency.base : 'SYP';
    const rows = _accJournal();
    if (!rows.length) {
      return `<tr><td colspan="7" style="text-align:center;padding:var(--sp-10);color:var(--text-muted);">
        <div style="font-size:3rem;">📒</div>
        <div style="font-weight:700;margin:var(--sp-3) 0 var(--sp-2);">لا توجد قيود بعد</div>
        <button class="btn btn-primary btn-sm" onclick="openModal('new-entry-modal')">+ إضافة قيد</button>
      </td></tr>`;
    }
    return rows.map((r, i) => `
      <tr data-entry="${String(r.desc || '').toLowerCase()} ${String(r.type || '').toLowerCase()}" data-entry-date="${r.date || ''}">
        <td style="font-weight:700;color:var(--primary);">Q${String(i + 1).padStart(3, '0')}</td>
        <td style="white-space:nowrap;">${r.date || '—'}</td>
        <td>${r.desc || '—'}</td>
        <td><span class="badge badge-secondary">${r.type || '—'}</span></td>
        <td style="color:var(--success);font-weight:700;">${r.debit  > 0 ? _fmt(r.debit, base)  : '—'}</td>
        <td style="color:var(--danger);font-weight:700;">${r.credit > 0 ? _fmt(r.credit, base) : '—'}</td>
        <td>${r.manual
              ? `<button class="btn btn-ghost btn-sm" onclick="deleteEntry('${r.id}')" title="حذف القيد">🗑</button>`
              : `<span class="badge badge-success">تلقائي</span>`}</td>
      </tr>`).join('');
  }

  window.init_accounting = function() {
    const base = window.Currency ? window.Currency.base : 'SYP';
    const c    = _accComputed();
    const set  = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
    const money = (v) => _fmt(v, base);

    set('acc-kpi-income',  money(c.income));
    set('acc-kpi-expense', money(c.expense));
    set('acc-kpi-profit',  money(c.profit));
    set('acc-kpi-cash',    money(c.cash));

    const kp = document.getElementById('acc-kpi-profit');
    if (kp) kp.style.color = c.profit >= 0 ? 'var(--success)' : 'var(--danger)';

    set('pl-income',  money(c.income));
    set('pl-expense', money(c.expense));
    set('pl-profit',  money(c.profit));
    const pp = document.getElementById('pl-profit');
    if (pp) pp.style.color = c.profit >= 0 ? 'var(--success)' : 'var(--danger)';

    set('acc-cash',      money(c.cash));
    set('acc-bank',      money(0));
    set('acc-recv',      money(c.receivable));
    set('acc-inv',       money(c.inventory));
    set('acc-fixed',     money(0));
    set('acc-pay',       money(c.payables));
    set('acc-loans',     money(0));
    set('acc-empdue',    money(0));
    set('acc-capital',   money(c.capital));
    set('acc-retained',  money(c.retained));
    set('acc-rev-sales', money(c.salesBase));
    set('acc-rev-other', money(c.manualIncome));
    set('acc-exp-cogs',  money(c.cogs));
    set('acc-exp-op',    money(c.operating));
    set('acc-exp-sal',   money(c.salaries));
    set('acc-exp-rent',  money(c.rent));

    set('bs-cash',         money(c.cash));
    set('bs-recv',         money(c.receivable));
    set('bs-inv',          money(c.inventory));
    set('bs-assets-total', money(c.totalAssets));
    set('bs-pay',          money(c.payables));
    set('bs-liab-total',   money(c.totalLiab));
    set('bs-capital',      money(c.capital));
    set('bs-retained',     money(c.retained));
    set('bs-liabeq-total', money(c.totalLiab + c.capital + c.retained));

    const tbody = document.getElementById('entries-tbody');
    if (tbody) tbody.innerHTML = _accJournalRows();
  };

  window.deleteEntry = function(id) {
    window._entries = (window._entries || []).filter(e => e.id !== id);
    window._saveData();
    if (typeof window.init_accounting === 'function') window.init_accounting();
    showToast('success', 'تم حذف القيد ✓');
  };

  window.saveEntry = function() {
    const date   = document.getElementById('entry-date')?.value;
    const type   = document.getElementById('entry-type')?.value;
    const desc   = document.getElementById('entry-desc')?.value.trim();
    const debit  = parseFloat(document.getElementById('entry-debit')?.value  || 0);
    const credit = parseFloat(document.getElementById('entry-credit')?.value || 0);
    const notes  = document.getElementById('entry-notes')?.value.trim() || '';
    if (!date || !desc || (!debit && !credit)) {
      showToast('warning','يرجى تعبئة التاريخ والوصف وقيمة المدين أو الدائن');
      return;
    }
    const base = window.Currency ? window.Currency.base : 'SYP';
    window._entries = window._entries || [];
    window._entries.unshift({
      id: 'ENT-' + Date.now().toString().slice(-7),
      date: date.replace(/-/g, '/'),
      type, desc, notes,
      debit: Number(debit) || 0, credit: Number(credit) || 0,
      currency: base, createdAt: Date.now(),
    });
    window._saveData();
    closeModal('new-entry-modal');
    if (typeof window.init_accounting === 'function') window.init_accounting();
    showToast('success','تم ترحيل القيد المحاسبي ✓');
    ['entry-date','entry-desc','entry-debit','entry-credit','entry-notes'].forEach(eid => {
      const el = document.getElementById(eid); if (el) el.value = '';
    });
  };

  window.syncEntryCredit = function() { /* مدين ودائن منفصلان */ };

  window.filterEntries = function(q) {
    const term = (q||'').toLowerCase();
    document.querySelectorAll('#entries-tbody tr[data-entry]').forEach(row => {
      row.style.display = row.dataset.entry.includes(term) ? '' : 'none';
    });
  };

  window.filterEntriesByDate = function(date) {
    document.querySelectorAll('#entries-tbody tr[data-entry]').forEach(row => {
      row.style.display = (!date || row.dataset.entryDate === date) ? '' : 'none';
    });
  };

  window.exportAccountingPDF = function() {
    const ki = document.getElementById('acc-kpi-income');
    const ke = document.getElementById('acc-kpi-expense');
    const kp = document.getElementById('acc-kpi-profit');
    const entryRows = [...document.querySelectorAll('#entries-tbody tr[data-entry]')].map(row => {
      const cells = row.querySelectorAll('td');
      return [...cells].map(c => c.textContent.trim()).join('</td><td>');
    }).map(r => `<tr><td>${r}</td></tr>`).join('');
    generatePDF('تقرير المحاسبة — الأرباح والخسائر', `
      <table>
        <thead><tr><th>البيان</th><th>المبلغ</th></tr></thead>
        <tbody>
          <tr><td>إجمالي الإيرادات</td><td style="color:green;font-weight:700;">${ki?.textContent||'0 ل.س'}</td></tr>
          <tr><td>إجمالي المصروفات</td><td style="color:red;font-weight:700;">${ke?.textContent||'0 ل.س'}</td></tr>
          <tr class="total-final"><td>صافي الربح / الخسارة</td><td>${kp?.textContent||'0 ل.س'}</td></tr>
        </tbody>
      </table>
      ${entryRows ? `<br><h3 style="margin:16px 0 10px;font-size:16px;font-weight:700;">تفاصيل القيود</h3>
        <table>
          <thead><tr><th>#</th><th>التاريخ</th><th>الوصف</th><th>النوع</th><th>مدين</th><th>دائن</th><th>الحالة</th></tr></thead>
          <tbody>${entryRows}</tbody>
        </table>` : ''}
    `);
  };

  window.setReportRange = function(type) {
    const now = new Date();
    const fmt = d => {
      const y=d.getFullYear(), m=String(d.getMonth()+1).padStart(2,'0'), dd=String(d.getDate()).padStart(2,'0');
      return `${y}-${m}-${dd}`;
    };
    let from = '', to = fmt(now);
    if (type === 'today') {
      from = fmt(now);
    } else if (type === 'yesterday') {
      const y = new Date(now);
      y.setDate(now.getDate() - 1);
      from = fmt(y); to = fmt(y);
    } else if (type === 'week') {
      const d = new Date(now);
      d.setDate(now.getDate() - ((now.getDay() + 6) % 7));
      from = fmt(d);
    } else if (type === 'month') {
      from = fmt(new Date(now.getFullYear(), now.getMonth(), 1));
    } else if (type === 'lastyear') {
      from = fmt(new Date(now.getFullYear() - 1, 0, 1));
      to   = fmt(new Date(now.getFullYear() - 1, 11, 31));
    } else if (type === 'all') {
      from = ''; to = '';
    }
    const fe = document.getElementById('rpt-from');
    const te = document.getElementById('rpt-to');
    if (fe) fe.value = from;
    if (te) te.value = to;
    document.querySelectorAll('.rpt-range-btn').forEach(b => {
      const active = b.dataset.range === type;
      b.classList.toggle('btn-primary',   active);
      b.classList.toggle('btn-secondary', !active);
    });
  };

  window.clearRangeActive = function() {
    document.querySelectorAll('.rpt-range-btn').forEach(b => {
      b.classList.remove('btn-primary');
      b.classList.add('btn-secondary');
    });
  };

  window.generateReport = function(key, name) {
    const from = document.getElementById('rpt-from')?.value;
    const to   = document.getElementById('rpt-to')?.value;
    const dateRange = (from || to) ? `<p style="color:#64748b;font-size:13px;margin-bottom:16px;">الفترة: ${from||'—'} إلى ${to||'—'}</p>` : '';
    const userData  = JSON.parse(sessionStorage.getItem('a3mali_user') || '{}');
    const statusMap = { paid:'مدفوعة', pending:'معلقة', overdue:'متأخرة', draft:'مسودة', quotation:'عرض سعر' };
    const bm        = { paid:'badge-paid', pending:'badge-pending', overdue:'badge-overdue', draft:'badge-draft' };

    const normD = s => (s || '').replace(/\//g,'-');
    const inRange = inv => {
      if (!from && !to) return true;
      const d = normD(inv.date);
      if (from && d < from) return false;
      if (to   && d > to)   return false;
      return true;
    };

    const reportData = {
      sales: {
        headers: ['#','العميل','التاريخ','المبلغ','طريقة الدفع','الحالة'],
        rows: (window._invoices||[]).filter(i=>i.status!=='draft' && i.status!=='quotation' && inRange(i)).map((inv,idx) =>
          `<tr><td>${idx+1}</td><td>${inv.client}</td><td>${inv.date}</td>
           <td style="font-weight:700;">${(inv.amount||0).toLocaleString('en-US')} ل.س</td>
           <td>${_fmtMethodCur(inv)}</td>
           <td><span class="badge ${bm[inv.status]||'badge-draft'}">${statusMap[inv.status]||inv.status}</span></td></tr>`)
      },
      customers: {
        headers: ['#','الاسم','الهاتف','البريد الإلكتروني','النوع','المدينة'],
        rows: (window._customers||[]).map((c,idx) =>
          `<tr><td>${idx+1}</td><td style="font-weight:700;">${c.name}</td><td>${c.phone||'—'}</td>
           <td>${c.email||'—'}</td><td>${c.type||'—'}</td><td>${c.city||'—'}</td></tr>`)
      },
      expenses: {
        headers: ['#','البيان','التاريخ','المبلغ','الفئة'],
        rows: []
      },
      inventory: {
        headers: ['#','المنتج','الكمية المتاحة','سعر البيع','الحد الأدنى'],
        rows: []
      },
      profit: {
        headers: ['البيان','المبلغ'],
        rows: [
          `<tr><td style="color:green;font-weight:700;">إجمالي الإيرادات</td><td style="color:green;font-weight:700;">${(document.getElementById('acc-kpi-income')?.textContent||'0 ل.س')}</td></tr>`,
          `<tr><td style="color:red;">إجمالي المصروفات</td><td style="color:red;">${(document.getElementById('acc-kpi-expense')?.textContent||'0 ل.س')}</td></tr>`,
          `<tr class="total-final"><td>صافي الربح / الخسارة</td><td>${(document.getElementById('acc-kpi-profit')?.textContent||'0 ل.س')}</td></tr>`
        ]
      },
      cashflow: {
        headers: ['التاريخ','الوصف','وارد','صادر','الرصيد'],
        rows: []
      },
      employees: {
        headers: ['#','الاسم','المسمى الوظيفي','القسم','الراتب','الحالة'],
        rows: [...document.querySelectorAll('.emp-card')].map((card,idx) => {
          const name  = card.querySelector('[style*="font-weight:700"]')?.textContent||'—';
          const title = card.querySelectorAll('[style*="font-size"]')[1]?.textContent||'—';
          const dept  = card.dataset.empDept||'—';
          const sal   = card.querySelector('[style*="var(--primary)"]')?.textContent||'—';
          return `<tr><td>${idx+1}</td><td style="font-weight:700;">${name}</td><td>${title}</td><td>${dept}</td><td>${sal}</td><td><span class="badge badge-paid">نشط</span></td></tr>`;
        })
      },
      tax: {
        headers: ['الفترة','إجمالي المبيعات','الضريبة المستحقة (11%)'],
        rows: [ `<tr><td>${new Date().toLocaleDateString('ar-SY')}</td>
                 <td>${(window._invoices||[]).reduce((s,i)=>s+(i.amount||0),0).toLocaleString('en-US')} ل.س</td>
                 <td>${((window._invoices||[]).reduce((s,i)=>s+(i.amount||0),0)*0.11).toLocaleString('en-US')} ل.س</td></tr>` ]
      },
      overdue: {
        headers: ['#','العميل','رقم الفاتورة','التاريخ','المبلغ'],
        rows: (window._invoices||[]).filter(i=>i.status==='overdue').map((inv,idx) =>
          `<tr><td>${idx+1}</td><td>${inv.client}</td><td style="font-weight:700;color:#dc2626;">${inv.id}</td>
           <td>${inv.date}</td><td style="font-weight:700;">${(inv.amount||0).toLocaleString('en-US')} ل.س</td></tr>`)
      }
    };

    const data = reportData[key] || { headers:['البيان'], rows:[] };
    const tableBody = data.rows.length > 0
      ? data.rows.join('')
      : `<tr><td colspan="${data.headers.length}" style="text-align:center;color:#94a3b8;padding:24px;">لا توجد بيانات للفترة المحددة</td></tr>`;

    generatePDF(name, `
      ${dateRange}
      <table>
        <thead><tr>${data.headers.map(h=>`<th>${h}</th>`).join('')}</tr></thead>
        <tbody>${tableBody}</tbody>
      </table>
    `);
  };

  function showLoading(show) {
    document.getElementById('loading-overlay').classList.toggle('active', show);
  }

  function showToast(type, msg) {
    const container = document.getElementById('toast-container');
    const el = document.createElement('div');
    el.className = `toast toast-${type}`;
    el.style.cursor = 'pointer';
    el.title = 'اضغط للإغلاق';
    const icons = { success:'✅', error:'❌', warning:'⚠️', info:'ℹ️' };
    el.innerHTML = `<span class="toast-icon">${icons[type]||'ℹ️'}</span><span class="toast-msg">${msg}</span><span class="toast-close">✕</span>`;
    let dismissed = false;
    function dismiss() {
      if (dismissed) return;
      dismissed = true;
      el.classList.add('removing');
      setTimeout(() => el.remove(), 300);
    }
    el.addEventListener('click', dismiss);
    setTimeout(dismiss, 4000);
    container.appendChild(el);
  }

  function openModal(id)  { const el = document.getElementById(id); if (el) el.classList.add('open'); }
  function closeModal(id) { const el = document.getElementById(id); if (el) el.classList.remove('open'); }

  function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const wrapper = document.getElementById('main-wrapper');
    if (window.innerWidth <= 1024) {
      sidebar.classList.toggle('mobile-open');
      document.getElementById('sidebarOverlay').classList.toggle('show', sidebar.classList.contains('mobile-open'));
    } else {
      sidebar.classList.toggle('collapsed');
      wrapper.classList.toggle('expanded');
    }
  }

  function closeMobileSidebar() {
    document.getElementById('sidebar').classList.remove('mobile-open');
    document.getElementById('sidebarOverlay').classList.remove('show');
  }

  window.toggleNavGroup = function(headerEl) {
    const group = headerEl.closest('.sidebar-group');
    if (!group) return;
    const willOpen = !group.classList.contains('open');
    document.querySelectorAll('.sidebar-group').forEach(g => g.classList.remove('open'));
    if (willOpen) group.classList.add('open');
  };

  function openGroupForModule(module) {
    const item = document.querySelector(`.sidebar-item[data-module="${module}"]`);
    const group = item && item.closest('.sidebar-group');
    if (!group) return;
    document.querySelectorAll('.sidebar-group').forEach(g => {
      g.classList.toggle('open', g === group);
    });
  }
  window.openGroupForModule = openGroupForModule;

  const _searchModules = [
    { label:'لوحة التحكم',               icon:'📊', key:'dashboard',    tags:['dashboard','لوحة','تحكم','رئيسية'] },
    { label:'إدارة العملاء',             icon:'👥', key:'crm',          tags:['crm','عملاء','زبائن','عميل'] },
    { label:'المبيعات والفواتير',        icon:'🧾', key:'sales',        tags:['sales','مبيعات','فواتير','فاتورة','بيع'] },
    { label:'إدارة الأقساط',            icon:'📅', key:'installments',  tags:['أقساط','قسط','تقسيط'] },
    { label:'المبيعات المستهدفة والعمولات',icon:'🎯',key:'commissions', tags:['عمولات','مستهدف','هدف','عمولة'] },
    { label:'المخزون',                   icon:'📦', key:'inventory',    tags:['مخزون','منتجات','منتج','بضاعة'] },
    { label:'الصندوق',                   icon:'🧰', key:'cashbox',      tags:['صندوق','كاش','نقدية','cash'] },
    { label:'المصروف',                   icon:'🧾', key:'expenses',     tags:['مصروف','مصاريف','نفقات','إيجار','راتب'] },
    { label:'الموردين',                  icon:'🏭', key:'suppliers',    tags:['موردين','مورد','توريد'] },
    { label:'المشتريات',                 icon:'🛒', key:'purchases',    tags:['مشتريات','شراء','طلب'] },
    { label:'العمليات',                  icon:'🔧', key:'operations',   tags:['عمليات','أوامر','حجوزات','إيجار'] },
    { label:'المحاسبة',                  icon:'💰', key:'accounting',   tags:['محاسبة','حسابات','قيد'] },
    { label:'الموظفون',                  icon:'👨‍💼', key:'hr',           tags:['موظفون','موظف','hr','رواتب','حضور'] },
    { label:'التقارير',                  icon:'📈', key:'reports',      tags:['تقارير','تقرير','إحصائيات'] },
    { label:'الإعدادات',                 icon:'⚙️', key:'settings',     tags:['إعدادات','ضبط','تهيئة','شركة'] },
  ];

  let _searchIdx = -1;

  window.globalSearch = function(q) {
    const dd = document.getElementById('global-search-dropdown');
    if (!dd) return;
    q = q.trim();
    if (!q) { dd.style.display='none'; _searchIdx=-1; return; }
    const ql = q.toLowerCase();
    const hits = _searchModules.filter(m =>
      m.label.includes(q) || m.tags.some(t => t.includes(ql))
    );
    if (!hits.length) { dd.style.display='none'; return; }
    _searchIdx = -1;
    dd.innerHTML = hits.map((m,i) => `
      <div class="gs-item" data-idx="${i}" data-key="${m.key}"
        style="display:flex;align-items:center;gap:10px;padding:10px 14px;cursor:pointer;transition:background .1s;"
        onmousedown="globalSearchGo('${m.key}')"
        onmouseover="gsHover(${i})" onmouseout="gsHoverOff(${i})">
        <span style="font-size:18px;">${m.icon}</span>
        <span style="font-size:var(--text-sm);font-weight:600;">${m.label}</span>
      </div>`).join('');
    dd.style.display = 'block';
  };

  window.globalSearchKey = function(e) {
    const dd = document.getElementById('global-search-dropdown');
    const items = dd?.querySelectorAll('.gs-item');
    if (!items?.length) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); _searchIdx = Math.min(_searchIdx+1, items.length-1); gsHighlight(items); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); _searchIdx = Math.max(_searchIdx-1, 0); gsHighlight(items); }
    else if (e.key === 'Enter') {
      if (_searchIdx >= 0 && items[_searchIdx]) { globalSearchGo(items[_searchIdx].dataset.key); }
      else if (items[0]) { globalSearchGo(items[0].dataset.key); }
    } else if (e.key === 'Escape') { dd.style.display='none'; _searchIdx=-1; }
  };

  function gsHighlight(items) {
    items.forEach((el,i) => el.style.background = i===_searchIdx ? 'var(--primary-light,#ede9fe)' : '');
  }
  function gsHover(i) {
    _searchIdx = i;
    gsHighlight(document.querySelectorAll('#global-search-dropdown .gs-item'));
  }
  function gsHoverOff(i) {
    document.querySelectorAll('#global-search-dropdown .gs-item')[i].style.background = '';
  }

  window.globalSearchGo = function(key) {
    const inp = document.getElementById('global-search');
    const dd  = document.getElementById('global-search-dropdown');
    if (inp) inp.value = '';
    if (dd)  dd.style.display = 'none';
    _searchIdx = -1;
    navigate(key);
  };

  document.addEventListener('click', e => {
    if (!e.target.closest('#global-search') && !e.target.closest('#global-search-dropdown')) {
      const dd = document.getElementById('global-search-dropdown');
      if (dd) dd.style.display = 'none';
    }
  });

  function toggleNotif() {
    const panel = document.getElementById('notif-panel');
    const opening = !panel.classList.contains('open');
    if (opening && typeof window.renderNotifications === 'function') window.renderNotifications();
    panel.classList.toggle('open');
    document.getElementById('user-menu').classList.remove('open');
  }

  function toggleUserMenu() {
    document.getElementById('user-menu').classList.toggle('open');
    document.getElementById('notif-panel').classList.remove('open');
    document.getElementById('currency-panel')?.classList.remove('open');
  }

  function toggleHeaderUserMenu() {
    document.getElementById('header-user-menu')?.classList.toggle('open');
    document.getElementById('notif-panel')?.classList.remove('open');
    document.getElementById('currency-panel')?.classList.remove('open');
    document.getElementById('user-menu')?.classList.remove('open');
  }

  window.updateCurrencyLabel = function() {
    const el = document.getElementById('currency-label');
    if (el && window.Currency) el.textContent = window.Currency.symbol(window.Currency.base);
  };

  function _fillCurrencyPanel() {
    if (!window.Currency) return;
    const C = window.Currency;
    const baseEl = document.getElementById('cur-base');
    const modeEl = document.getElementById('cur-mode');
    const rateEl = document.getElementById('cur-rate');
    const metaEl = document.getElementById('cur-rate-meta');
    const tryEl  = document.getElementById('cur-try-rate');
    if (baseEl) baseEl.value = C.base;
    if (modeEl) modeEl.value = C.mode;
    if (rateEl) rateEl.value = C.rate || '';
    if (tryEl)  tryEl.value  = C.usdToTry || '';
    onCurrencyBaseChange(C.base);
    onCurrencyModeChange(C.mode);
    if (metaEl) {
      metaEl.textContent = C.updatedAt
        ? `آخر تحديث: ${new Date(C.updatedAt).toLocaleString('en-US')}`
        : 'لم يُحدّد سعر صرف بعد';
    }
  }

  window.toggleCurrencyMenu = function() {
    const panel = document.getElementById('currency-panel');
    if (!panel) return;
    const willOpen = !panel.classList.contains('open');
    document.getElementById('notif-panel')?.classList.remove('open');
    document.getElementById('user-menu')?.classList.remove('open');
    panel.classList.toggle('open', willOpen);
    if (willOpen) _fillCurrencyPanel();
  };

  window.onCurrencyModeChange = function(mode) {
    const fetchBtn = document.getElementById('cur-fetch-btn');
    if (fetchBtn) fetchBtn.style.display = (mode === 'auto') ? '' : 'none';
  };

  window.onCurrencyBaseChange = function(base) {
    const sypWrap = document.getElementById('cur-syp-rate-wrap');
    const tryWrap = document.getElementById('cur-try-rate-wrap');
    if (sypWrap) sypWrap.style.display = '';
    if (tryWrap) tryWrap.style.display = (base === 'TRY') ? '' : 'none';
  };

  window.fetchAutoRate = async function() {
    if (!window.Currency) return;
    const btn = document.getElementById('cur-fetch-btn');
    if (btn) { btn.disabled = true; btn.textContent = '...جاري'; }
    const r = await window.Currency.fetchAuto();
    if (btn) { btn.disabled = false; btn.textContent = '🔄 جلب'; }
    if (r) {
      const rateEl = document.getElementById('cur-rate');
      if (rateEl) rateEl.value = r;
      showToast('success', `تم جلب سعر الصرف: 1$ = ${r.toLocaleString('en-US')} ل.س`);
    } else {
      showToast('warning', 'تعذّر جلب السعر تلقائياً — يرجى إدخاله يدوياً');
    }
  };

  window.fetchAutoTryRate = async function() {
    if (!window.Currency) return;
    const btn  = document.getElementById('cur-try-fetch-btn');
    const meta = document.getElementById('cur-try-rate-meta');
    if (btn) { btn.disabled = true; btn.textContent = '...جاري'; }
    const r = await window.Currency.fetchAutoTry();
    if (btn) { btn.disabled = false; btn.textContent = '🔄 جلب'; }
    if (r) {
      const rateEl = document.getElementById('cur-try-rate');
      if (rateEl) rateEl.value = r;
      if (meta) meta.textContent = `آخر تحديث: ${new Date().toLocaleString('en-US')}`;
      showToast('success', `تم جلب سعر الليرة التركية: 1$ = ${r.toLocaleString('en-US')} ₺`);
    } else {
      showToast('warning', 'تعذّر جلب سعر الليرة التركية — يرجى إدخاله يدوياً');
    }
  };

  let _rateAutoFetched = false;
  window.autoFetchRateOnce = async function() {
    if (_rateAutoFetched) return;
    _rateAutoFetched = true;
    if (!window.Currency || typeof window.Currency.fetchAuto !== 'function') return;
    try {
      const [r, rTry] = await Promise.all([
        window.Currency.fetchAuto(),
        window.Currency.fetchAutoTry(),
      ]);
      if (typeof updateCurrencyLabel === 'function') updateCurrencyLabel();
      if (r && r > 0) {
        const rateEl = document.getElementById('cur-rate');
        if (rateEl) rateEl.value = r;
      }
      if (rTry && rTry > 0) {
        const tryEl = document.getElementById('cur-try-rate');
        if (tryEl) tryEl.value = rTry;
      }
      if (r && r > 0 && typeof showToast === 'function')
        showToast('success', `سعر الصرف اليوم: 1$ = ${r.toLocaleString('en-US')} ل.س | ${rTry ? rTry.toLocaleString('en-US') + ' ₺' : ''} ✓`);
      const hash = (window.location.hash.replace('#', '')) || 'dashboard';
      if (typeof window.navigate === 'function') window.navigate(hash);
    } catch (e) { }
  };

  window.applyCurrencySettings = function() {
    if (!window.Currency) return;
    const C = window.Currency;
    const base    = document.getElementById('cur-base')?.value || 'SYP';
    const mode    = document.getElementById('cur-mode')?.value || 'manual';
    const rate    = parseFloat(document.getElementById('cur-rate')?.value);
    const tryRate = parseFloat(document.getElementById('cur-try-rate')?.value);
    if (rate    && rate    > 0) C.setRate(rate);
    if (tryRate && tryRate > 0) C.setUsdToTry(tryRate);
    C.setMode(mode);
    C.setBase(base);
    updateCurrencyLabel();
    document.getElementById('currency-panel')?.classList.remove('open');
    showToast('success', `العملة الأساسية: ${C.symbol(base)} ✓`);
    const hash = window.location.hash.replace('#','') || 'dashboard';
    if (typeof window.navigate === 'function') window.navigate(hash);
  };

  function _resolveDashboardPin() {
    const pinKey = 'a3mali_pin_' + _acctKey();
    let pin = localStorage.getItem(pinKey);
    if (pin) return pin;
    const s = _loadAcct('settings', {}) || window._appSettings || {};
    if (s && s.pin) {
      localStorage.setItem(pinKey, s.pin);
      return s.pin;
    }
    return null;
  }

  window.showEntryChoicePopup = function() {
    return new Promise(function(resolve) {
      const ov        = document.getElementById('entry-choice-overlay');
      const scChoice  = document.getElementById('entry-screen-choice');
      const scPin     = document.getElementById('entry-screen-pin');
      const pinInp    = document.getElementById('entry-pin-input');
      const pinErr    = document.getElementById('entry-pin-error');

      if (!ov) { resolve('dashboard'); return; }

      const scExpired = document.getElementById('entry-screen-expired');

      if (scChoice)  scChoice.style.display  = 'none';
      if (scPin)     scPin.style.display     = 'none';
      if (scExpired) scExpired.style.display = 'none';
      if (pinInp)    pinInp.value            = '';
      if (pinErr)    pinErr.style.display    = 'none';
      ov.style.opacity   = '';
      ov.style.transition = '';
      ov.style.display   = 'flex';

      // ── فحص انتهاء الاشتراك قبل عرض شاشة الاختيار ──
      (async function _checkSubscription() {
        const acctKey = (typeof _acctKey === 'function') ? _acctKey() : null;
        let expiry = null;
        if (acctKey) {
          try {
            if (typeof window._fsGet === 'function') {
              const snap = await window._fsGet('users/' + acctKey);
              if (snap && snap.exists && snap.exists()) {
                const d = snap.data();
                if (d && d.subscriptionExpiry) {
                  expiry = String(d.subscriptionExpiry);
                  localStorage.setItem('a3mali_sub_' + acctKey, expiry);
                }
              }
            }
          } catch (e) {
            // أوفلاين أو تعذّر الوصول — استخدم آخر تاريخ محفوظ محلياً
            expiry = localStorage.getItem('a3mali_sub_' + acctKey);
          }
        }

        const today = new Date().toISOString().split('T')[0]; // "YYYY-MM-DD"
        if (expiry && today > expiry) {
          // انتهى الاشتراك — اعرض شاشة التجديد وامنع الدخول للاثنين
          if (scExpired) {
            const dateEl = document.getElementById('entry-expired-date');
            if (dateEl) dateEl.textContent = 'تاريخ الانتهاء: ' + expiry;
            const waEl = document.getElementById('entry-expired-wa');
            if (waEl) {
              let em = '';
              try { em = (JSON.parse(sessionStorage.getItem('a3mali_user') || '{}').email) || ''; } catch (_e) {}
              const msg = 'مرحباً، أرغب بتجديد اشتراكي في أعمالي.' + (em ? ('\nحسابي: ' + em) : '');
              waEl.href = 'https://wa.me/905523223191?text=' + encodeURIComponent(msg);
            }
            scExpired.style.display = 'block';
          } else if (scChoice) {
            scChoice.style.display = 'block';
          }
        } else {
          // الاشتراك ساري — اعرض شاشة الاختيار
          if (scChoice) scChoice.style.display = 'block';
        }
      })();

      function finish(choice) {
        ov.style.transition = 'opacity .22s';
        ov.style.opacity    = '0';
        setTimeout(function() {
          ov.style.display    = 'none';
          ov.style.opacity    = '';
          ov.style.transition = '';
          resolve(choice);
        }, 240);
      }

      window._entryChooseOption = function(choice) { finish(choice); };

      window._entryShowPin = async function() {
        const dashBtn = document.getElementById('entry-btn-dashboard');
        if (dashBtn) { dashBtn.disabled = true; dashBtn.style.opacity = '0.6'; }

        if (typeof window._fsGet === 'function') {
          try {
            const acctKey = _acctKey();
            const pinKey  = 'a3mali_pin_' + acctKey;
            let firestorePin = null;

            const userSnap = await window._fsGet('users/' + acctKey);
            if (userSnap && userSnap.exists && userSnap.exists()) {
              const d = userSnap.data();
              if (d && (d.localPin || d.dashboardPin))
                firestorePin = String(d.localPin || d.dashboardPin);
            }

            if (!firestorePin) {
              const settingsSnap = await window._fsGet('accounts/' + acctKey + '/data/settings');
              if (settingsSnap && settingsSnap.exists && settingsSnap.exists()) {
                const d = settingsSnap.data();
                if (d && d.pin) firestorePin = String(d.pin);
              }
            }

            if (firestorePin) {
              localStorage.setItem(pinKey, firestorePin);
            } else {
              localStorage.removeItem(pinKey);
            }
          } catch(e) {
            console.log('[PIN] Offline — using cached PIN from localStorage');
          }
        }

        if (dashBtn) { dashBtn.disabled = false; dashBtn.style.opacity = ''; }

        const pin = _resolveDashboardPin();
        if (!pin) { finish('dashboard'); return; }
        if (scChoice) scChoice.style.display = 'none';
        if (scPin)    scPin.style.display    = 'block';
        setTimeout(function() { if (pinInp) pinInp.focus(); }, 80);
      };

      window._entryBackToChoice = function() {
        if (scPin)    scPin.style.display    = 'none';
        if (scChoice) scChoice.style.display = 'block';
        if (pinInp)   pinInp.value           = '';
        if (pinErr)   pinErr.style.display   = 'none';
      };

      window._entryVerifyPin = function() {
        const entered = (pinInp ? pinInp.value : '').trim();
        const pin     = _resolveDashboardPin();
        if (entered && pin && entered === pin) {
          window.__pinUnlocked = true;
          finish('dashboard');
        } else {
          if (pinErr) pinErr.style.display = 'block';
          if (pinInp) { pinInp.value = ''; pinInp.focus(); }
        }
      };
    });
  };

  window.requireDashboardPin = function() {
    const pin = _resolveDashboardPin();
    if (!pin) return true;
    if (window.__pinUnlocked === true) return true;
    const ov = document.getElementById('pin-lock-overlay');
    if (ov) {
      ov.style.display = 'flex';
      setTimeout(() => document.getElementById('pin-lock-input')?.focus(), 100);
    }
    return false;
  };

  window.verifyDashboardPin = function() {
    const inp = document.getElementById('pin-lock-input');
    const err = document.getElementById('pin-lock-error');
    const entered = (inp?.value || '').trim();
    const pin = _resolveDashboardPin();
    if (entered && entered === pin) {
      window.__pinUnlocked = true;
      const ov = document.getElementById('pin-lock-overlay');
      if (ov) ov.style.display = 'none';
      if (err) err.style.display = 'none';
      if (inp) inp.value = '';
      showToast('success', 'تم فتح لوحة التحكم ✓');
    } else {
      if (err) err.style.display = 'block';
      if (inp) { inp.value = ''; inp.focus(); }
    }
  };

  // أزرار/بيانات الثيمات المتاحة (تُستخدم في منتقي الإعدادات)
  const _THEMES = [
    { key:'light',   name:'رمادي (افتراضي)', bg:'#bdbdbd', accent:'#2563eb' },
    { key:'white',   name:'أبيض',            bg:'#ffffff', accent:'#2563eb' },
    { key:'blue',    name:'أزرق',            bg:'#dbeafe', accent:'#2563eb' },
    { key:'emerald', name:'أخضر',            bg:'#d1fae5', accent:'#059669' },
    { key:'violet',  name:'بنفسجي',          bg:'#ddd6fe', accent:'#7c3aed' },
    { key:'rose',    name:'وردي',            bg:'#fecdd3', accent:'#e11d48' },
    { key:'amber',   name:'برتقالي',         bg:'#fef3c7', accent:'#d97706' },
    { key:'teal',    name:'تركوازي',         bg:'#ccfbf1', accent:'#0d9488' },
    { key:'dark',    name:'داكن',            bg:'#0f172a', accent:'#3b82f6' },
  ];

  function toggleTheme() {
    const cur = document.documentElement.getAttribute('data-theme') || 'light';
    // عند الانتقال من ثيم فاتح/ملوّن نحفظه لاستعادته عند العودة من الداكن
    if (cur !== 'dark') localStorage.setItem('a3mali_theme_light', cur);
    const next = cur === 'dark' ? (localStorage.getItem('a3mali_theme_light') || 'light') : 'dark';
    applyTheme(next);
    localStorage.setItem('a3mali_theme', next);
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    const btn = document.getElementById('theme-btn');
    if (btn) btn.textContent = theme === 'dark' ? '☀️' : '🌙';
  }

  // شبكة بطاقات اختيار الثيم داخل الإعدادات
  function _themePickerHTML() {
    const cur = localStorage.getItem('a3mali_theme') || 'light';
    return _THEMES.map(t => `
      <div class="theme-card${t.key === cur ? ' active' : ''}" id="theme-card-${t.key}" onclick="selectTheme('${t.key}')"
        style="cursor:pointer;border:2px solid ${t.key === cur ? 'var(--primary)' : 'var(--border)'};border-radius:var(--r-lg);overflow:hidden;background:var(--surface);transition:var(--tr);">
        <div style="height:64px;background:${t.bg};display:flex;align-items:center;justify-content:center;gap:6px;">
          <span style="width:26px;height:26px;border-radius:50%;background:${t.accent};box-shadow:0 2px 6px rgba(0,0,0,.25);"></span>
          <span style="width:14px;height:14px;border-radius:50%;background:${t.accent};opacity:.45;"></span>
        </div>
        <div style="padding:var(--sp-2) var(--sp-3);display:flex;align-items:center;justify-content:space-between;">
          <span style="font-weight:700;font-size:var(--text-sm);">${t.name}</span>
          <span id="theme-check-${t.key}" style="color:var(--primary);font-weight:800;">${t.key === cur ? '✓' : ''}</span>
        </div>
      </div>`).join('');
  }

  window.selectTheme = function(key) {
    applyTheme(key);
    localStorage.setItem('a3mali_theme', key);
    if (key !== 'dark') localStorage.setItem('a3mali_theme_light', key);
    document.querySelectorAll('[id^="theme-card-"]').forEach(c => {
      const k = c.id.replace('theme-card-', '');
      const on = k === key;
      c.style.borderColor = on ? 'var(--primary)' : 'var(--border)';
      c.classList.toggle('active', on);
      const chk = document.getElementById('theme-check-' + k);
      if (chk) chk.textContent = on ? '✓' : '';
    });
    if (typeof showToast === 'function') showToast('success', 'تم تطبيق المظهر ✓ — يظهر في الكاشير عند فتحه');
  };

  // قائمة زر الثيم في الهيدر: فاتح / داكن / مخصص
  window.toggleThemeMenu = function() {
    document.getElementById('theme-menu')?.classList.toggle('open');
  };
  window.openThemePicker = function() {
    navigate('settings');
    setTimeout(() => { if (typeof settingsTab === 'function') settingsTab(5); }, 150);
  };

  window.addEventListener('storage', function(e) {
    if (!e.key || !e.newValue) return;
    const acctKey = _acctKey();
    if (!acctKey || acctKey === 'guest') return;

    const keyMap = {
      ['a3mali_invoices_'   + acctKey]: { prop: '_invoices',   kind: 'invoices'   },
      ['a3mali_products_'   + acctKey]: { prop: '_products',   kind: 'products'   },
      ['a3mali_stockMoves_' + acctKey]: { prop: '_stockMoves', kind: 'stockMoves' },
      ['a3mali_debts_'      + acctKey]: { prop: '_debts',      kind: 'debts'      },
      ['a3mali_cashbox_'    + acctKey]: { prop: '_cashbox',    kind: 'cashbox'    },
      ['a3mali_customers_'  + acctKey]: { prop: '_customers',  kind: 'customers'  },
    };

    const entry = keyMap[e.key];
    if (!entry) return;

    let newData;
    try { newData = JSON.parse(e.newValue); } catch(_) { return; }
    if (!Array.isArray(newData)) return;

    const prevLen = (window[entry.prop] || []).length;
    window[entry.prop] = newData;

    if (entry.kind === 'invoices' && typeof window.updateSalesBadge === 'function') {
      window.updateSalesBadge();
    }

    document.querySelectorAll('.sync-indicator').forEach(el => el.classList.add('syncing'));
    setTimeout(() => document.querySelectorAll('.sync-indicator').forEach(el => el.classList.remove('syncing')), 1200);

    const active = document.activeElement;
    const isTyping = active && /^(INPUT|TEXTAREA|SELECT)$/.test(active.tagName);
    if (document.querySelector('.modal-overlay.open') || isTyping) return;

    const current = (window.location.hash || '#dashboard').replace('#', '') || 'dashboard';
    if (typeof window.navigate === 'function') window.navigate(current);

    if (entry.kind === 'invoices' && newData.length > prevLen) {
      showToast('success', '🏪 بيع جديد من الكاشير — تم التحديث تلقائياً');
    } else if (entry.kind === 'products' && newData.length === prevLen) {
    }
  });

  document.addEventListener('click', (e) => {
    if (!e.target.closest('#theme-menu') && !e.target.closest('#theme-btn')) {
      document.getElementById('theme-menu')?.classList.remove('open');
    }
    if (!e.target.closest('#notif-panel') && !e.target.closest('#notif-btn')) {
      document.getElementById('notif-panel').classList.remove('open');
    }
    if (!e.target.closest('#user-menu') && !e.target.closest('#sidebar-user') && !e.target.closest('#header-avatar')) {
      document.getElementById('user-menu').classList.remove('open');
    }
    if (!e.target.closest('#header-user-menu') && !e.target.closest('#header-avatar')) {
      document.getElementById('header-user-menu')?.classList.remove('open');
    }
    document.querySelectorAll('.modal-overlay.open').forEach(overlay => {
      if (e.target === overlay) closeModal(overlay.id);
    });
  });

  const savedTheme = localStorage.getItem('a3mali_theme') || 'light';
  applyTheme(savedTheme);

  showLoading(true);

  setTimeout(() => {
    const content = document.getElementById('content');
    const stillLoading = content && content.textContent.includes('جارٍ التحميل');
    if (stillLoading) {
      showLoading(false);
      const demo = sessionStorage.getItem('a3mali_user');
      if (demo && typeof window.navigate === 'function') {
        const hash = window.location.hash.replace('#','') || 'dashboard';
        window.navigate(hash);
      } else if (!demo) {
        if (!(window.__auth && window.__auth.currentUser)) {
          window.location.href = 'login.html';
        }
      }
    }
  }, 2500);
