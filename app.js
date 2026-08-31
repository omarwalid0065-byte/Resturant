(function () {
  "use strict";

  const KEY = "restaurant_html_js_data";
  const defaultData = {
    products: [],
    invoices: [],
    passwords: { settings: "admin123" }
  };
  let data = loadData();
  let view = "invoice";
  let settingsUnlocked = false;
  let searchTerm = "";
  let orderType = "dine_in";
  let customerName = "";
  let phoneNumber = "";
  let deliveryPersonName = "";
  let deliveryArea = "";
  let invoiceItems = [];
  let lastInvoice = null;
  let editingProductId = null;

  const app = document.getElementById("app");

  function loadData() {
    try {
      const saved = JSON.parse(localStorage.getItem(KEY) || "null");
      return saved ? { ...defaultData, ...saved, passwords: { ...defaultData.passwords, ...(saved.passwords || {}) } } : defaultData;
    } catch (_) {
      return defaultData;
    }
  }

  function saveData() {
    localStorage.setItem(KEY, JSON.stringify(data));
  }

  function esc(value) {
    return String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[char]));
  }

  function money(value) {
    return Number(value || 0).toLocaleString("ar-EG");
  }

  function toast(message, success) {
    const old = document.querySelector(".toast");
    if (old) old.remove();
    const node = document.createElement("div");
    node.className = `toast${success ? " success" : ""}`;
    node.textContent = message;
    document.body.appendChild(node);
    setTimeout(() => node.remove(), 2600);
  }

  function orderLabel(type) {
    return type === "delivery" ? "دليفيري" : type === "takeaway" ? "تيك أواي" : "داخل المطعم";
  }

  function header() {
    return `
      <header class="topbar">
        <div class="brand"><div class="brand-mark">▦</div><span>نظام المطعم</span></div>
        <nav class="nav">
          <button class="${view === "invoice" ? "active" : ""}" data-view="invoice">🧾 فاتورة جديدة</button>
          <button class="${view === "settings" ? "active" : ""}" data-view="settings">⚙ الإعدادات</button>
        </nav>
      </header>`;
  }

  function invoiceView() {
    const visibleProducts = data.products.filter((product) => product.name.toLowerCase().includes(searchTerm.trim().toLowerCase()));
    const total = invoiceItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const nextNumber = data.invoices.length ? Math.max(...data.invoices.map((item) => item.number)) + 1 : 1;
    return `
      <section class="page">
        <div class="hero">
          <div><h1>إنشاء فاتورة جديدة</h1><p>أدخل نوع الطلب وأضف الأصناف لإصدار فاتورة المطعم.</p></div>
          <div class="number">فاتورة رقم: ${nextNumber}</div>
        </div>
        <div class="layout">
          <div class="stack">
            <section class="card">
              <div class="card-header"><h2>نوع الطلب</h2></div>
              <div class="card-body">
                <div class="order-types">
                  ${[["dine_in", "داخل المطعم"], ["takeaway", "تيك أواي"], ["delivery", "دليفيري"]].map(([value, label]) =>
                    `<button class="${orderType === value ? "selected" : ""}" data-order-type="${value}">${label}</button>`).join("")}
                </div>
                ${orderType === "delivery" ? `
                  <div class="delivery-fields">
                    <h3>بيانات الدليفيري</h3>
                    <div class="field"><label>اسم العميل</label><input id="customerName" value="${esc(customerName)}" placeholder="" /></div>
                    <div class="field"><label>رقم التليفون (اختياري)</label><input id="phoneNumber" value="${esc(phoneNumber)}" dir="ltr" placeholder="" /></div>
                    <div class="field"><label>اسم الدليفيري</label><input id="deliveryPersonName" value="${esc(deliveryPersonName)}" placeholder="" /></div>
                    <div class="field"><label>العنوان</label><input id="deliveryArea" value="${esc(deliveryArea)}" placeholder="" /></div>
                  </div>` : ""}
              </div>
            </section>
            <section class="card">
              <div class="card-header"><h2>إضافة أصناف</h2></div>
              <div class="card-body">
                <div class="search"><span>⌕</span><input id="productSearch" value="${esc(searchTerm)}" placeholder="ابحث عن وجبة أو صنف..." /></div>
                <div class="menu-list">
                  ${visibleProducts.length ? visibleProducts.map((product) =>
                    `<button class="menu-item" data-add-product="${product.id}"><strong>${esc(product.name)}</strong><span class="price">${money(product.price)} ج</span></button>`).join("") :
                    `<div class="empty">${searchTerm ? "لا توجد نتائج مطابقة" : "لم تتم إضافة أصناف بعد، أضفها من الإعدادات."}</div>`}
                </div>
              </div>
            </section>
          </div>
          <section class="card invoice-card">
            <div class="card-header"><h2>عناصر الفاتورة</h2></div>
            <div class="card-body">
              ${invoiceItems.length ? `<table><thead><tr><th>الصنف</th><th>السعر</th><th>الكمية</th><th>الإجمالي</th><th></th></tr></thead><tbody>
                ${invoiceItems.map((item) => `<tr><td><strong>${esc(item.name)}</strong></td><td>${money(item.price)}</td><td><input class="qty" type="number" min="1" value="${item.quantity}" data-quantity="${item.id}" /></td><td><strong class="price">${money(item.price * item.quantity)} ج</strong></td><td><button class="icon-btn danger" data-remove-item="${item.id}">×</button></td></tr>`).join("")}
              </tbody></table>` : `<div class="empty" style="padding-top:150px"><div style="font-size:55px">＋</div><h2>لم يتم إضافة أي أصناف</h2><p>استخدم قائمة الأصناف لإضافة الوجبات للفاتورة.</p></div>`}
            </div>
            <div class="invoice-footer">
              <div class="total"><span>الإجمالي الكلي:</span><strong>${money(total)} جنيه</strong></div>
              <div class="actions"><button class="btn" id="saveInvoice" ${invoiceItems.length ? "" : "disabled"}>حفظ وإصدار الفاتورة</button><button class="btn danger" id="clearInvoice">مسح الكل</button></div>
              ${lastInvoice ? `<button class="btn secondary full" id="printInvoice" style="margin-top:12px">🖨 طباعة الفاتورة رقم ${lastInvoice.number}</button>` : ""}
            </div>
          </section>
        </div>
        ${lastInvoice ? printTemplate(lastInvoice) : ""}
      </section>`;
  }

  function printTemplate(invoice) {
    return `<div class="printable"><h1>نظام المطعم<br><small>فاتورة مبيعات</small></h1>
      <div class="print-meta"><div><b>رقم الفاتورة:</b> #${invoice.number}</div><div><b>التاريخ:</b> ${esc(invoice.date)}</div></div>
      <div class="print-customer"><div><b>نوع الطلب:</b> ${orderLabel(invoice.orderType)}</div>
      ${invoice.orderType === "delivery" ? `<div><b>اسم الدليفيري:</b> ${esc(invoice.deliveryPersonName)}</div><div><b>العنوان:</b> ${esc(invoice.deliveryArea || "")}</div><div><b>اسم العميل:</b> ${esc(invoice.customerName)}</div>${invoice.phoneNumber ? `<div><b>رقم التليفون:</b> ${esc(invoice.phoneNumber)}</div>` : ""}` : ""}</div>
      <table><thead><tr><th>الصنف</th><th>السعر</th><th>الكمية</th><th>الإجمالي</th></tr></thead><tbody>${invoice.items.map((item) => `<tr><td>${esc(item.name)}</td><td>${money(item.price)} جنيه</td><td>${item.quantity}</td><td>${money(item.price * item.quantity)} جنيه</td></tr>`).join("")}</tbody></table>
      <div class="print-total">الإجمالي الكلي: ${money(invoice.total)} جنيه</div></div>`;
  }

  function gateView() {
    return `<section class="page"><div class="card gate"><div style="font-size:44px">🔒</div><h1>الرجاء إدخال كلمة المرور</h1><p>الإعدادات وسجل الفواتير محميان بكلمة مرور.</p><form id="gateForm"><div class="field"><label>كلمة المرور</label><input id="gatePassword" type="password" autofocus /></div><button class="btn full">دخول</button><div id="gateError"></div></form></div></section>`;
  }

  function settingsView() {
    return `<section class="page"><div class="hero"><div><h1>الإعدادات</h1><p>اختر القسم الذي تريد فتحه وإدارته.</p></div><button class="btn secondary" data-view="invoice">← رجوع</button></div>
      <div class="settings-grid"><button class="card settings-card" data-view="history"><div class="settings-icon">▤</div><h2>سجل الفواتير</h2><p>عرض الفواتير السابقة ومراجعة تفاصيل الطلبات.</p><span class="btn">فتح سجل الفواتير ←</span></button>
      <button class="card settings-card" data-view="admin"><div class="settings-icon">⚙</div><h2>إعدادات النظام</h2><p>إدارة قائمة الطعام والأسعار.</p><span class="btn">فتح إعدادات النظام ←</span></button></div></section>`;
  }

  function historyView() {
    return `<section class="page"><div class="hero"><div><h1>سجل الفواتير</h1><p>عرض وإدارة الفواتير السابقة.</p></div><button class="btn secondary" data-view="settings">← رجوع للإعدادات</button></div>
      <section class="card" style="margin-top:22px"><div class="card-body">${data.invoices.length ? `<table><thead><tr><th>رقم الفاتورة</th><th>نوع الطلب</th><th>العنوان</th><th>بيانات العميل</th><th>التاريخ</th><th>الإجمالي</th><th></th></tr></thead><tbody>${data.invoices.slice().reverse().map((invoice) => `<tr><td><span class="badge">#${invoice.number}</span></td><td>${orderLabel(invoice.orderType)}</td><td>${invoice.orderType === "delivery" ? esc(invoice.deliveryArea || "-") : "-"}</td><td>${invoice.orderType === "delivery" ? `${esc(invoice.customerName)}<br><small>${esc(invoice.phoneNumber || "")}</small>` : "-"}</td><td>${esc(invoice.date)}</td><td><strong class="price">${money(invoice.total)} ج</strong></td><td><button class="icon-btn danger" data-delete-invoice="${invoice.id}">🗑</button></td></tr>`).join("")}</tbody></table>` : `<div class="empty"><h2>لا توجد فواتير مسجلة</h2><p>قم بإنشاء فاتورة جديدة من الصفحة الرئيسية.</p></div>`}</div></section></section>`;
  }

  function adminView() {
    return `<section class="page"><div class="hero"><div><h1>إعدادات النظام</h1><p>إدارة قائمة الطعام والأسعار.</p></div><button class="btn secondary" data-view="settings">← رجوع للإعدادات</button></div>
      <section class="card" style="margin-top:22px"><div class="card-header"><h2>${editingProductId ? "تعديل الصنف" : "إضافة صنف جديد"}</h2></div><div class="card-body"><form class="admin-form" id="productForm"><div class="field"><label>اسم الصنف</label><input id="productName" required /></div><div class="field"><label>السعر (جنيه)</label><input id="productPrice" type="number" min="0" step=".01" required /></div><button class="btn">${editingProductId ? "حفظ التعديل" : "إضافة صنف"}</button></form></div></section>
      <section class="card admin-table"><div class="card-header"><h2>الأصناف والوجبات</h2></div><div class="card-body">${data.products.length ? `<table><thead><tr><th>الصنف</th><th>السعر</th><th>الإجراءات</th></tr></thead><tbody>${data.products.map((product) => `<tr><td>${esc(product.name)}</td><td>${money(product.price)} جنيه</td><td><button class="btn secondary" data-edit-product="${product.id}">تعديل</button> <button class="btn danger" data-delete-product="${product.id}">حذف</button></td></tr>`).join("")}</tbody></table>` : `<div class="empty">لا توجد أصناف مضافة.</div>`}</div></section>
      <section class="card admin-table"><div class="card-header"><h2>كلمة مرور الإعدادات</h2></div><div class="card-body"><form id="passwordForm" class="admin-form"><div class="field"><label>كلمة المرور الحالية</label><input id="currentPassword" type="password" required /></div><div class="field"><label>كلمة المرور الجديدة</label><input id="newPassword" type="password" minlength="4" required /></div><div class="field"><label>تأكيد كلمة المرور</label><input id="confirmPassword" type="password" minlength="4" required /></div><button class="btn">حفظ كلمة المرور</button></form></div></section></section>`;
  }

  function render() {
    app.innerHTML = `<div class="app-shell">${header()}${view === "invoice" ? invoiceView() : view === "settings" && !settingsUnlocked ? gateView() : view === "settings" ? settingsView() : view === "history" ? historyView() : adminView()}</div>`;
    bindEvents();
  }

  function bindEvents() {
    document.querySelectorAll("[data-view]").forEach((button) => button.addEventListener("click", () => {
      const next = button.dataset.view;
      if (next === "settings" && !settingsUnlocked) view = "settings";
      else view = next;
      if (next === "invoice") { lastInvoice = null; }
      render();
    }));
    document.querySelectorAll("[data-order-type]").forEach((button) => button.addEventListener("click", () => { orderType = button.dataset.orderType; if (orderType !== "delivery") { customerName = ""; phoneNumber = ""; deliveryPersonName = ""; deliveryArea = ""; } render(); }));
    const customerInput = document.getElementById("customerName");
    if (customerInput) customerInput.addEventListener("input", (event) => { customerName = event.target.value; });
    const phoneInput = document.getElementById("phoneNumber");
    if (phoneInput) phoneInput.addEventListener("input", (event) => { phoneNumber = event.target.value; });
    const deliveryInput = document.getElementById("deliveryPersonName");
    if (deliveryInput) deliveryInput.addEventListener("input", (event) => { deliveryPersonName = event.target.value; });
    const areaInput = document.getElementById("deliveryArea");
    if (areaInput) areaInput.addEventListener("input", (event) => { deliveryArea = event.target.value; });
    const search = document.getElementById("productSearch");
    if (search) search.addEventListener("input", (event) => { searchTerm = event.target.value; const list = document.querySelector(".menu-list"); if (list) { const products = data.products.filter((p) => p.name.toLowerCase().includes(searchTerm.trim().toLowerCase())); list.innerHTML = products.length ? products.map((p) => `<button class="menu-item" data-add-product="${p.id}"><strong>${esc(p.name)}</strong><span class="price">${money(p.price)} ج</span></button>`).join("") : `<div class="empty">لا توجد نتائج مطابقة</div>`; bindMenuEvents(); } });
    bindMenuEvents();
    document.querySelectorAll("[data-quantity]").forEach((input) => input.addEventListener("change", (event) => { const item = invoiceItems.find((entry) => entry.id === Number(event.target.dataset.quantity)); if (item) { item.quantity = Math.max(1, Number(event.target.value) || 1); render(); } }));
    document.querySelectorAll("[data-remove-item]").forEach((button) => button.addEventListener("click", () => { invoiceItems = invoiceItems.filter((item) => item.id !== Number(button.dataset.removeItem)); render(); }));
    const clear = document.getElementById("clearInvoice");
    if (clear) clear.addEventListener("click", () => { invoiceItems = []; orderType = "dine_in"; customerName = ""; phoneNumber = ""; deliveryPersonName = ""; deliveryArea = ""; lastInvoice = null; render(); });
    const save = document.getElementById("saveInvoice");
    if (save) save.addEventListener("click", saveInvoice);
    const print = document.getElementById("printInvoice");
    if (print) print.addEventListener("click", () => window.print());
    const gate = document.getElementById("gateForm");
    if (gate) gate.addEventListener("submit", (event) => { event.preventDefault(); if (document.getElementById("gatePassword").value === data.passwords.settings) { settingsUnlocked = true; render(); } else document.getElementById("gateError").innerHTML = `<div class="notice">كلمة المرور غير صحيحة</div>`; });
    document.querySelectorAll("[data-delete-invoice]").forEach((button) => button.addEventListener("click", () => { if (confirm("هل أنت متأكد من حذف هذه الفاتورة؟")) { data.invoices = data.invoices.filter((invoice) => invoice.id !== Number(button.dataset.deleteInvoice)); saveData(); render(); } }));
    const productForm = document.getElementById("productForm");
    if (productForm) productForm.addEventListener("submit", saveProduct);
    const passwordForm = document.getElementById("passwordForm");
    if (passwordForm) passwordForm.addEventListener("submit", saveSettingsPassword);
    document.querySelectorAll("[data-edit-product]").forEach((button) => button.addEventListener("click", () => { editingProductId = Number(button.dataset.editProduct); render(); const product = data.products.find((item) => item.id === editingProductId); document.getElementById("productName").value = product.name; document.getElementById("productPrice").value = product.price; }));
    document.querySelectorAll("[data-delete-product]").forEach((button) => button.addEventListener("click", () => { if (confirm("هل أنت متأكد من حذف هذا الصنف؟")) { data.products = data.products.filter((product) => product.id !== Number(button.dataset.deleteProduct)); saveData(); render(); } }));
  }

  function bindMenuEvents() {
    document.querySelectorAll("[data-add-product]").forEach((button) => button.addEventListener("click", () => {
      const product = data.products.find((item) => item.id === Number(button.dataset.addProduct));
      if (!product) return;
      const existing = invoiceItems.find((item) => item.id === product.id);
      if (existing) existing.quantity += 1;
      else invoiceItems.push({ ...product, quantity: 1 });
      searchTerm = "";
      render();
    }));
  }

  function saveInvoice() {
    customerName = customerName.trim();
    phoneNumber = phoneNumber.trim();
    deliveryPersonName = deliveryPersonName.trim();
    if (orderType === "delivery" && !customerName) return toast("يرجى إدخال اسم العميل", false);
    if (orderType === "delivery" && !deliveryPersonName) return toast("يرجى كتابة اسم الدليفيري", false);
    if (orderType === "delivery" && !deliveryArea) return toast("يرجى كتابة العنوان", false);
    if (!invoiceItems.length) return toast("يرجى إضافة أصناف للفاتورة", false);
    const total = invoiceItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const invoice = { id: Date.now(), number: data.invoices.length ? Math.max(...data.invoices.map((item) => item.number)) + 1 : 1, orderType, customerName: orderType === "delivery" ? customerName : "", phoneNumber: orderType === "delivery" ? phoneNumber : "", deliveryPersonName: orderType === "delivery" ? deliveryPersonName : "", deliveryArea: orderType === "delivery" ? deliveryArea : "", items: invoiceItems.map((item) => ({ ...item })), total, date: new Date().toLocaleString("ar-EG") };
    data.invoices.push(invoice); saveData(); lastInvoice = invoice; invoiceItems = []; orderType = "dine_in"; customerName = ""; phoneNumber = ""; deliveryPersonName = ""; deliveryArea = ""; toast("تم حفظ الفاتورة بنجاح", true); render();
  }

  function saveProduct(event) {
    event.preventDefault();
    const name = document.getElementById("productName").value.trim();
    const price = Number(document.getElementById("productPrice").value);
    if (!name || Number.isNaN(price)) return;
    if (editingProductId) data.products = data.products.map((product) => product.id === editingProductId ? { ...product, name, price } : product);
    else data.products.push({ id: Date.now(), name, price });
    editingProductId = null; saveData(); toast("تم حفظ الصنف بنجاح", true); render();
  }

  function saveSettingsPassword(event) {
    event.preventDefault();
    const current = document.getElementById("currentPassword").value;
    const next = document.getElementById("newPassword").value;
    const confirmation = document.getElementById("confirmPassword").value;
    if (current !== data.passwords.settings) return toast("كلمة المرور الحالية غير صحيحة", false);
    if (next.length < 4 || next !== confirmation) return toast("تحقق من كلمة المرور الجديدة", false);
    data.passwords.settings = next;
    saveData();
    toast("تم تغيير كلمة مرور الإعدادات", true);
    render();
  }

  render();
})();