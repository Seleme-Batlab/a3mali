// ============================================================
//  أعمالي ERP — Currency Module (classic global)
//  Base-currency display + conversion (SYP / USD)
//  Stores each amount in its ORIGINAL currency; converts on display.
//  Settings persisted per-account via window._appSettings + _saveSettings().
// ============================================================

(function () {
  const CURRENCIES = {
    SYP: { code: 'SYP', symbol: 'ل.س', name: 'ليرة سورية', digits: 0 },
    USD: { code: 'USD', symbol: '$',   name: 'دولار أمريكي', digits: 2 },
    TRY: { code: 'TRY', symbol: '₺',   name: 'ليرة تركية', digits: 2 },
  };

  const Currency = {
    CURRENCIES,

    // ── settings access (per-account store) ──
    _s() {
      if (!window._appSettings) window._appSettings = {};
      return window._appSettings;
    },
    _persist() {
      if (typeof window._saveSettings === 'function') window._saveSettings();
    },

    // ── getters ──
    get base()      { return this._s().baseCurrency || 'SYP'; },
    get mode()      { return this._s().rateMode || 'manual'; },     // 'auto' | 'manual'
    get rate()      {                                                // SYP per 1 USD
      const r = parseFloat(this._s().usdToSyp);
      return (r && r > 0) ? r : 0;
    },
    get updatedAt() { return this._s().rateUpdatedAt || null; },
    get usdToTry()  {                                                // TRY per 1 USD
      const r = parseFloat(this._s().usdToTry);
      return (r && r > 0) ? r : 0;
    },

    // ── setters ──
    setBase(code) { if (CURRENCIES[code]) { this._s().baseCurrency = code; this._persist(); } },
    setMode(m)    { this._s().rateMode = (m === 'auto' ? 'auto' : 'manual'); this._persist(); },
    setRate(n)    {
      const v = Math.round(parseFloat(n) * 100) / 100;   // حصر بخانتين عشريتين
      if (v > 0) { this._s().usdToSyp = v; this._s().rateUpdatedAt = Date.now(); this._persist(); }
    },
    setUsdToTry(n) {
      const v = Math.round(parseFloat(n) * 100) / 100;   // حصر بخانتين عشريتين
      if (v > 0) { this._s().usdToTry = v; this._persist(); }
    },

    symbol(code)  { return (CURRENCIES[code] || CURRENCIES.SYP).symbol; },
    digits(code)  { return (CURRENCIES[code] || CURRENCIES.SYP).digits; },

    // ── pivot helpers: every currency converts through USD ──
    _toUSD(amount, code) {
      if (code === 'USD') return amount;
      if (code === 'SYP') { const r = this.rate;     return r ? amount / r : amount; }
      if (code === 'TRY') { const r = this.usdToTry; return r ? amount / r : amount; }
      return amount;
    },
    _fromUSD(amountUsd, code) {
      if (code === 'USD') return amountUsd;
      if (code === 'SYP') { const r = this.rate;     return r ? amountUsd * r : amountUsd; }
      if (code === 'TRY') { const r = this.usdToTry; return r ? amountUsd * r : amountUsd; }
      return amountUsd;
    },

    /**
     * Convert an amount entered in `from` currency to `to` currency.
     * Pivots through USD using usdToSyp / usdToTry. If a needed rate
     * isn't set yet, that leg is skipped and the amount passes through unchanged.
     */
    convert(amount, from, to) {
      amount = parseFloat(amount) || 0;
      from = from || 'SYP';
      to   = to   || this.base;
      if (from === to) return amount;
      return this._fromUSD(this._toUSD(amount, from), to);
    },

    /**
     * Format an amount (entered in `from` currency) for display in the BASE currency.
     */
    format(amount, from) {
      const to  = this.base;
      const val = this.convert(amount, from || to, to);
      const d   = this.digits(to);
      const num = val.toLocaleString('ar-SY', { minimumFractionDigits: d, maximumFractionDigits: d });
      return num + ' ' + this.symbol(to);
    },

    /**
     * Try to fetch USD→SYP automatically from a public API.
     * Returns the rate (SYP per USD) on success, or null on failure.
     * Note: free APIs have weak SYP coverage — manual entry is the reliable fallback.
     */
    async fetchAuto() {
      const endpoints = [
        'https://api.exchangerate.host/latest?base=USD&symbols=SYP',
        'https://open.er-api.com/v6/latest/USD',
      ];
      for (const url of endpoints) {
        try {
          const res  = await fetch(url);
          const data = await res.json();
          const r = data?.rates?.SYP;
          if (r && r > 0) { this.setRate(r); this.setMode('auto'); return Math.round(r * 100) / 100; }
        } catch (e) { /* try next */ }
      }
      return null;
    },
  };

  window.Currency = Currency;
})();
