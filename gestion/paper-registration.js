/* Manual, browser-only onboarding from paper. Unknown receipts are opening credit. */
function paperRegistration() {
  const options = state.activities
    .map(
      (a) =>
        `<option value="${escapeHtml(a.id)}">${escapeHtml(a.name)} · ${activityDuration(a)}</option>`,
    )
    .join("");
  app.innerHTML = layout(
    `<a class="nav-back" href="#nuevo">← Alta de hoy</a><section class="hero"><span class="eyebrow">CARGA DESDE PAPEL</span><h1>Registrar situación anterior.</h1><p>Fechas e importe originales, aunque la cuota ya haya vencido. No se recibe dinero nuevo al pasar este registro.</p></section><form class="panel" id="paper-form"><div class="form-grid"><div class="field wide"><label for="paper-name">Nombre y apellido</label><input id="paper-name" required minlength="2" maxlength="120" autocomplete="name"></div><div class="field"><label for="paper-phone">Celular (opcional)</label><input id="paper-phone" type="tel" maxlength="40" autocomplete="tel"></div>${instagramFields("paper")}${birthdayFields("paper")}<div class="field wide"><label for="paper-activity">Actividad o plan</label><select id="paper-activity" required>${options}</select></div>${opsField("paper-start", "Inicio de la cuota o pack", "", "date", `required min="1900-01-01" max="${today()}"`)}<div id="paper-end-field">${opsField("paper-end", "Vencimiento anotado", "", "date", 'max="2200-12-31"')}</div><div id="paper-used-field" hidden>${opsField("paper-used", "Clases ya usadas", 0, "number", 'min="0" max="365" step="1"')}</div>${opsField("paper-total", "Importe pactado en el papel (ARS)", "", "number", 'required min="0.01" max="1000000" step="0.01"')}${opsField("paper-paid", "Total que ya había abonado (ARS)", 0, "number", 'required min="0" max="1000000" step="0.01"')}</div><p class="notice">El importe original puede ser distinto al precio actual. Lo abonado sin fecha y medio conocidos queda como saldo previo a favor, sin sumar un ingreso ficticio a la caja.</p><div class="ops-totals" aria-live="polite"><div><span>Saldo pendiente</span><strong id="paper-balance">${money.format(0)}</strong></div><div><span>Abonado previo sin detalle</span><strong id="paper-opening">${money.format(0)}</strong></div></div><section class="ops-section"><h2>Pagos anteriores (opcional)</h2><p>Detallá solo las fechas y medios que conozcas. Podés combinar transferencia, efectivo y Mercado Pago.</p><div id="paper-payments"></div><button type="button" class="button secondary" id="paper-add-payment">Añadir pago anterior</button></section><div class="form-actions"><button type="submit" class="button">Guardar registro del papel</button></div><p class="comm-footnote">Un pago que recibas hoy se registra después desde el perfil. Esta muestra guarda únicamente en este navegador.</p></form>`,
    "clientes",
  );
  const $ = (id) => document.getElementById(`paper-${id}`),
    rows = [];
  function readPayments() {
    return rows.map((id) => ({
      date: $(`date-${id}`).value,
      entries: ["Transferencia", "Efectivo", "Mercado Pago"]
        .map((method, i) => ({
          method,
          amount: Number($(`amount-${id}-${i}`).value || 0),
        }))
        .filter((e) => e.amount !== 0),
    }));
  }
  function summary() {
    const total = Number($("total").value || 0),
      paid = Number($("paid").value || 0),
      detailed = readPayments().reduce(
        (n, p) => n + p.entries.reduce((sum, e) => sum + e.amount, 0),
        0,
      );
    $("balance").textContent = money.format(roundMoney(total - paid));
    $("opening").textContent = money.format(
      roundMoney(Math.max(0, paid - detailed)),
    );
  }
  function timing() {
    const a = state.activities.find((a) => a.id === $("activity").value),
      sessions = a?.unit === "sessions";
    $("end-field").hidden = sessions;
    $("used-field").hidden = !sessions;
    $("end").required = !sessions;
    $("used").max = String(a?.count || a?.months || 1);
    if (sessions) $("end").value = "";
    else if (a && validLedgerDay($("start").value))
      $("end").value = addMonths($("start").value, a.count || a.months || 1);
  }
  $("activity").onchange = () => {
    $("used").value = "0";
    timing();
  };
  $("start").onchange = timing;
  $("total").oninput = $("paid").oninput = summary;
  $("add-payment").onclick = () => {
    if (rows.length >= 20) return;
    const id = crypto.randomUUID();
    rows.push(id);
    $("payments").insertAdjacentHTML(
      "beforeend",
      `<fieldset class="paper-payment" id="paper-row-${id}"><legend>Pago anterior</legend>${opsField(`paper-date-${id}`, "Fecha del pago anterior", "", "date", `required min="1900-01-01" max="${today()}"`)}<div class="form-grid">${["Transferencia", "Efectivo", "Mercado Pago"].map((method, i) => opsField(`paper-amount-${id}-${i}`, method, "", "number", 'min="0" max="1000000" step="0.01"')).join("")}</div><button type="button" class="button ghost" id="paper-remove-${id}">Quitar este pago</button></fieldset>`,
    );
    $(`row-${id}`)
      .querySelectorAll("input")
      .forEach((field) => field.addEventListener("input", summary));
    $(`remove-${id}`).onclick = () => {
      rows.splice(rows.indexOf(id), 1);
      $(`row-${id}`).remove();
      $("add-payment").disabled = false;
      summary();
    };
    $("add-payment").disabled = rows.length >= 20;
  };
  $("form").onsubmit = (event) => {
    event.preventDefault();
    const a = state.activities.find((a) => a.id === $("activity").value),
      start = $("start").value,
      end = a?.unit === "sessions" ? null : $("end").value,
      total = Number($("total").value),
      previousPaid = Number($("paid").value),
      used = a?.unit === "sessions" ? Number($("used").value) : 0,
      payments = readPayments();
    const detailed = roundMoney(
      payments.reduce(
        (n, p) => n + p.entries.reduce((sum, e) => sum + e.amount, 0),
        0,
      ),
    );
    if (
      !a ||
      !validLedgerDay(start) ||
      start < "1900-01-01" ||
      start > today() ||
      (end !== null &&
        (!validLedgerDay(end) || end <= start || end > "2200-12-31")) ||
      !validMoney(total) ||
      total <= 0 ||
      !validMoney(previousPaid) ||
      previousPaid > total ||
      !Number.isInteger(used) ||
      used < 0 ||
      used > (a.count || a.months || 1)
    )
      return toast("Revisá las fechas, importes y clases ya usadas.");
    if (
      payments.some(
        (p) =>
          !validLedgerDay(p.date) ||
          p.date < "1900-01-01" ||
          p.date > today() ||
          !p.entries.length ||
          p.entries.some((e) => !validMoney(e.amount) || e.amount <= 0),
      ) ||
      detailed > previousPaid
    )
      return toast(
        "Revisá los pagos anteriores: el detalle no puede superar lo ya abonado.",
      );
    if (
      state.monthlyClosings[start.slice(0, 7)] ||
      payments.some((p) => state.monthlyClosings[p.date.slice(0, 7)])
    )
      return toast(
        "El registro pertenece a un mes cerrado. No se modificaron sus cifras.",
      );
    const instagram = normalizeInstagram($("instagram").value),
      birthMonth = Number($("birth-month").value);
    if (!validInstagram(instagram) || !validBirthday(birthMonth))
      return toast("Revisá Instagram y el mes de cumpleaños.");
    const id = crypto.randomUUID(),
      now = new Date().toISOString();
    state.customers.unshift({
      id,
      name: $("name").value.trim(),
      phone: $("phone").value.trim(),
      instagram,
      birthMonth: birthMonth || null,
      marketingOptIn: $("marketing").checked,
      instagramMarketingOptIn: $("instagram-marketing").checked,
      activityId: a.id,
      activityName: a.name,
      price: total,
      unit: a.unit || "months",
      count: a.count || a.months || 1,
      start,
      end,
      origin: "paper",
      openingPaid: roundMoney(previousPaid - detailed),
      openingSessionsUsed: used,
      payments: payments.flatMap((p) =>
        p.entries.map((e) => ({ ...e, date: p.date, historical: true })),
      ),
      history: [],
      sessionEvents: [],
      createdAt: today(),
      registeredAt: now,
      startedAt: now,
      archivedAt: null,
      deletedAt: null,
    });
    save();
    location.hash = `#cliente/${id}`;
    toast(
      "Registro del papel guardado. El saldo previo sin detalle no se sumó a la caja.",
    );
  };
  timing();
  summary();
}
