
(function () {
  const CURRENCIES = {
    SYP: { code: 'SYP', symbol: 'ل.س', name: 'ليرة سورية', digits: 0 },
    USD: { code: 'USD', symbol: '$',   name: 'دولار أمريكي', digits: 2 },
    TRY: { code: 'TRY', symbol: '₺',   name: 'ليرة تركية', digits: 2 },
  };

  const Currency = {
    CURRENCIES,

    _s() {
      if (!window._appSettings) window._appSettings = {};
      return window._appSettings;
    },
    _persist() {
      if (typeof window._saveSettings === 'function') window._saveSettings();
    },

    get base()      {
      const b = this._s().baseCurrency || 'SYP';
      if (!this.isHidden(b)) return b;
      const vis = this.visibleCodes();
      return vis.length ? vis[0] : b;
    },
    get mode()      { return this._s().rateMode || 'manual'; },
    get rate()      {
      const r = parseFloat(this._s().usdToSyp);
      return (r && r > 0) ? r : 0;
    },
    get updatedAt() { return this._s().rateUpdatedAt || null; },
    get usdToTry()  {
      const r = parseFloat(this._s().usdToTry);
      return (r && r > 0) ? r : 0;
    },

    isHidden(code) {
      const hidden = this._s().hiddenCurrencies || [];
      return hidden.includes(code);
    },
    visibleCodes() {
      const hidden = this._s().hiddenCurrencies || [];
      return Object.keys(CURRENCIES).filter(c => !hidden.includes(c));
    },
    setHidden(code, hide) {
      if (!CURRENCIES[code]) return false;
      const s = this._s();
      let hidden = Array.isArray(s.hiddenCurrencies) ? s.hiddenCurrencies.slice() : [];
      const currentlyHidden = hidden.includes(code);
      if (hide === currentlyHidden) return true;
      if (hide) {
        const remainingVisible = Object.keys(CURRENCIES).filter(c => c !== code && !hidden.includes(c));
        if (remainingVisible.length === 0) return false; // لا يمكن إخفاء كل العملات
        hidden.push(code);
      } else {
        hidden = hidden.filter(c => c !== code);
      }
      s.hiddenCurrencies = hidden;
      // إذا كانت العملة الأساسية أو عملة الكاشير أصبحت مخفية، إعادة تعيينها لأول عملة ظاهرة
      const vis = Object.keys(CURRENCIES).filter(c => !hidden.includes(c));
      if (hide && s.baseCurrency === code && vis.length) s.baseCurrency = vis[0];
      if (hide && s.cashierCurrency === code && vis.length) s.cashierCurrency = vis[0];
      this._persist();
      return true;
    },

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

    convert(amount, from, to) {
      amount = parseFloat(amount) || 0;
      from = from || 'SYP';
      to   = to   || this.base;
      if (from === to) return amount;
      return this._fromUSD(this._toUSD(amount, from), to);
    },

    format(amount, from) {
      const to  = this.base;
      const val = this.convert(amount, from || to, to);
      const d   = this.digits(to);
      const num = val.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
      return num + ' ' + this.symbol(to);
    },

    /**
     * Like format() but uses compact Arabic words for SYP (ألف / مليون).
     * USD and TRY keep their normal decimal format.
     */
    formatCompact(amount, from) {
      const to  = this.base;
      const val = this.convert(amount, from || to, to);
      const sym = this.symbol(to);
      // Compact wording for SYP and TRY (ألف / مليون / مليار)
      if (to === 'SYP' || to === 'TRY') {
        const n = Math.round(val);
        if (n === 0) return '0 ' + sym;
        const billions  = Math.floor(n / 1e9);
        const millions  = Math.floor((n % 1e9) / 1e6);
        const thousands = Math.floor((n % 1e6) / 1e3);
        const rest      = n % 1e3;
        const parts = [];
        if (billions)  parts.push(billions.toLocaleString('en-US') + ' مليار');
        if (millions)  parts.push(millions.toLocaleString('en-US') + ' مليون');
        if (thousands) parts.push(thousands.toLocaleString('en-US') + ' ألف');
        if (rest)      parts.push(rest.toLocaleString('en-US'));
        return parts.join(' و ') + ' ' + sym;
      }
      const d = this.digits(to);
      return val.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d }) + ' ' + sym;
    },

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
        } catch (e) { }
      }
      return null;
    },

    async fetchAutoTry() {
      const endpoints = [
        'https://api.exchangerate.host/latest?base=USD&symbols=TRY',
        'https://open.er-api.com/v6/latest/USD',
      ];
      for (const url of endpoints) {
        try {
          const res  = await fetch(url);
          const data = await res.json();
          const r = data?.rates?.TRY;
          if (r && r > 0) { this.setUsdToTry(r); return Math.round(r * 100) / 100; }
        } catch (e) { }
      }
      return null;
    },
  };

  window.Currency = Currency;
})();
