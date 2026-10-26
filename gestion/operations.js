/* Operations for the fictional, browser-only preview. No network messages or payments. */
function roundMoney(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
function validMoney(value) {
  return (
    Number.isFinite(value) &&
    value >= 0 &&
    value <= 1000000 &&
    Math.abs(value * 100 - Math.round(value * 100)) < 0.00001
  );
}
function allPeriods(customer) {
  return [...previousPeriods(customer), customer];
}
function remainingClasses(period) {
  return Math.max(
    0,
    (period.count || 0) -
      (period.openingSessionsUsed || 0) -
      (period.sessionEvents || []).reduce((n, e) => n + e.delta, 0),
  );
}
function membershipEnd(customer, cutoff = today()) {
  return (
    allPeriods(customer)
      .filter((p) => p.unit !== "sessions" && p.end && p.start <= cutoff)
      .map((p) => p.end)
      .sort()
      .at(-1) || ""
  );
}
function activityDuration(a) {
  const n = a.count || a.months || 1;
  return a.unit === "sessions"
    ? `${n} ${n === 1 ? "clase" : "clases"} · sin vencimiento`
    : `${n} ${n === 1 ? "mes" : "meses"}`;
}
function periodTiming(p) {
  return p.unit === "sessions"
    ? `${remainingClasses(p)} de ${p.count} clases · sin vencimiento`
    : `${dateLabel(p.start)} a ${dateLabel(p.end)}`;
}
function normalizeInstagram(value) {
  const s = value.trim().replace(/^@/, "");
  return s ? `@${s}` : "";
}
function validInstagram(value) {
  return !value || /^@[A-Za-z0-9_.]{1,30}$/.test(value);
}
function instagramFields(prefix, c = {}) {
  return `<div class="field"><label for="${prefix}-instagram">Instagram (opcional)</label><input id="${prefix}-instagram" value="${escapeHtml(c.instagram || "")}" maxlength="31" placeholder="@usuario" autocapitalize="none" autocorrect="off"></div><label class="ops-check field wide"><input id="${prefix}-marketing" type="checkbox" ${c.marketingOptIn ? "checked" : ""}>Acepta recibir ofertas por WhatsApp</label><label class="ops-check field wide"><input id="${prefix}-instagram-marketing" type="checkbox" ${c.instagramMarketingOptIn ? "checked" : ""}>Acepta recibir ofertas por Instagram</label>`;
}
function upgradeOperationsState() {
  state.expenses ||= [];
  state.expenseTemplates ||= [];
  state.monthlyClosings ||= {};
  state.campaigns ||= [];
  for (const customer of state.customers) {
    customer.instagram ||= "";
    customer.marketingOptIn ||= false;
    customer.unit ||= "months";
    customer.count ||= 1;
    customer.sessionEvents ||= [];
    for (const period of previousPeriods(customer)) {
      period.unit ||= "months";
      period.count ||= 1;
      period.sessionEvents ||= [];
    }
  }
}
function packControls(c) {
  const packs = allPeriods(c)
    .map((p, i) => ({ p, index: i === previousPeriods(c).length ? -1 : i }))
    .filter(({ p }) => p.unit === "sessions");
  return packs.length
    ? `<section class="ops-section"><h2>Clases particulares</h2>${packs.map(({ p, index }) => `<div class="ops-entry"><span><strong>${escapeHtml(p.activityName)}</strong><small>${remainingClasses(p)} de ${p.count} clases disponibles · sin vencimiento</small></span><a class="button secondary" href="#clase/${escapeHtml(c.id)}/${index}">Ver clases</a></div>`).join("")}</section>`
    : "";
}
function sessionPage(id, index) {
  const c = state.customers.find((c) => c.id === id),
    p = c && (index < 0 ? c : previousPeriods(c)[index]);
  if (!p || p.unit !== "sessions") return void (location.hash = "#clientes");
  const debt = roundMoney(Math.max(0, p.price - paid(p)));
  app.innerHTML = layout(
    `<a class="nav-back" href="#cliente/${escapeHtml(id)}">← ${escapeHtml(c.name)}</a><section class="hero"><span class="eyebrow">CLASES PARTICULARES</span><h1>${escapeHtml(p.activityName)}.</h1><p>${escapeHtml(c.name)} · sin vencimiento</p></section><div class="ops-totals"><div><span>Clases disponibles</span><strong>${remainingClasses(p)} / ${p.count}</strong></div><div><span>Saldo del pack</span><strong>${money.format(debt)}</strong></div></div>${remainingClasses(p) && !c.archivedAt && !c.deletedAt ? `<form id="session-form" class="panel">${debt ? `<label class="ops-check"><input type="checkbox" id="session-debt" required>Confirmo la asistencia con ${money.format(debt)} pendientes del pack.</label>` : ""}<button class="button" type="submit">Registrar clase realizada</button></form>` : `<p class="notice">${c.archivedAt || c.deletedAt ? "Reactivá el perfil para registrar clases." : "Este pack utilizó todas sus clases. Podés agregar uno nuevo desde el perfil."}</p>`}<section class="ops-section"><h2>Clases y correcciones</h2>${
      (p.sessionEvents || []).length
        ? [...p.sessionEvents]
            .reverse()
            .map(
              (e) =>
                `<div class="ops-entry"><span><strong>${e.delta === 1 ? "Clase realizada" : "Clase devuelta"} · ${dateLabel(e.date)}</strong><small>${escapeHtml(e.reason || (e.debtAcknowledged ? "Asistencia con saldo pendiente confirmada" : "Registrada en recepción"))}</small></span>${e.delta === 1 && !p.sessionEvents.some((x) => x.reversalOf === e.id) ? `<button class="button ghost" data-session-reverse="${e.id}" type="button">Corregir</button>` : ""}</div>`,
            )
            .join("")
        : '<p class="empty">Todavía no se usaron clases de este pack.</p>'
    }</section>`,
    "clientes",
  );
  const form = document.querySelector("#session-form");
  if (form)
    form.onsubmit = (event) => {
      event.preventDefault();
      if (!remainingClasses(p)) return toast("No quedan clases disponibles.");
      p.sessionEvents.push({
        id: crypto.randomUUID(),
        date: today(),
        at: new Date().toISOString(),
        delta: 1,
        debtAcknowledged: debt > 0,
      });
      save();
      sessionPage(id, index);
      toast("Clase registrada.");
    };
  document.querySelectorAll("[data-session-reverse]").forEach(
    (button) =>
      (button.onclick = () => {
        const reason = window.prompt(
          "Motivo de la corrección (la clase se devuelve al pack):",
        );
        if (!reason || reason.trim().length < 3) return;
        if (
          p.sessionEvents.some(
            (e) => e.reversalOf === button.dataset.sessionReverse,
          )
        )
          return toast("La clase ya se corrigió.");
        p.sessionEvents.push({
          id: crypto.randomUUID(),
          date: today(),
          at: new Date().toISOString(),
          delta: -1,
          reversalOf: button.dataset.sessionReverse,
          reason: reason.trim().slice(0, 300),
        });
        save();
        sessionPage(id, index);
        toast("Clase devuelta. El registro anterior se conserva.");
      }),
  );
}
function expensePaid(e) {
  return roundMoney(
    (e.payments || []).reduce(
      (sum, p) => sum + p.amount * (p.reversalOf ? -1 : 1),
      0,
    ),
  );
}
function expenseBalance(e) {
  return roundMoney(Math.max(0, e.amount - expensePaid(e)));
}
function expenseMonthPayments(month) {
  return state.expenses.flatMap((e) =>
    (e.payments || [])
      .filter((p) => p.date.startsWith(month))
      .map((p) => ({ ...p, expenseId: e.id, title: e.title })),
  );
}
function historyOperationTabs(month) {
  return `<nav class="ops-tabs" aria-label="Secciones de historial"><a href="#movimientos/${month}">Movimientos</a><a href="#gastos/${month}">Gastos</a><a href="#resumen/${month}">Resumen y descarga</a></nav>`;
}
function historyExpenseSummary(month) {
  const spent = expenseMonthPayments(month).reduce(
      (n, p) => n + p.amount * (p.reversalOf ? -1 : 1),
      0,
    ),
    received = allPayments()
      .filter((p) => p.date.startsWith(month))
      .reduce((n, p) => n + p.amount, 0),
    pending = state.expenses.reduce((n, e) => n + expenseBalance(e), 0);
  return `<section class="ops-totals"><div><span>Gastado en el mes</span><strong>${money.format(spent)}</strong></div><div><span>Neto · cobrado menos gastado</span><strong>${money.format(received - spent)}</strong></div><div><span>Gastos pendientes · todos los meses</span><strong>${money.format(pending)}</strong></div></section>`;
}
function expenseDailyHtml(day) {
  const rows = expenseMonthPayments(day.slice(0, 7)).filter(
    (p) => p.date === day,
  );
  return `<section class="ledger-section"><h2>Gastos pagados y correcciones</h2>${rows.length ? rows.map((p) => `<div class="ops-entry"><span><strong>${escapeHtml(p.title)}</strong><small>${escapeHtml(p.method)} · ${p.reversalOf ? "Corrección" : "Pago"}${p.reason ? ` · ${escapeHtml(p.reason)}` : ""}</small></span><strong>${p.reversalOf ? "+" : "−"} ${money.format(p.amount)}</strong></div>`).join("") : '<p class="empty">No hay gastos pagados este día.</p>'}</section>`;
}
function expenseList(requestedMonth) {
  const month = validLedgerMonth(requestedMonth)
      ? requestedMonth
      : today().slice(0, 7),
    closed = state.monthlyClosings[month],
    rows = state.expenses
      .filter((e) => e.dueOn.startsWith(month))
      .sort((a, b) => a.dueOn.localeCompare(b.dueOn)),
    payments = expenseMonthPayments(month);
  app.innerHTML = layout(
    `<section class="hero"><span class="eyebrow">ADMINISTRACIÓN</span><h1>Gastos del gimnasio.</h1><p>Lo que vence, lo que pagaste y lo que queda pendiente.</p></section>${historyOperationTabs(month)}<form class="ops-month" id="expense-month"><label>Mes<input type="month" id="expense-month-value" value="${month}" required></label><button class="button secondary" type="submit">Ver mes</button></form>${historyExpenseSummary(month)}<div class="hero-actions">${closed ? '<p class="notice">Mes cerrado. Podés registrar pagos o correcciones con la fecha de hoy.</p>' : `<a class="button" href="#gasto/nuevo-${month}">+ Registrar gasto</a><button class="button secondary" type="button" id="generate-expenses">Generar recurrentes</button>`}<a class="button ghost" href="#plantillas">Plantillas recurrentes</a></div><section class="ops-section"><h2>Vencimientos de ${monthFmt.format(utc(`${month}-01`))}</h2>${rows.length ? rows.map((e) => `<article class="ops-item"><div class="ops-entry"><span><strong>${escapeHtml(e.title)}</strong><small>${escapeHtml(e.category)} · vence ${dateLabel(e.dueOn)}</small></span><strong>${money.format(e.amount)}</strong></div><p>${expenseBalance(e) === 0 ? "Pagado" : expensePaid(e) > 0 ? "Pago parcial" : "Pendiente"} · Abonado ${money.format(expensePaid(e))} · Falta ${money.format(expenseBalance(e))}</p>${e.notes ? `<p>${escapeHtml(e.notes)}</p>` : ""}<div class="form-actions">${expenseBalance(e) > 0 ? `<a class="button secondary" href="#gasto-pago/${e.id}">Registrar pago</a>` : ""}${!closed ? `<a class="button ghost" href="#gasto/${e.id}">Editar importe o concepto</a>` : ""}</div></article>`).join("") : '<p class="empty">No hay gastos registrados en este mes.</p>'}</section><section class="ops-section"><h2>Pagos y correcciones del mes</h2>${payments.length ? payments.map((p) => `<div class="ops-entry"><span><strong>${escapeHtml(p.title)} · ${money.format(p.amount)}</strong><small>${dateLabel(p.date)} · ${escapeHtml(p.method)} · ${p.reversalOf ? "Corrección" : "Pago"}${p.reason ? ` · ${escapeHtml(p.reason)}` : ""}</small></span>${!p.reversalOf && !state.expenses.find((e) => e.id === p.expenseId).payments.some((x) => x.reversalOf === p.id) ? `<button class="button ghost" data-reverse-expense="${p.id}" data-expense="${p.expenseId}" type="button">Corregir pago</button>` : ""}</div>`).join("") : '<p class="empty">Sin pagos de gastos.</p>'}</section>`,
    "movimientos",
  );
  document.querySelector("#expense-month").onsubmit = (event) => {
    event.preventDefault();
    location.hash = `#gastos/${document.querySelector("#expense-month-value").value}`;
  };
  const generate = document.querySelector("#generate-expenses");
  if (generate)
    generate.onclick = () => {
      let created = 0;
      for (const t of state.expenseTemplates.filter((t) => t.active)) {
        if (
          state.expenses.some(
            (e) => e.templateId === t.id && e.dueOn.startsWith(month),
          )
        )
          continue;
        const last = new Date(
          Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5)), 0),
        ).getUTCDate();
        state.expenses.push({
          id: crypto.randomUUID(),
          title: t.title,
          category: t.category,
          amount: t.amount,
          dueOn: `${month}-${String(Math.min(last, t.dueDay)).padStart(2, "0")}`,
          templateId: t.id,
          notes: "",
          payments: [],
        });
        created++;
      }
      save();
      expenseList(month);
      toast(`${created} gastos generados. Los existentes se conservaron.`);
    };
  document.querySelectorAll("[data-reverse-expense]").forEach(
    (button) =>
      (button.onclick = () => {
        const e = state.expenses.find((e) => e.id === button.dataset.expense),
          p = e?.payments.find((p) => p.id === button.dataset.reverseExpense);
        if (!p || e.payments.some((x) => x.reversalOf === p.id)) return;
        const reason = window.prompt(
          "Motivo de la corrección. El pago original se conserva y el importe se devuelve al saldo:",
        );
        if (!reason || reason.trim().length < 3) return;
        e.payments.push({
          id: crypto.randomUUID(),
          amount: p.amount,
          method: p.method,
          date: today(),
          reversalOf: p.id,
          reason: reason.trim().slice(0, 300),
        });
        save();
        expenseList(month);
        toast("Corrección registrada con la fecha de hoy.");
      }),
  );
}
function opsField(id, label, value = "", type = "text", extra = "") {
  return `<div class="field"><label for="${id}">${label}</label><input id="${id}" type="${type}" value="${escapeHtml(value)}" ${extra}></div>`;
}
function expenseEditor(id) {
  const e = state.expenses.find((e) => e.id === id),
    month =
      id?.startsWith("nuevo-") && validLedgerMonth(id.slice(6))
        ? id.slice(6)
        : e?.dueOn.slice(0, 7) || today().slice(0, 7);
  if (state.monthlyClosings[month])
    return void (location.hash = `#gastos/${month}`);
  app.innerHTML = layout(
    `<a class="nav-back" href="#gastos/${month}">← Gastos</a><section class="hero"><span class="eyebrow">ADMINISTRACIÓN</span><h1>${e ? "Editar gasto" : "Registrar gasto"}.</h1><p>El gasto queda previsto. Registrá su pago cuando salga el dinero.</p></section><form class="panel" id="expense-form"><div class="form-grid">${opsField("expense-title", "Concepto", e?.title || "", "text", 'required minlength="2" maxlength="100"')}${opsField("expense-category", "Categoría", e?.category || "Servicios", "text", 'required maxlength="60"')}${opsField("expense-amount", "Importe (ARS)", e?.amount || "", "number", 'required min="0.01" max="1000000" step="0.01" inputmode="decimal"')}${opsField("expense-due", "Vencimiento", e?.dueOn || (today().startsWith(month) ? today() : `${month}-01`), "date", "required")}${opsField("expense-notes", "Nota (opcional)", e?.notes || "", "text", 'maxlength="500"')}</div><div class="form-actions"><button class="button" type="submit">Guardar gasto</button><a class="button ghost" href="#gastos/${month}">Cancelar</a></div></form>`,
    "movimientos",
  );
  document.querySelector("#expense-form").onsubmit = (event) => {
    event.preventDefault();
    const title = document.querySelector("#expense-title").value.trim(),
      category = document.querySelector("#expense-category").value.trim(),
      amount = Number(document.querySelector("#expense-amount").value),
      dueOn = document.querySelector("#expense-due").value,
      notes = document.querySelector("#expense-notes").value.trim();
    if (
      title.length < 2 ||
      !category ||
      !validMoney(amount) ||
      amount <= 0 ||
      !validLedgerDay(dueOn) ||
      amount < expensePaid(e || {})
    )
      return toast("Revisá el gasto. El total debe cubrir lo que ya se pagó.");
    if (
      state.monthlyClosings[dueOn.slice(0, 7)] ||
      (e?.templateId && !dueOn.startsWith(month))
    )
      return toast("No se puede mover el gasto a ese mes.");
    if (e) Object.assign(e, { title, category, amount, dueOn, notes });
    else
      state.expenses.push({
        id: crypto.randomUUID(),
        title,
        category,
        amount,
        dueOn,
        notes,
        payments: [],
      });
    save();
    location.hash = `#gastos/${dueOn.slice(0, 7)}`;
    toast("Gasto guardado.");
  };
}
function expensePay(id) {
  const e = state.expenses.find((e) => e.id === id);
  if (!e) return void (location.hash = "#gastos");
  const amount = expenseBalance(e);
  app.innerHTML = layout(
    `<a class="nav-back" href="#gastos/${e.dueOn.slice(0, 7)}">← Gastos</a><section class="hero"><span class="eyebrow">PAGO DE GASTO</span><h1>${escapeHtml(e.title)}.</h1><p>Falta pagar ${money.format(amount)}. Se registra la salida con la fecha de hoy.</p></section><form class="panel" id="expense-pay"><div class="form-grid">${opsField("expense-cash", "Efectivo (ARS)", 0, "number", 'min="0" max="1000000" step="0.01"')}${opsField("expense-transfer", "Transferencia (ARS)", 0, "number", 'min="0" max="1000000" step="0.01"')}${opsField("expense-mp", "Mercado Pago (ARS)", 0, "number", 'min="0" max="1000000" step="0.01"')}</div><div class="form-actions"><button class="button" type="submit">Registrar pago</button></div></form>`,
    "movimientos",
  );
  document.querySelector("#expense-pay").onsubmit = (event) => {
    event.preventDefault();
    const lines = [
      ["expense-cash", "Efectivo"],
      ["expense-transfer", "Transferencia"],
      ["expense-mp", "Mercado Pago"],
    ].map(([key, method]) => ({
      amount: Number(document.getElementById(key).value),
      method,
    }));
    const total = roundMoney(lines.reduce((n, p) => n + p.amount, 0));
    if (
      lines.some((p) => !validMoney(p.amount)) ||
      !total ||
      total > expenseBalance(e)
    )
      return toast(
        "Revisá los importes: no pueden superar el saldo del gasto.",
      );
    for (const line of lines.filter((p) => p.amount > 0))
      e.payments.push({ ...line, id: crypto.randomUUID(), date: today() });
    save();
    location.hash = `#gastos/${e.dueOn.slice(0, 7)}`;
    toast("Pago del gasto registrado.");
  };
}
function templateEditor(id) {
  const t = state.expenseTemplates.find((t) => t.id === id);
  app.innerHTML = layout(
    `<a class="nav-back" href="#gastos">← Gastos</a><section class="hero"><span class="eyebrow">AGENDA MENSUAL</span><h1>Gastos recurrentes.</h1><p>El importe se sugiere al generar cada mes. Podés ajustarlo sin modificar meses anteriores.</p></section><section>${state.expenseTemplates.map((x) => `<a class="ops-entry" href="#plantillas/${x.id}"><span><strong>${escapeHtml(x.title)}</strong><small>Día ${x.dueDay} · ${x.active ? "Activa" : "Inactiva"}</small></span><strong>${money.format(x.amount)}</strong></a>`).join("")}</section><form class="panel" id="template-form"><h2>${t ? "Editar plantilla" : "Nueva plantilla"}</h2><div class="form-grid">${opsField("template-title", "Concepto", t?.title || "", "text", 'required minlength="2" maxlength="100"')}${opsField("template-category", "Categoría", t?.category || "Servicios", "text", 'required maxlength="60"')}${opsField("template-amount", "Importe sugerido (ARS)", t?.amount || "", "number", 'required min="0.01" max="1000000" step="0.01"')}${opsField("template-day", "Día de vencimiento", t?.dueDay || 10, "number", 'required min="1" max="31" step="1"')}<label class="ops-check"><input id="template-active" type="checkbox" ${t?.active !== false ? "checked" : ""}>Plantilla activa</label></div><div class="form-actions"><button class="button" type="submit">Guardar plantilla</button>${t ? '<a class="button ghost" href="#plantillas">Nueva plantilla</a>' : ""}</div></form>`,
    "movimientos",
  );
  document.querySelector("#template-form").onsubmit = (event) => {
    event.preventDefault();
    const title = document.querySelector("#template-title").value.trim(),
      category = document.querySelector("#template-category").value.trim(),
      amount = Number(document.querySelector("#template-amount").value),
      dueDay = Number(document.querySelector("#template-day").value),
      active = document.querySelector("#template-active").checked;
    if (
      title.length < 2 ||
      !category ||
      !validMoney(amount) ||
      amount <= 0 ||
      !Number.isInteger(dueDay) ||
      dueDay < 1 ||
      dueDay > 31
    )
      return toast("Revisá los datos de la plantilla.");
    if (t) Object.assign(t, { title, category, amount, dueDay, active });
    else
      state.expenseTemplates.push({
        id: crypto.randomUUID(),
        title,
        category,
        amount,
        dueDay,
        active,
      });
    save();
    templateEditor();
    toast("Plantilla guardada.");
  };
}
function reportData(month, asOfMonthEnd = false) {
  const payments = allPayments().filter((p) => p.date.startsWith(month)),
    expenses = expenseMonthPayments(month),
    until = shiftLedgerMonth(month, 1);
  const debts = state.customers
    .flatMap((c) =>
      allPeriods(c)
        .filter((p) => !asOfMonthEnd || p.start.slice(0, 7) < until)
        .map((p) => ({
          name: c.name,
          activityName: p.activityName,
          start: p.start,
          unit: p.unit || "months",
          balance: roundMoney(
            Math.max(
              0,
              p.price -
                (p.openingPaid || 0) -
                p.payments
                  .filter((x) => !asOfMonthEnd || x.date.slice(0, 7) < until)
                  .reduce((n, x) => n + x.amount, 0),
            ),
          ),
        })),
    )
    .filter((d) => d.balance > 0);
  const pendingExpenses = roundMoney(
    state.expenses
      .filter((e) => !asOfMonthEnd || e.dueOn.slice(0, 7) < until)
      .reduce(
        (n, e) =>
          n +
          Math.max(
            0,
            e.amount -
              (e.payments || [])
                .filter((p) => !asOfMonthEnd || p.date.slice(0, 7) < until)
                .reduce(
                  (sum, p) => sum + p.amount * (p.reversalOf ? -1 : 1),
                  0,
                ),
          ),
        0,
      ),
  );
  return {
    month,
    pendingExpenses,
    payments: structuredClone(payments),
    expenses: structuredClone(expenses),
    debts,
    received: roundMoney(payments.reduce((n, p) => n + p.amount, 0)),
    spent: roundMoney(
      expenses.reduce((n, p) => n + p.amount * (p.reversalOf ? -1 : 1), 0),
    ),
    pending: roundMoney(debts.reduce((n, d) => n + d.balance, 0)),
    pendingMemberships: roundMoney(
      debts
        .filter((d) => d.start.startsWith(month) && d.unit !== "sessions")
        .reduce((n, d) => n + d.balance, 0),
    ),
    pendingClasses: roundMoney(
      debts
        .filter((d) => d.start.startsWith(month) && d.unit === "sessions")
        .reduce((n, d) => n + d.balance, 0),
    ),
  };
}
function safeCsv(rows) {
  return (
    "\uFEFF" +
    rows
      .map((row) =>
        row
          .map((v) => {
            let s =
              typeof v === "number"
                ? String(v).replace(".", ",")
                : String(v ?? "");
            if (typeof v === "string" && /^[\s]*[=+\-@]/.test(s)) s = "'" + s;
            return '"' + s.replaceAll('"', '""') + '"';
          })
          .join(";"),
      )
      .join("\r\n")
  );
}
function downloadCsv(data, frozen) {
  const rows = [
    [
      "Shelby Gym",
      data.month,
      frozen ? "Cierre conservado" : "Valores actuales",
    ],
    ["Generado", new Date().toISOString(), "ARS · Argentina"],
    [],
    ["Indicador", "Importe ARS"],
    ["Cobrado", data.received],
    ["Gastado", data.spent],
    ["Neto", roundMoney(data.received - data.spent)],
    ["Pendiente cuotas del mes", data.pendingMemberships],
    ["Pendiente clases del mes", data.pendingClasses],
    ["Pendiente total", data.pending],
    ["Gastos pendientes", data.pendingExpenses || 0],
    [],
    ["Fecha", "Tipo", "Cliente / concepto", "Actividad / medio", "Importe ARS"],
    ...data.payments.map((p) => [
      p.date,
      "Cobro",
      p.customerName,
      `${p.activityName} · ${p.method}`,
      p.amount,
    ]),
    ...data.expenses.map((p) => [
      p.date,
      p.reversalOf ? "Corrección de gasto" : "Gasto",
      p.title,
      p.method,
      p.amount * (p.reversalOf ? 1 : -1),
    ]),
    [],
    ["Mes de origen", "Cliente", "Actividad", "Pendiente ARS"],
    ...data.debts.map((d) => [
      d.start.slice(0, 7),
      d.name,
      d.activityName,
      d.balance,
    ]),
  ];
  const url = URL.createObjectURL(
      new Blob([safeCsv(rows)], { type: "text/csv;charset=utf-8" }),
    ),
    a = document.createElement("a");
  a.href = url;
  a.download = `shelby-${data.month}-${frozen ? "cierre" : "actual"}.csv`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function monthReport(requestedMonth, version) {
  const month = validLedgerMonth(requestedMonth)
      ? requestedMonth
      : today().slice(0, 7),
    saved = state.monthlyClosings[month],
    frozen = !!saved && version !== "actual",
    data = frozen ? saved.data : reportData(month);
  app.innerHTML = layout(
    `<article class="ops-report"><section class="hero"><span class="eyebrow">SHELBY GYM · RESUMEN MENSUAL</span><h1>${monthFmt.format(utc(`${month}-01`))}.</h1><p>${frozen ? "Cierre conservado con las deudas al último día del mes." : month === today().slice(0, 7) ? "Resumen parcial. Los saldos pendientes son los actuales." : "Consulta actualizada. Los saldos incluyen los pagos posteriores."}</p></section>${historyOperationTabs(month)}<div class="form-actions ops-report-actions">${saved ? `<a class="button secondary" href="#resumen/${month}/${frozen ? "actual" : "cierre"}">${frozen ? "Ver saldos actuales" : "Ver cierre guardado"}</a>` : ""}<button class="button secondary" id="export-report" type="button">Descargar CSV / Excel</button><button class="button ghost" id="print-report" type="button">Imprimir / guardar PDF</button></div><p class="ops-generated">Generado ${dateLabel(today())} · ARS · Argentina${saved && frozen ? ` · cierre ${dateLabel(saved.date)}` : ""}</p><section class="ops-totals">${[
      ["Cobrado", data.received],
      ["Gastado", data.spent],
      ["Neto del mes", roundMoney(data.received - data.spent)],
      ["Gastos pendientes", data.pendingExpenses || 0],
      ["Pendiente de cuotas del mes", data.pendingMemberships],
      ["Pendiente de clases del mes", data.pendingClasses],
      [
        frozen ? "Pendiente total al cierre" : "Pendiente total actual",
        data.pending,
      ],
    ]
      .map(
        ([label, n]) =>
          `<div><span>${label}</span><strong>${money.format(n)}</strong></div>`,
      )
      .join(
        "",
      )}</section><section class="ops-section"><h2>Cobros por medio</h2>${["Efectivo", "Transferencia", "Mercado Pago"].map((m) => `<div class="ops-entry"><span>${m}</span><strong>${money.format(data.payments.filter((p) => p.method === m).reduce((n, p) => n + p.amount, 0))}</strong></div>`).join("")}</section><section class="ops-section"><h2>Abonos recibidos</h2>${data.payments.length ? data.payments.map((p) => `<div class="ops-entry"><span><strong>${escapeHtml(p.customerName)}</strong><small>${dateLabel(p.date)} · ${escapeHtml(p.activityName)} · ${escapeHtml(p.method)}</small></span><strong>${money.format(p.amount)}</strong></div>`).join("") : '<p class="empty">Sin cobros.</p>'}</section><section class="ops-section"><h2>Gastos pagados</h2>${data.expenses.length ? data.expenses.map((e) => `<div class="ops-entry"><span>${escapeHtml(e.title)}<small>${dateLabel(e.date)} · ${escapeHtml(e.method)}${e.reversalOf ? " · Corrección" : ""}</small></span><strong>${e.reversalOf ? "+" : "−"} ${money.format(e.amount)}</strong></div>`).join("") : '<p class="empty">Sin gastos pagados.</p>'}</section><section class="ops-section"><h2>Deudas por mes de origen</h2>${data.debts.length ? data.debts.map((d) => `<div class="ops-entry"><span>${escapeHtml(d.name)}<small>${d.start.slice(0, 7)} · ${escapeHtml(d.activityName)}</small></span><strong>${money.format(d.balance)}</strong></div>`).join("") : '<p class="empty">Sin saldos pendientes.</p>'}</section>${!saved && month < today().slice(0, 7) ? '<div class="panel ops-close"><h2>Conservar cierre del mes</h2><p>Revisá los movimientos antes de cerrar. Se guarda una copia que no cambia con los pagos posteriores.</p><button class="button" id="close-report" type="button">Cerrar y conservar resumen</button></div>' : ""}</article>`,
    "movimientos",
  );
  document.querySelector("#export-report").onclick = () =>
    downloadCsv(data, frozen);
  document.querySelector("#print-report").onclick = () => window.print();
  const close = document.querySelector("#close-report");
  if (close)
    close.onclick = () => {
      if (
        !window.confirm(
          "¿Cerrar el mes y conservar este resumen? No se podrá sobrescribir desde la demo.",
        )
      )
        return;
      if (state.monthlyClosings[month]) return;
      state.monthlyClosings[month] = {
        date: today(),
        at: new Date().toISOString(),
        data: structuredClone(reportData(month, true)),
      };
      save();
      monthReport(month, "cierre");
      toast("Cierre mensual conservado.");
    };
}
