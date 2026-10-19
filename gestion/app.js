/* Shelby Gym mobile walkthrough. All records are fictional and live in this browser only. */
const KEY = "shelby-gym-demo-v1";
const UNLOCK = "shelby-gym-demo-unlocked";
const money = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0,
});
const dateFmt = new Intl.DateTimeFormat("es-AR", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});
const monthFmt = new Intl.DateTimeFormat("es-AR", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});
const app = document.querySelector("#app");
let filter = "todos",
  query = "",
  birthdayOffset = 0;
const today = () =>
  new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "America/Argentina/Buenos_Aires",
  }).format(new Date());
const utc = (s) => new Date(`${s}T12:00:00Z`);
const dateLabel = (s) => (s ? dateFmt.format(utc(s)) : "—");
function birthdayMonth(offset) {
  const [year, month] = today().split("-").map(Number);
  return new Date(Date.UTC(year, month - 1 + offset, 15));
}
const escapeHtml = (v) =>
  String(v ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
function addMonths(s, count) {
  const [y, m, d] = s.split("-").map(Number);
  const last = new Date(Date.UTC(y, m - 1 + count + 1, 0)).getUTCDate();
  return new Date(Date.UTC(y, m - 1 + count, Math.min(d, last)))
    .toISOString()
    .slice(0, 10);
}
function shiftDays(s, days) {
  const d = utc(s);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
const daysPast = (s) => Math.max(0, Math.floor((utc(today()) - utc(s)) / 86400000));
const currentCustomers = () => state.customers.filter((c) => !c.archivedAt && !c.deletedAt);
function previousPeriods(c) {
  return Array.isArray(c.history) ? c.history : [];
}
function periodSnapshot(c) {
  return {
    activityName: c.activityName,
    price: c.price,
    start: c.start,
    end: c.end,
    payments: c.payments.map((p) => ({ ...p })),
  };
}
function logLifecycle(c, title, detail) {
  c.lifecycleEvents = [...(c.lifecycleEvents || []), { date: today(), title, detail }];
}
function seed() {
  const now = today();
  const activities = [
    { id: "musculacion", name: "Musculación", price: 35000, months: 1 },
    { id: "boxeo", name: "Boxeo", price: 30000, months: 1 },
    { id: "combinado", name: "Musculación + boxeo", price: 54000, months: 1 },
  ];
  const sample = [
    ["Sofía Martínez", "musculacion", 35000, -8, 35, "1997-10-18"],
    ["Tomás Álvarez", "boxeo", 15000, -6, 30, "1999-11-06"],
    ["Lucía Fernández", "combinado", 54000, -19, 54, "1992-10-27"],
    ["Valentina López", "musculacion", 20000, -27, 35, "1995-11-22"],
    ["Nicolás Romero", "boxeo", 30000, -42, 30, "1989-03-14"],
    ["Mateo González", "musculacion", 12000, -45, 35, "2001-08-09"],
  ];
  return {
    activities,
    customers: sample.map(
      ([name, activityId, paid, offset, totalThousands, birthDate], i) => {
        const start = shiftDays(now, offset);
        return {
          id: `demo-${i}`,
          name,
          phone: "",
          birthDate,
          activityId,
          activityName: activities.find((a) => a.id === activityId).name,
          price: totalThousands * 1000,
          start,
          end: addMonths(start, 1),
          payments: [
            {
              method: i % 2 ? "Efectivo" : "Transferencia",
              amount: paid,
              date: start,
            },
          ],
        };
      },
    ),
  };
}
let state;
try {
  state = JSON.parse(localStorage.getItem(KEY)) || seed();
  if (!Array.isArray(state.activities) || !Array.isArray(state.customers))
    throw Error();
} catch {
  state = seed();
}
function save() {
  localStorage.setItem(KEY, JSON.stringify(state));
}
function paid(c) {
  return c.payments.reduce((sum, p) => sum + p.amount, 0);
}
function currentBalance(c) {
  return Math.max(0, c.price - paid(c));
}
function balance(c) {
  return currentBalance(c) + previousPeriods(c).reduce((sum, p) => sum + Math.max(0, p.price - p.payments.reduce((n, payment) => n + payment.amount, 0)), 0);
}
function status(c) {
  return c.deletedAt
    ? ["Eliminado", "archived"]
    : c.archivedAt
    ? ["De baja", "archived"]
    : c.end <= shiftDays(today(), -30)
      ? ["Vencida +30 días", "expired"]
      : c.end <= today()
    ? ["Vencida", "expired"]
    : balance(c)
      ? ["Con saldo", "due"]
      : ["Al día", "paid"];
}
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
let activeToast;
let toastTimer;
function toast(s) {
  clearTimeout(toastTimer);
  activeToast?.remove();
  const t = document.createElement("div");
  t.className = "toast";
  t.role = "status";
  t.textContent = s;
  document.body.append(t);
  activeToast = t;
  requestAnimationFrame(() => t.classList.add("is-visible"));
  toastTimer = setTimeout(() => {
    t.classList.remove("is-visible");
    t.addEventListener("transitionend", () => t.remove(), { once: true });
    setTimeout(() => t.remove(), 250);
    if (activeToast === t) activeToast = undefined;
  }, 3000);
}
let listAnimation;
function revealFilteredList() {
  if (reducedMotion.matches) return;
  const list = document.querySelector("#main .list");
  if (!list || list.children.length > 24) return;
  listAnimation?.cancel();
  listAnimation = list.animate(
    [
      { opacity: 0.7, transform: "translateY(4px)" },
      { opacity: 1, transform: "translateY(0)" },
    ],
    { duration: 180, easing: "cubic-bezier(0.23, 1, 0.32, 1)" },
  );
}
const brand = `<div class="brand" aria-label="Shelby Gym"><span class="brand-emblem"><img src="shelby-reference.jpg" alt="" width="574" height="1280"></span><span>SHELBY<b>GYM</b></span></div>`;
function nav(section) {
  return `<nav class="bottomnav" aria-label="Secciones"><a href="#inicio" ${section === "inicio" ? 'aria-current="page"' : ""}><span aria-hidden="true">⌂</span>Inicio</a><a href="#actividades" ${section === "actividades" ? 'aria-current="page"' : ""}><span aria-hidden="true">◈</span>Actividades</a><a href="#clientes" ${section === "clientes" ? 'aria-current="page"' : ""}><span aria-hidden="true">☷</span>Clientes</a><a href="#movimientos" ${section === "movimientos" ? 'aria-current="page"' : ""}><span aria-hidden="true">≡</span>Historial</a></nav>`;
}
function layout(content, section) {
  return `<div class="shell"><header class="topbar">${brand}<span class="demo-badge">DEMO · DATOS FICTICIOS</span></header><main id="main">${content}</main><p class="footnote">Vista previa interactiva. Los cambios se guardan únicamente en este navegador; no hay clientes reales ni cobros.</p></div>${nav(section)}`;
}
function lock() {
  app.innerHTML = `<main class="lock"><div class="panel">${brand}<h1>Entrá a la demo.</h1><p>Probá las actividades, registrá clientes y revisá cuotas y cumpleaños desde tu celular.</p><p class="notice">Todos los nombres e importes son ficticios. Esta muestra no envía avisos ni cobra dinero.</p><form id="unlock"><label for="pin">Contraseña de demostración</label><input id="pin" type="password" autocomplete="off" required><button class="button" type="submit">Abrir Shelby Gym</button><span id="pin-error" role="alert"></span></form></div></main>`;
  document.querySelector("#unlock").onsubmit = (e) => {
    e.preventDefault();
    if (
      document.querySelector("#pin").value.trim().toUpperCase() === "SHELBY26"
    ) {
      sessionStorage.setItem(UNLOCK, "yes");
      location.hash = "#inicio";
      render();
    } else
      document.querySelector("#pin-error").textContent =
        "Contraseña incorrecta.";
  };
}
function customerRow(c) {
  const [label, type] = status(c);
  const timing = c.deletedAt ? `Eliminado: ${dateLabel(c.deletedAt)}` : c.archivedAt ? `Baja: ${dateLabel(c.archivedAt)}` : c.end <= today() ? `Venció ${dateLabel(c.end)} · hace ${daysPast(c.end)} días` : `Vence ${dateLabel(c.end)}`;
  return `<button class="row rowbutton" type="button" data-customer="${escapeHtml(c.id)}"><span><strong>${escapeHtml(c.name)}</strong><small>${timing}</small></span><span class="activity muted">${escapeHtml(c.activityName)}</span><span class="amount"><span class="status ${type}">${label}</span><small>${balance(c) ? `${money.format(balance(c))} pendientes` : "Cuota completa"}</small></span></button>`;
}
function birthdayRow(c) {
  return `<button class="row rowbutton birthday-row" type="button" data-customer="${escapeHtml(c.id)}"><span class="birthday-day">${escapeHtml(c.birthDate.slice(8))}</span><span><strong>${escapeHtml(c.name)}</strong><small>${new Intl.DateTimeFormat("es-AR", { day: "numeric", month: "long", timeZone: "UTC" }).format(utc(c.birthDate))}</small></span><span aria-hidden="true">›</span></button>`;
}
function bindCustomerRows() {
  document.querySelectorAll("[data-customer]").forEach((el) => {
    el.onclick = () => (location.hash = `#cliente/${el.dataset.customer}`);
  });
}
function home() {
  const active = currentCustomers();
  const overdue = active.filter((c) => c.end <= today()).length;
  const owing = active.filter((c) => balance(c) > 0).length;
  const recent = [...active]
    .sort((a, b) => b.start.localeCompare(a.start))
    .slice(0, 3);
  const content = `<section class="hero"><span class="eyebrow">RECEPCIÓN · SHELBY GYM</span><h1>Todo en orden,<br>de un vistazo.</h1><p>Quién está al día, quién tiene saldo y a quién se le venció la cuota.</p><div class="hero-actions"><a class="button" href="#nuevo">+ Registrar cliente</a><a class="button secondary" href="#clientes">Ver todos los clientes</a></div></section><div class="metrics"><div class="metric"><strong>${active.length}</strong><span>Clientes activos</span></div><div class="metric alert"><strong>${owing}</strong><span>Con saldo</span></div><div class="metric alert"><strong>${overdue}</strong><span>Vencidos</span></div></div><div class="section-title"><h2>Últimos registros</h2><a class="section-link" href="#clientes">Ver lista completa →</a></div><div class="list">${recent.length ? recent.map(customerRow).join("") : '<div class="empty">Todavía no hay clientes activos. Podés registrar o reactivar a una persona.</div>'}</div>`;
  app.innerHTML = layout(content, "inicio");
  bindCustomerRows();
}
function clients() {
  listAnimation?.cancel();
  const monthDate = birthdayMonth(birthdayOffset);
  const month = monthDate.getUTCMonth() + 1;
  const rows = state.customers
    .filter((c) =>
      c.name.toLocaleLowerCase("es").includes(query.toLocaleLowerCase("es")),
    )
    .filter((c) => {
      if (filter === "retirados") return Boolean(c.deletedAt);
      if (filter === "bajas") return Boolean(c.archivedAt) && !c.deletedAt;
      if (c.archivedAt || c.deletedAt) return false;
      if (filter === "saldo") return balance(c) > 0;
      if (filter === "aldia") return c.end > today() && balance(c) === 0;
      if (filter === "vencidas") return c.end <= today();
      if (filter === "mas30") return c.end <= shiftDays(today(), -30);
      if (filter === "cumpleanos")
        return c.birthDate && Number(c.birthDate.slice(5, 7)) === month;
      return true;
    });
  if (filter === "cumpleanos")
    rows.sort(
      (a, b) =>
        a.birthDate.slice(8).localeCompare(b.birthDate.slice(8)) ||
        a.name.localeCompare(b.name, "es"),
    );
  const monthPicker =
    filter === "cumpleanos"
      ? `<div class="month-picker"><label for="birthday-month">Mes de cumpleaños</label><select id="birthday-month">${Array.from({ length: 12 }, (_, offset) => `<option value="${offset}" ${offset === birthdayOffset ? "selected" : ""}>${monthFmt.format(birthdayMonth(offset))}</option>`).join("")}</select><p>Desde este mes y durante los próximos 12 meses.</p></div>`
      : "";
  const content = `<section class="hero"><span class="eyebrow">TU COMUNIDAD</span><h1>Clientes.</h1><p>Todos los perfiles en un mismo lugar. Consultá cuotas o prepará el sorteo de cumpleaños.</p><div class="hero-actions"><a class="button" href="#nuevo">+ Registrar cliente</a></div></section><div class="section-title"><h2>${filter === "cumpleanos" ? `Cumpleaños de ${monthFmt.format(monthDate)}` : "Todos los clientes"}</h2><span>${rows.length} ${rows.length === 1 ? "cliente" : "clientes"}</span></div><div class="toolbar"><input id="search" class="search" type="search" aria-label="Buscar cliente" placeholder="Buscar por nombre" value="${escapeHtml(query)}">${[
    ["todos", "Todos"],
    ["saldo", "Con saldo"],
    ["aldia", "Al día"],
    ["vencidas", "Vencidas"],
    ["mas30", "+30 días"],
    ["bajas", "Bajas"],
    ["retirados", "Eliminados"],
    ["cumpleanos", "Cumpleaños"],
  ]
    .map(
      ([id, label]) =>
        `<button class="chip" type="button" data-filter="${id}" aria-pressed="${filter === id}">${label}</button>`,
    )
    .join("")}</div>${monthPicker}<div class="list">${
    rows.length
      ? rows.map(filter === "cumpleanos" ? birthdayRow : customerRow).join("")
      : `<div class="empty">${filter === "cumpleanos" ? "No hay cumpleaños registrados en este mes. Probá otro mes o completá la fecha desde el perfil." : "No hay clientes para este filtro. Probá otro o registrá uno nuevo."}</div>`
  }</div>`;
  app.innerHTML = layout(content, "clientes");
  document.querySelector("#search").oninput = (e) => {
    query = e.target.value;
    const pos = e.target.selectionStart;
    clients();
    const el = document.querySelector("#search");
    el.focus();
    el.setSelectionRange(pos, pos);
  };
  document.querySelectorAll("[data-filter]").forEach((el) => {
    el.onclick = (event) => {
      if (filter === el.dataset.filter) return;
      filter = el.dataset.filter;
      if (filter === "cumpleanos") birthdayOffset = 0;
      clients();
      if (event.detail === 0)
        document.querySelector(`[data-filter="${filter}"]`)?.focus({ preventScroll: true });
      else revealFilteredList();
    };
  });
  const picker = document.querySelector("#birthday-month");
  if (picker) {
    picker.onchange = () => {
      birthdayOffset = Number(picker.value);
      clients();
      document.querySelector("#birthday-month").focus();
    };
  }
  bindCustomerRows();
}
function activities() {
  const content = `<section class="hero"><span class="eyebrow">CONFIGURACIÓN COMERCIAL</span><h1>Actividades.</h1><p>El dueño define aquí el precio y duración. Al registrar a una persona, estas opciones ya están disponibles.</p><div class="hero-actions"><a class="button" href="#actividad-nueva">+ Nueva actividad</a></div></section><div class="list">${state.activities.map((a) => `<div class="row"><span><strong>${escapeHtml(a.name)}</strong><small>Plantilla activa</small></span><span class="muted">${a.months} ${a.months === 1 ? "mes" : "meses"}</span><span class="amount">${money.format(a.price)}</span></div>`).join("")}</div><p class="notice">Cada cuota conserva el precio con el que fue registrada, aunque después cambie el de una actividad.</p>`;
  app.innerHTML = layout(content, "actividades");
}
function activityNew() {
  app.innerHTML = layout(
    `<button class="nav-back" onclick="location.hash='#actividades'">← Actividades</button><section class="hero"><span class="eyebrow">NUEVA PLANTILLA</span><h1>Crear actividad.</h1><p>Una actividad puede combinar varias disciplinas y tener su propio precio.</p></section><form class="panel" id="activity-form"><div class="form-grid"><div class="field wide"><label for="activity-name">Nombre de la actividad</label><input id="activity-name" required maxlength="80" placeholder="Ej. Musculación + kickboxing"></div><div class="field"><label for="activity-price">Precio mensual (ARS)</label><input id="activity-price" required type="number" min="1" max="100000000" step="1" inputmode="numeric" placeholder="45000"></div><div class="field"><label for="activity-months">Duración en meses</label><input id="activity-months" required type="number" min="1" max="24" value="1" step="1" inputmode="numeric"></div></div><div class="form-actions"><button class="button" type="submit">Guardar actividad</button><a class="button ghost" href="#actividades">Cancelar</a></div></form>`,
    "actividades",
  );
  document.querySelector("#activity-form").onsubmit = (e) => {
    e.preventDefault();
    const name = document.querySelector("#activity-name").value.trim(),
      price = Number(document.querySelector("#activity-price").value),
      months = Number(document.querySelector("#activity-months").value);
    if (
      !name ||
      !Number.isInteger(price) ||
      price <= 0 ||
      !Number.isInteger(months) ||
      months < 1 ||
      months > 24
    )
      return toast("Revisá los datos de la actividad.");
    state.activities.push({ id: crypto.randomUUID(), name, price, months });
    save();
    location.hash = "#actividades";
    toast("Actividad creada.");
  };
}
function newCustomer() {
  const options = state.activities
    .map(
      (a) =>
        `<option value="${escapeHtml(a.id)}">${escapeHtml(a.name)} · ${money.format(a.price)} / ${a.months} ${a.months === 1 ? "mes" : "meses"}</option>`,
    )
    .join("");
  app.innerHTML = layout(
    `<button class="nav-back" onclick="location.hash='#clientes'">← Clientes</button><section class="hero"><span class="eyebrow">ALTA EN UN SOLO PASO</span><h1>Nuevo cliente.</h1><p>Completá el perfil, elegí la actividad y anotá el primer abono. Se pueden combinar dos medios y dejar saldo pendiente.</p></section><form class="panel" id="customer-form"><div class="form-grid"><div class="field wide"><label for="customer-name">Nombre y apellido</label><input id="customer-name" required minlength="2" maxlength="120" autocomplete="name" placeholder="Ej. Clara Díaz"></div><div class="field"><label for="customer-phone">Celular (opcional)</label><input id="customer-phone" type="tel" maxlength="40" autocomplete="tel" placeholder="+54 9 11 1234 5678"></div><div class="field"><label for="customer-birth">Fecha de cumpleaños (opcional)</label><input id="customer-birth" type="date" max="${today()}" autocomplete="bday"></div><div class="field wide"><label for="customer-activity">Actividad</label><select id="customer-activity" required>${options}</select></div><div class="field"><label for="payment-1">Primer abono (ARS)</label><input id="payment-1" type="number" min="0" step="1" inputmode="numeric" value="0" required></div><div class="field"><label for="method-1">Medio</label><select id="method-1"><option>Transferencia</option><option>Efectivo</option><option>Mercado Pago</option></select></div><div class="field"><label for="payment-2">Segundo medio (ARS, opcional)</label><input id="payment-2" type="number" min="0" step="1" inputmode="numeric" value="0"></div><div class="field"><label for="method-2">Medio adicional</label><select id="method-2"><option>Efectivo</option><option>Transferencia</option><option>Mercado Pago</option></select></div></div><p class="notice">La vigencia empieza con el primer abono. Si queda saldo, se ve en Clientes y puede completarse después.</p><div class="form-actions"><button class="button" type="submit">Registrar cliente</button><a class="button ghost" href="#clientes">Cancelar</a></div></form>`,
    "clientes",
  );
  document.querySelector("#customer-form").onsubmit = (e) => {
    e.preventDefault();
    const name = document.querySelector("#customer-name").value.trim(),
      phone = document.querySelector("#customer-phone").value.trim(),
      birthDate = document.querySelector("#customer-birth").value,
      activityId = document.querySelector("#customer-activity").value,
      activity = state.activities.find((a) => a.id === activityId),
      p1 = Number(document.querySelector("#payment-1").value),
      p2 = Number(document.querySelector("#payment-2").value);
    if (
      !name ||
      !activity ||
      !Number.isFinite(p1) ||
      !Number.isFinite(p2) ||
      p1 < 0 ||
      p2 < 0 ||
      p1 + p2 <= 0 ||
      p1 + p2 > activity.price ||
      (birthDate && birthDate > today())
    )
      return toast("Revisá el abono y los datos del cliente.");
    const start = today(),
      id = crypto.randomUUID();
    state.customers.unshift({
      id,
      name,
      phone,
      birthDate,
      activityId,
      activityName: activity.name,
      price: activity.price,
      start,
      end: addMonths(start, activity.months),
      payments: [
        [p1, "method-1"],
        [p2, "method-2"],
      ]
        .filter(([amount]) => amount > 0)
        .map(([amount, key]) => ({
          amount,
          method: document.querySelector(`#${key}`).value,
          date: start,
        })),
      history: [],
      archivedAt: null,
      deletedAt: null,
      createdAt: start,
      lifecycleEvents: [],
    });
    save();
    location.hash = `#cliente/${id}`;
    toast("Cliente registrado.");
  };
}
function detail(id) {
  const c = state.customers.find((x) => x.id === id);
  if (!c) {
    location.hash = "#clientes";
    return;
  }
  const [label, type] = status(c),
    remainder = currentBalance(c),
    oldBalance = balance(c) - remainder,
    history = previousPeriods(c).slice().reverse();
  app.innerHTML = layout(
    `<button class="nav-back" onclick="location.hash='#clientes'">← Clientes</button><section class="hero"><span class="eyebrow">PERFIL DE CLIENTE</span><h1>${escapeHtml(c.name)}.</h1><p>${escapeHtml(c.activityName)} · ${dateLabel(c.start)} a ${dateLabel(c.end)}</p></section>${c.deletedAt ? `<p class="notice">Perfil eliminado el ${dateLabel(c.deletedAt)}. Cuotas y pagos conservados; podés recuperarlo si vuelve.</p>` : c.archivedAt ? `<p class="notice">Dado de baja el ${dateLabel(c.archivedAt)}. El historial y los saldos se conservan. Para volver, iniciá una cuota con el precio actual.</p>` : c.end <= shiftDays(today(), -30) ? `<p class="notice">La cuota venció hace ${daysPast(c.end)} días. El perfil sigue disponible; no se cobra automáticamente ni se borra por falta de pago.</p>` : ""}<div class="panel"><div class="detail-hero"><h2>Última cuota</h2><span class="status ${type}">${label}</span></div><div class="detail-grid"><div><span>Total acordado</span><strong>${money.format(c.price)}</strong></div><div><span>Abonado</span><strong>${money.format(paid(c))}</strong></div><div><span>Saldo pendiente</span><strong>${money.format(remainder)}</strong></div></div>${oldBalance ? `<p class="notice">Hay ${money.format(oldBalance)} pendientes de cuotas anteriores. El regreso no borra esa deuda.</p>` : ""}<div class="form-actions">${remainder ? `<a class="button" href="#abonar/${escapeHtml(c.id)}">+ Registrar abono</a>` : ""}${c.archivedAt || c.deletedAt ? `<a class="button" href="#regresar/${escapeHtml(c.id)}">Reactivar cliente</a>` : c.end <= today() ? `<a class="button secondary" href="#regresar/${escapeHtml(c.id)}">Iniciar nueva cuota</a>` : ""}<a class="button secondary" href="#editar/${escapeHtml(c.id)}">Editar perfil</a></div><hr class="divider"><div><strong>Celular:</strong> ${escapeHtml(c.phone || "Sin registrar")}</div><div><strong>Cumpleaños:</strong> ${dateLabel(c.birthDate)}</div><hr class="divider"><h2>Abonos de esta cuota</h2><ol class="payments">${c.payments.map((p) => `<li>${dateLabel(p.date)} · ${escapeHtml(p.method)} · <strong>${money.format(p.amount)}</strong></li>`).join("")}</ol></div>${history.length ? `<section class="history"><h2>Cuotas anteriores</h2>${history.map((p, index) => `<details class="panel history-period"><summary>${escapeHtml(p.activityName)} · ${dateLabel(p.start)} a ${dateLabel(p.end)} · ${money.format(p.price)}</summary><p>Abonado: ${money.format(p.payments.reduce((n, payment) => n + payment.amount, 0))} · Pendiente: ${money.format(Math.max(0, p.price - p.payments.reduce((n, payment) => n + payment.amount, 0)))}</p>${p.price > p.payments.reduce((n, payment) => n + payment.amount, 0) ? `<a class="button secondary" href="#abonar/${escapeHtml(c.id)}/${previousPeriods(c).length - 1 - index}">Registrar abono anterior</a>` : ""}<ol class="payments">${p.payments.map((payment) => `<li>${dateLabel(payment.date)} · ${escapeHtml(payment.method)} · ${money.format(payment.amount)}</li>`).join("")}</ol></details>`).join("")}</section>` : ""}<section class="profile-management"><h2>Historial y perfil</h2><p>Las cuotas anteriores, los pagos y los saldos permanecen asociados a esta persona.</p><div class="form-actions"><a class="button secondary" href="#historial/${escapeHtml(c.id)}">Ver historial por día</a>${c.archivedAt || c.deletedAt ? "" : `<button class="button secondary" id="archive-customer" type="button">Dar de baja</button>`}${c.deletedAt ? "" : `<a class="button ghost" href="#borrar/${escapeHtml(c.id)}">Eliminar perfil…</a>`}</div></section>`,
    "clientes",
  );
  const archiveButton = document.querySelector("#archive-customer");
  if (archiveButton) archiveButton.onclick = () => {
    if (!window.confirm(`¿Dar de baja a ${c.name}? Sus cuotas y pagos se conservarán.`)) return;
    c.archivedAt = today();
    logLifecycle(c, "Baja registrada", "El perfil y sus pagos se conservaron");
    save();
    detail(id);
    toast("Cliente dado de baja. Su historial sigue disponible.");
  };
}
function returnCustomer(id) {
  const c = state.customers.find((x) => x.id === id);
  if (!c) return void (location.hash = "#clientes");
  if ((c.archivedAt || c.deletedAt) && c.end > today()) {
    app.innerHTML = layout(`<button class="nav-back" onclick="location.hash='#cliente/${escapeHtml(id)}'">← Perfil</button><section class="hero"><span class="eyebrow">REGRESO</span><h1>Reactivar a ${escapeHtml(c.name)}.</h1><p>La cuota actual sigue vigente hasta ${dateLabel(c.end)}. Podés volver a mostrar al cliente como activo sin cobrar una cuota nueva.</p></section><div class="panel"><button class="button" id="resume-active" type="button">Reactivar sin nueva cuota</button></div>`, "clientes");
    document.querySelector("#resume-active").onclick = () => {
      c.archivedAt = null;
      c.deletedAt = null;
      logLifecycle(c, "Cliente reactivado", "Continúa con la cuota que seguía vigente");
      save();
      location.hash = `#cliente/${id}`;
      toast("Cliente reactivado.");
    };
    return;
  }
  const options = state.activities.map((a) => `<option value="${escapeHtml(a.id)}" ${a.id === c.activityId ? "selected" : ""}>${escapeHtml(a.name)} · ${money.format(a.price)} / ${a.months} ${a.months === 1 ? "mes" : "meses"}</option>`).join("");
  app.innerHTML = layout(`<button class="nav-back" onclick="location.hash='#cliente/${escapeHtml(id)}'">← Perfil</button><section class="hero"><span class="eyebrow">${c.archivedAt || c.deletedAt ? "REGRESO AL GIMNASIO" : "RENOVACIÓN"}</span><h1>Nueva cuota para ${escapeHtml(c.name)}.</h1><p>Empieza hoy, ${dateLabel(today())}, con el primer abono. Se aplica el precio vigente de la actividad elegida, aunque las cuotas anteriores hayan tenido otro monto.</p></section><form class="panel" id="return-form"><div class="form-grid"><div class="field wide"><label for="return-activity">Actividad</label><select id="return-activity" required>${options}</select></div><div class="field"><label for="return-amount">Primer abono (ARS)</label><input id="return-amount" type="number" min="1" step="1" inputmode="numeric" required></div><div class="field"><label for="return-method">Medio de pago</label><select id="return-method"><option>Transferencia</option><option>Efectivo</option><option>Mercado Pago</option></select></div></div><p class="notice">Las cuotas y deudas anteriores se conservan separadas. No se cobran automáticamente los meses que estuvo fuera.</p><div class="form-actions"><button class="button" type="submit">Confirmar nueva cuota</button><a class="button ghost" href="#cliente/${escapeHtml(id)}">Cancelar</a></div></form>`, "clientes");
  const amountInput = document.querySelector("#return-amount");
  const select = document.querySelector("#return-activity");
  const updateMaximum = () => {
    const activity = state.activities.find((a) => a.id === select.value);
    amountInput.max = String(activity?.price ?? 0);
    amountInput.placeholder = `Hasta ${money.format(activity?.price ?? 0)}`;
  };
  select.onchange = updateMaximum;
  updateMaximum();
  document.querySelector("#return-form").onsubmit = (e) => {
    e.preventDefault();
    const activity = state.activities.find((a) => a.id === select.value);
    const amount = Number(amountInput.value);
    if (!activity || !Number.isInteger(amount) || amount < 1 || amount > activity.price)
      return toast("Revisá el importe y la actividad.");
    const wasInactive = Boolean(c.archivedAt || c.deletedAt);
    c.history = [...previousPeriods(c), periodSnapshot(c)];
    c.activityId = activity.id;
    c.activityName = activity.name;
    c.price = activity.price;
    c.start = today();
    c.end = addMonths(c.start, activity.months);
    c.payments = [{ amount, method: document.querySelector("#return-method").value, date: c.start }];
    c.archivedAt = null;
    c.deletedAt = null;
    if (wasInactive) logLifecycle(c, "Cliente reactivado", "Comienza una cuota nueva desde el regreso");
    save();
    location.hash = `#cliente/${id}`;
    toast("Nueva cuota registrada. Historial conservado.");
  };
}
function deleteProfile(id) {
  const c = state.customers.find((x) => x.id === id);
  if (!c) return void (location.hash = "#clientes");
  app.innerHTML = layout(`<button class="nav-back" onclick="location.hash='#cliente/${escapeHtml(id)}'">← Perfil</button><section class="hero"><span class="eyebrow">ELIMINAR PERFIL</span><h1>Eliminar perfil.</h1><p>${escapeHtml(c.name)} dejará de aparecer entre los clientes activos. Sus cuotas y pagos quedarán disponibles en Eliminados y podrás recuperarlo si vuelve.</p></section><form class="panel" id="delete-form"><div class="field"><label for="confirm-name">Escribí el nombre completo para confirmar</label><input id="confirm-name" autocomplete="off" required placeholder="${escapeHtml(c.name)}"></div><div class="form-actions"><button class="button danger-button" type="submit">Eliminar perfil</button><a class="button secondary" href="#cliente/${escapeHtml(id)}">Conservar perfil</a></div></form>`, "clientes");
  document.querySelector("#delete-form").onsubmit = (e) => {
    e.preventDefault();
    if (document.querySelector("#confirm-name").value.trim() !== c.name) return toast("El nombre no coincide.");
    c.deletedAt = today();
    c.archivedAt = null;
    logLifecycle(c, "Perfil eliminado", "Se conserva para recuperarlo si vuelve");
    save();
    location.hash = "#clientes";
    toast("Perfil eliminado de la lista. Podés recuperarlo desde Clientes.");
  };
}
function historyPage(id) {
  const c = state.customers.find((x) => x.id === id);
  if (!c) return void (location.hash = "#clientes");
  const periods = [...previousPeriods(c), periodSnapshot(c)];
  const events = [{ date: c.createdAt || periods[0].start, title: "Perfil creado", detail: "Alta del cliente en Shelby Gym" }];
  for (const period of periods) {
    events.push({ date: period.start, title: "Cuota iniciada", detail: `${period.activityName} · ${money.format(period.price)} · vence ${dateLabel(period.end)}` });
    for (const payment of period.payments)
      events.push({ date: payment.date, title: "Abono recibido", detail: `${payment.method} · ${money.format(payment.amount)} · ${period.activityName}` });
    if (period.end <= today()) {
      const paidByEnd = period.payments.filter((p) => p.date <= period.end).reduce((sum, p) => sum + p.amount, 0);
      const due = Math.max(0, period.price - paidByEnd);
      events.push({ date: period.end, title: due ? "Cuota vencida con saldo" : "Cuota finalizada", detail: due ? `${money.format(due)} pendientes al vencimiento · ${period.activityName}` : `${period.activityName} · sin saldo al vencimiento` });
    }
  }
  events.push(...(c.lifecycleEvents || []));
  events.sort((a, b) => b.date.localeCompare(a.date));
  let lastDate = "";
  const rows = events.map((event) => {
    const heading = event.date !== lastDate ? `<h2>${dateLabel(event.date)}</h2>` : "";
    lastDate = event.date;
    return `${heading}<div class="timeline-event"><strong>${escapeHtml(event.title)}</strong><span>${escapeHtml(event.detail)}</span></div>`;
  }).join("");
  app.innerHTML = layout(`<button class="nav-back" onclick="location.hash='#cliente/${escapeHtml(id)}'">← ${escapeHtml(c.name)}</button><section class="hero"><span class="eyebrow">MOVIMIENTOS POR DÍA</span><h1>Historial.</h1><p>Alta, cuotas, abonos y saldos al vencimiento. Las cuotas mantienen el precio original aunque hoy la actividad cueste más.</p></section><div class="timeline">${rows}</div>`, "clientes");
}
function validLedgerDay(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value || "") &&
    !Number.isNaN(utc(value).getTime()) &&
    utc(value).toISOString().slice(0, 10) === value;
}
function allPayments() {
  return state.customers.flatMap((customer) =>
    [...previousPeriods(customer), periodSnapshot(customer)].flatMap((period) =>
      period.payments.map((payment) => ({
        ...payment,
        customerId: customer.id,
        customerName: customer.name,
        activityName: period.activityName,
        periodStart: period.start,
        periodEnd: period.end,
      })),
    ),
  );
}
function gymHistory(requestedDay) {
  const payments = allPayments();
  const latestDay = payments.map((p) => p.date).sort().at(-1) || today();
  const day = validLedgerDay(requestedDay) ? requestedDay : latestDay;
  const dailyPayments = payments.filter((p) => p.date === day);
  const received = dailyPayments.reduce((sum, p) => sum + p.amount, 0);
  const methods = ["Transferencia", "Mercado Pago", "Efectivo"];
  const activity = [];
  for (const customer of state.customers) {
    const periods = [...previousPeriods(customer), periodSnapshot(customer)];
    if ((customer.createdAt || periods[0].start) === day)
      activity.push({ customer, title: "Perfil creado", detail: "Alta del cliente" });
    for (const period of periods) {
      if (period.start !== day) continue;
      const pending = Math.max(0, period.price - period.payments.reduce((sum, p) => sum + p.amount, 0));
      activity.push({
        customer,
        title: "Cuota iniciada",
        detail: `${period.activityName} · cuota ${money.format(period.price)} · saldo actual ${money.format(pending)}`,
      });
    }
    for (const event of customer.lifecycleEvents || [])
      if (event.date === day)
        activity.push({ customer, title: event.title, detail: event.detail });
  }
  app.innerHTML = layout(`<section class="hero"><span class="eyebrow">CAJA Y MOVIMIENTOS</span><h1>Historial general.</h1><p>Todo el gimnasio, día por día. Los ingresos incluyen sólo abonos recibidos.</p></section>
    <div class="ledger-date"><div><span class="eyebrow">FECHA SELECCIONADA</span><h2>${dateLabel(day)}</h2></div><div class="ledger-date-actions"><a href="#movimientos/${shiftDays(day, -1)}" aria-label="Día anterior">←</a><form id="ledger-date-form"><label class="sr-only" for="ledger-date-input">Elegir día</label><input id="ledger-date-input" type="date" value="${day}" required><button type="submit" aria-label="Mostrar día">▦</button></form><a href="#movimientos/${shiftDays(day, 1)}" aria-label="Día siguiente">→</a>${day !== today() ? '<a class="ledger-today" href="#movimientos/' + today() + '">Hoy</a>' : ""}</div></div>
    <section class="ledger-summary" aria-label="Ingresos del día"><div class="ledger-received"><span>INGRESÓ EN CAJA</span><strong>${money.format(received)}</strong><small>${dailyPayments.length} ${dailyPayments.length === 1 ? "abono registrado" : "abonos registrados"}</small></div><dl class="ledger-methods">${methods.map((method) => `<div><dt>${method}</dt><dd>${money.format(dailyPayments.filter((p) => p.method === method).reduce((sum, p) => sum + p.amount, 0))}</dd></div>`).join("")}</dl></section>
    <section class="ledger-section"><div class="ledger-section-heading"><div><span class="eyebrow">DINERO RECIBIDO</span><h2>Abonos</h2></div><span>${dailyPayments.length}</span></div>${dailyPayments.length ? `<div class="ledger-entries">${dailyPayments.map((payment) => `<button class="ledger-entry" type="button" data-customer="${escapeHtml(payment.customerId)}"><span><strong>${escapeHtml(payment.customerName)}</strong><small>${escapeHtml(payment.activityName)} · ${escapeHtml(payment.method)} · cuota ${dateLabel(payment.periodStart)}–${dateLabel(payment.periodEnd)}</small></span><b>+ ${money.format(payment.amount)}</b></button>`).join("")}</div>` : '<div class="empty">No hay abonos registrados este día.</div>'}</section>
    <section class="ledger-section"><div class="ledger-section-heading"><div><span class="eyebrow">ACTIVIDAD, NO INGRESOS</span><h2>Altas y cuotas</h2></div><span>${activity.length}</span></div><p class="ledger-note">El precio de una cuota no se suma a caja. El saldo indicado es el actual.</p>${activity.length ? `<div class="ledger-entries">${activity.map((event) => `<button class="ledger-entry" type="button" data-customer="${escapeHtml(event.customer.id)}"><span><strong>${escapeHtml(event.customer.name)}</strong><small>${escapeHtml(event.title)} · ${escapeHtml(event.detail)}</small></span><span aria-hidden="true">›</span></button>`).join("")}</div>` : '<div class="empty">No hay altas ni cuotas registradas este día.</div>'}</section>`, "movimientos");
  document.querySelector("#ledger-date-form").onsubmit = (event) => {
    event.preventDefault();
    const selected = document.querySelector("#ledger-date-input").value;
    if (validLedgerDay(selected)) location.hash = `#movimientos/${selected}`;
  };
  bindCustomerRows();
}
function pay(id, periodIndex = -1) {
  const c = state.customers.find((x) => x.id === id);
  if (!c) return void (location.hash = "#clientes");
  const period = periodIndex >= 0 ? previousPeriods(c)[periodIndex] : c;
  if (!period || !Number.isInteger(periodIndex)) return void (location.hash = `#cliente/${id}`);
  const periodBalance = () => Math.max(0, period.price - period.payments.reduce((sum, p) => sum + p.amount, 0));
  const remainder = periodBalance();
  if (!remainder) return void (location.hash = `#cliente/${c.id}`);
  app.innerHTML = layout(
    `<button class="nav-back" onclick="location.hash='#cliente/${escapeHtml(c.id)}'">← ${escapeHtml(c.name)}</button><section class="hero"><span class="eyebrow">${periodIndex >= 0 ? "CUOTA ANTERIOR" : "CUOTA PENDIENTE"}</span><h1>Registrar abono.</h1><p>Quedan ${money.format(remainder)} de la cuota ${dateLabel(period.start)} a ${dateLabel(period.end)}. Este pago no cambia el vencimiento.</p></section><form class="panel" id="pay-form"><div class="form-grid"><div class="field"><label for="pay-amount">Importe recibido (ARS)</label><input id="pay-amount" type="number" min="1" max="${remainder}" step="1" inputmode="numeric" required></div><div class="field"><label for="pay-method">Medio de pago</label><select id="pay-method"><option>Transferencia</option><option>Efectivo</option><option>Mercado Pago</option></select></div></div><div class="form-actions"><button class="button" type="submit">Guardar abono</button><a class="button ghost" href="#cliente/${escapeHtml(c.id)}">Cancelar</a></div></form>`,
    "clientes",
  );
  document.querySelector("#pay-form").onsubmit = (e) => {
    e.preventDefault();
    const amount = Number(document.querySelector("#pay-amount").value);
    if (!Number.isInteger(amount) || amount <= 0 || amount > periodBalance())
      return toast("El importe debe estar dentro del saldo.");
    period.payments.push({
      amount,
      method: document.querySelector("#pay-method").value,
      date: today(),
    });
    save();
    location.hash = `#cliente/${c.id}`;
    toast("Abono registrado.");
  };
}
function edit(id) {
  const c = state.customers.find((x) => x.id === id);
  if (!c) return void (location.hash = "#clientes");
  app.innerHTML = layout(
    `<button class="nav-back" onclick="location.hash='#cliente/${escapeHtml(c.id)}'">← ${escapeHtml(c.name)}</button><section class="hero"><span class="eyebrow">PERFIL</span><h1>Editar datos.</h1></section><form class="panel" id="edit-form"><div class="form-grid"><div class="field wide"><label for="edit-name">Nombre y apellido</label><input id="edit-name" required minlength="2" maxlength="120" value="${escapeHtml(c.name)}"></div><div class="field"><label for="edit-phone">Celular</label><input id="edit-phone" type="tel" maxlength="40" value="${escapeHtml(c.phone)}"></div><div class="field"><label for="edit-birth">Fecha de cumpleaños</label><input id="edit-birth" type="date" max="${today()}" value="${escapeHtml(c.birthDate)}"></div></div><div class="form-actions"><button class="button" type="submit">Guardar perfil</button><a class="button ghost" href="#cliente/${escapeHtml(c.id)}">Cancelar</a></div></form>`,
    "clientes",
  );
  document.querySelector("#edit-form").onsubmit = (e) => {
    e.preventDefault();
    c.name = document.querySelector("#edit-name").value.trim();
    c.phone = document.querySelector("#edit-phone").value.trim();
    c.birthDate = document.querySelector("#edit-birth").value;
    if (c.name.length < 2 || (c.birthDate && c.birthDate > today()))
      return toast("Revisá el perfil.");
    save();
    location.hash = `#cliente/${c.id}`;
    toast("Perfil actualizado.");
  };
}
function render() {
  if (sessionStorage.getItem(UNLOCK) !== "yes") return lock();
  const [path, id, period] = (location.hash.slice(1) || "inicio").split("/");
  if (path === "cumpleanos") {
    filter = "cumpleanos";
    birthdayOffset = 0;
    location.replace("#clientes");
    return;
  }
  (
    ({
      inicio: home,
      clientes: clients,
      actividades: activities,
      "actividad-nueva": activityNew,
      nuevo: newCustomer,
      cliente: () => detail(id),
      abonar: () => pay(id, period === undefined ? -1 : Number(period)),
      regresar: () => returnCustomer(id),
      borrar: () => deleteProfile(id),
      historial: () => historyPage(id),
      movimientos: () => gymHistory(id),
      editar: () => edit(id),
    })[path] || home
  )();
  window.scrollTo({ top: 0, behavior: "instant" });
}
window.addEventListener("hashchange", render);
let pressed;
document.addEventListener("pointerdown", (event) => {
  if (!event.isPrimary || event.button !== 0 || reducedMotion.matches) return;
  const target = event.target.closest(".button, .chip, .bottomnav a");
  if (!target || target.disabled) return;
  pressed?.classList.remove("is-pressed");
  pressed = target;
  pressed.classList.add("is-pressed");
});
function releasePressed() {
  pressed?.classList.remove("is-pressed");
  pressed = undefined;
}
document.addEventListener("pointerup", releasePressed);
document.addEventListener("pointercancel", releasePressed);
reducedMotion.addEventListener("change", () => {
  releasePressed();
  if (reducedMotion.matches) listAnimation?.cancel();
});
render();
