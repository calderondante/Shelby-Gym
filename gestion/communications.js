/* Communication planning for the browser-only demo. No provider, cron or sending. */
const commVariables = {
  general: [
    "nombre",
    "gimnasio",
    "actividad",
    "vencimiento",
    "saldo",
    "oferta",
  ],
  recovery: [
    "nombre",
    "gimnasio",
    "actividad",
    "vencimiento",
    "saldo",
    "oferta",
  ],
  expense: [
    "nombre",
    "dueno",
    "gimnasio",
    "vencimiento",
    "saldo",
    "gasto",
    "importe",
    "dias",
  ],
};
function upgradeCommunicationsState() {
  for (const c of state.customers) c.instagramMarketingOptIn ??= false;
  state.communications ||= {
    businessName: "Shelby Gym",
    whatsappPhone: "",
    instagramHandle: "",
    owners: [],
    outbox: [],
    templates: [
      {
        id: "recovery-wa",
        title: "Volvé a entrenar",
        channel: "whatsapp",
        purpose: "recovery",
        body: "Hola {nombre}, en {gimnasio} te estamos esperando. {oferta} ¿Te contamos cómo volver a entrenar?",
      },
      {
        id: "general-wa",
        title: "Novedades del gimnasio",
        channel: "whatsapp",
        purpose: "general",
        body: "Hola {nombre}, tenemos novedades en {gimnasio}. {oferta}",
      },
      {
        id: "general-ig",
        title: "Novedades por Instagram",
        channel: "instagram",
        purpose: "general",
        body: "Hola {nombre}, tenemos novedades en {gimnasio}. {oferta}",
      },
      {
        id: "recovery-ig",
        title: "Volvé · Instagram",
        channel: "instagram",
        purpose: "recovery",
        body: "Hola {nombre}, te esperamos de nuevo en {gimnasio}. {oferta}",
      },
      {
        id: "expense-wa",
        title: "Vencimiento de boleta",
        channel: "whatsapp",
        purpose: "expense",
        body: "Hola {dueno}, recordatorio de {gimnasio}: {gasto} vence el {vencimiento}. Importe: {importe}. Pendiente: {saldo}.",
      },
    ],
    rules: {
      recovery: {
        enabled: false,
        channel: "whatsapp",
        templateId: "recovery-wa",
        audience: "selected",
        customers: [],
        sendHour: 9,
        offer: "",
      },
      expense: {
        enabled: false,
        channel: "whatsapp",
        templateId: "expense-wa",
        sendHour: 9,
        notifyBefore: true,
        daysBefore: 3,
        notifyOnDue: true,
        notifyOverdue: true,
        overdueEvery: 1,
        recurringOnly: true,
      },
    },
  };
}
function commPhone(raw) {
  const value = raw.trim().replace(/[\s().-]/g, "");
  return /^\+[1-9][0-9]{7,14}$/.test(value) ? value : null;
}
function commRender(body, values) {
  return body.replace(/\{([a-z_]+)\}/g, (marker, key) => values[key] ?? marker);
}
function commTemplateError(body, purpose) {
  if (body.trim().length < 5 || body.length > 1500)
    return "El mensaje debe tener entre 5 y 1500 caracteres.";
  return [...body.matchAll(/\{([a-z_]+)\}/g)].some(
    (m) => !commVariables[purpose].includes(m[1]),
  )
    ? "El mensaje tiene una variable que no corresponde a su uso."
    : "";
}
function commReason(c, channel, segment = "selected", day = today()) {
  if (c.deletedAt) return "Perfil eliminado";
  if (
    segment === "recovery" &&
    (!membershipEnd(c, day) || addMonths(membershipEnd(c, day), 2) > day)
  )
    return "Todavía no pasaron 2 meses desde el vencimiento";
  if (channel === "whatsapp") {
    if (!commPhone(c.phone || ""))
      return "Revisar celular: falta formato internacional (+54…)";
    if (!c.marketingOptIn)
      return "Falta autorización para ofertas por WhatsApp";
  } else {
    if (!c.instagram || !validInstagram(c.instagram)) return "Falta Instagram";
    if (!c.instagramMarketingOptIn)
      return "Falta autorización para ofertas por Instagram";
  }
  return "";
}
function commContext(c, offer = "") {
  return {
    nombre: c?.name || "Nombre del cliente",
    gimnasio: state.communications.businessName,
    actividad: c?.activityName || "Actividad",
    vencimiento:
      c && membershipEnd(c) ? dateLabel(membershipEnd(c)) : "Sin cuota mensual",
    saldo: money.format(c ? balance(c) : 0),
    oferta: offer,
  };
}
const commSections = [
  ["campanas", "Campañas"],
  ["plantillas", "Plantillas"],
  ["automatizaciones", "Automatizaciones"],
  ["duenos", "Dueños"],
  ["canales", "Canales"],
  ["historial", "Preparados"],
];
function commSelect(id, label, options, value) {
  return `<div class="field"><label for="${id}">${label}</label><select id="${id}">${options.map(([v, l]) => `<option value="${escapeHtml(v)}" ${v === value ? "selected" : ""}>${escapeHtml(l)}</option>`).join("")}</select></div>`;
}
function commCheck(id, label, checked) {
  return `<label class="ops-check"><input id="${id}" type="checkbox" ${checked ? "checked" : ""}>${label}</label>`;
}
function commText(id, label, body) {
  return `<div class="field wide"><label for="${id}">${label}</label><textarea id="${id}" rows="5" required minlength="5" maxlength="1500">${escapeHtml(body)}</textarea></div>`;
}
function commSubmit(label) {
  return `<div class="form-actions"><button type="submit" class="button">${label}</button></div><p class="comm-footnote">Guardar no envía mensajes. Se conserva únicamente en este navegador.</p>`;
}
function commPage(section = "campanas") {
  if (!commSections.some(([id]) => id === section)) section = "campanas";
  const content = {
    campanas: commCampaignMarkup,
    plantillas: commTemplatesMarkup,
    automatizaciones: commRulesMarkup,
    duenos: commOwnersMarkup,
    canales: commChannelsMarkup,
    historial: commOutboxMarkup,
  }[section]();
  app.innerHTML = layout(
    `<section class="hero"><span class="eyebrow">RELACIÓN CON EL GIMNASIO</span><h1>Comunicaciones.</h1><p>Mensajes personales, ofertas para volver y boletas en orden.</p></section><p class="notice">WhatsApp e Instagram pendientes de conectar. Todo se guarda como preparado, sin enviar. Esta muestra no ejecuta reglas en segundo plano.</p><nav class="comm-tabs" aria-label="Secciones de comunicaciones">${commSections.map(([id, label]) => `<a href="#comunicaciones/${id}" ${id === section ? 'aria-current="page"' : ""}>${label}</a>`).join("")}</nav>${content}`,
    "comunicaciones",
  );
  ({
    campanas: commBindCampaign,
    plantillas: commBindTemplates,
    automatizaciones: commBindRules,
    duenos: commBindOwners,
    canales: commBindChannels,
    historial: commBindOutbox,
  })[section]();
}
function commCampaignMarkup() {
  const t =
    state.communications.templates.find((t) => t.id === "recovery-wa") ||
    state.communications.templates[0];
  return `<form class="panel" id="comm-campaign"><div class="form-grid">${opsField("comm-title", "Nombre de campaña", "Volvé a Shelby", "text", 'required minlength="2" maxlength="100"')}${commSelect(
    "comm-channel",
    "Canal",
    [
      ["whatsapp", "WhatsApp"],
      ["instagram", "Instagram"],
    ],
    "whatsapp",
  )}${commSelect(
    "comm-segment",
    "¿A quién querés escribirle?",
    [
      ["recovery", "Sin cuota desde hace 2 meses o más"],
      ["selected", "Clientes elegidos por mí"],
    ],
    "recovery",
  )}${commSelect("comm-template", "Plantilla", [], "")}${opsField("comm-offer", "Oferta para esta campaña (opcional)", "", "text", 'maxlength="500"')}${opsField("comm-schedule", "Fecha prevista (opcional, hora Argentina)", "", "datetime-local", `min="${today()}T00:00"`)}${commText("comm-body", "Mensaje personalizado", t.body)}</div><p class="comm-footnote">Variables: ${commVariables.general.map((v) => `{${v}}`).join(" · ")}. Los 2 meses se cuentan desde el vencimiento; la deuda anterior se conserva.</p><fieldset class="ops-recipients"><legend>Destinatarios · <span id="comm-count">0</span> seleccionados</legend>${opsField("comm-search", "Buscar por nombre, celular o Instagram", "", "search")}<div class="comm-tools"><button type="button" class="button ghost" id="comm-all">Seleccionar habilitados</button><button type="button" class="button ghost" id="comm-clear">Limpiar selección</button></div><div id="comm-recipients" class="comm-recipient-scroll"></div></fieldset><div class="field" id="comm-preview-selector" hidden><label for="comm-preview-person">Revisar mensaje de</label><select id="comm-preview-person"></select></div><aside class="comm-preview" aria-label="Vista previa del mensaje"><span class="eyebrow">VISTA PREVIA · SIN ENVIAR</span><strong id="comm-preview-name">Elegí un destinatario</strong><p id="comm-preview-body"></p><small>Un mensaje privado por persona. No se crea un grupo.</small></aside><p class="notice" id="comm-instagram-notice" hidden>El @ permite preparar el mensaje. La integración oficial necesitará una cuenta profesional y una conversación iniciada por el cliente; conocer su @ no habilita un envío automático.</p>${commSubmit("Preparar mensajes privados")}</form><section class="ops-section"><h2>Campañas guardadas</h2>${
    state.campaigns.length
      ? state.campaigns
          .slice(0, 100)
          .map(
            (c) =>
              `<article class="ops-item"><h3>${escapeHtml(c.title)}</h3><p>${c.recipients.length} personas · ${c.status === "draft" ? "Borrador anterior" : "Preparada"} · Sin enviar</p><p class="ops-message">${escapeHtml(c.message)}</p></article>`,
          )
          .join("")
      : '<p class="empty">Tu primera campaña empieza eligiendo a quién querés escribirle.</p>'
  }</section>`;
}
function commBindCampaign() {
  const $ = (id) => document.getElementById(`comm-${id}`),
    selected = new Set();
  const candidates = () =>
    state.customers.filter(
      (c) =>
        !c.deletedAt &&
        `${c.name} ${c.phone} ${c.instagram}`
          .toLocaleLowerCase("es")
          .includes($("search").value.toLocaleLowerCase("es")),
    );
  function preview() {
    const previous = $("preview-person").value;
    const people = state.customers.filter((c) => selected.has(c.id));
    const c = people.find((c) => c.id === previous) || people[0];
    $("preview-person").innerHTML = people
      .map(
        (p) =>
          `<option value="${escapeHtml(p.id)}" ${p.id === c?.id ? "selected" : ""}>${escapeHtml(p.name)}</option>`,
      )
      .join("");
    $("preview-selector").hidden = people.length < 2;
    $("count").textContent = selected.size;
    $("preview-name").textContent = c?.name || "Elegí un destinatario";
    $("preview-body").textContent = commRender(
      $("body").value,
      commContext(c, $("offer").value),
    );
  }
  function draw() {
    for (const id of selected) {
      const c = state.customers.find((c) => c.id === id);
      if (!c || commReason(c, $("channel").value, $("segment").value))
        selected.delete(id);
    }
    $("recipients").innerHTML =
      candidates()
        .map((c) => {
          const reason = commReason(c, $("channel").value, $("segment").value);
          return `<label class="ops-person"><input type="checkbox" name="comm-recipient" value="${escapeHtml(c.id)}" ${reason ? "disabled" : ""} ${selected.has(c.id) ? "checked" : ""}><span><strong>${escapeHtml(c.name)}</strong><small>${escapeHtml($("channel").value === "whatsapp" ? c.phone || "Sin celular" : c.instagram || "Sin Instagram")} · ${membershipEnd(c) ? `Venció ${dateLabel(membershipEnd(c))}` : "Sin cuota mensual"}</small><small>${escapeHtml(reason || `Habilitado para preparar · ${money.format(balance(c))} pendientes`)}</small></span></label>`;
        })
        .join("") ||
      '<p class="empty">Sin clientes que coincidan con la búsqueda.</p>';
    $("recipients")
      .querySelectorAll("input")
      .forEach(
        (input) =>
          (input.onchange = () => {
            if (input.checked && selected.size >= 500) {
              input.checked = false;
              return toast("El máximo es de 500 destinatarios.");
            }
            input.checked
              ? selected.add(input.value)
              : selected.delete(input.value);
            preview();
          }),
      );
    preview();
  }
  function templates() {
    const options = state.communications.templates.filter(
      (t) => t.channel === $("channel").value && t.purpose !== "expense",
    );
    $("template").innerHTML = options
      .map(
        (t) =>
          `<option value="${escapeHtml(t.id)}">${escapeHtml(t.title)}</option>`,
      )
      .join("");
    $("body").value = options[0]?.body || "";
    $("instagram-notice").hidden = $("channel").value !== "instagram";
  }
  $("channel").onchange = () => {
    selected.clear();
    templates();
    draw();
  };
  $("segment").onchange = () => {
    selected.clear();
    draw();
  };
  $("search").oninput = draw;
  $("template").onchange = () => {
    $("body").value =
      state.communications.templates.find((t) => t.id === $("template").value)
        ?.body || "";
    preview();
  };
  $("body").oninput = $("offer").oninput = preview;
  $("preview-person").onchange = preview;
  $("all").onclick = () => {
    candidates()
      .filter((c) => !commReason(c, $("channel").value, $("segment").value))
      .forEach((c) => {
        if (selected.size < 500) selected.add(c.id);
      });
    draw();
  };
  $("clear").onclick = () => {
    selected.clear();
    draw();
  };
  $("campaign").onsubmit = (e) => {
    e.preventDefault();
    const error = commTemplateError(
      $("body").value,
      $("segment").value === "recovery" ? "recovery" : "general",
    );
    if (error || !selected.size)
      return toast(error || "Seleccioná al menos un cliente habilitado.");
    const recipients = [...selected].map((id) =>
      state.customers.find((c) => c.id === id),
    );
    if (
      recipients.some(
        (c) => !c || commReason(c, $("channel").value, $("segment").value),
      )
    )
      return toast("Revisá los contactos y autorizaciones.");
    const scheduledFor = $("schedule").value
        ? `${$("schedule").value}:00-03:00`
        : new Date().toISOString(),
      campaignId = crypto.randomUUID();
    if (
      !Number.isFinite(Date.parse(scheduledFor)) ||
      Date.parse(scheduledFor) > Date.now() + 366 * 86400000
    )
      return toast("La fecha prevista debe estar dentro del próximo año.");
    state.campaigns.unshift({
      id: campaignId,
      title: $("title").value.trim(),
      message: $("body").value,
      channel: $("channel").value,
      recipients: [...selected],
      date: today(),
      status: "prepared",
    });
    for (const c of recipients)
      state.communications.outbox.unshift({
        id: crypto.randomUUID(),
        campaignId,
        customerId: c.id,
        source: "campaign",
        channel: $("channel").value,
        name: c.name,
        destination:
          $("channel").value === "whatsapp" ? commPhone(c.phone) : c.instagram,
        body: commRender($("body").value, commContext(c, $("offer").value)),
        scheduledFor,
        status: "prepared",
      });
    save();
    location.hash = "#comunicaciones/historial";
    toast("Mensajes preparados. No se enviaron.");
  };
  templates();
  draw();
}
function commTemplatesMarkup() {
  return `<section class="ops-section"><h2>Mensajes con la voz de Shelby</h2><p>Editar una plantilla conserva las copias ya preparadas.</p>${[
    ...state.communications.templates,
    {
      id: "",
      title: "Crear una plantilla",
      channel: "whatsapp",
      purpose: "general",
      body: "",
    },
  ]
    .map(
      (t, i) =>
        `<details class="comm-details"><summary>${escapeHtml(t.title)}<small>${t.channel === "whatsapp" ? "WhatsApp" : "Instagram"}</small></summary><form class="panel" data-comm-template="${escapeHtml(t.id)}"><div class="form-grid">${opsField(`ct-${i}-title`, "Nombre", t.id ? t.title : "", "text", 'required minlength="2" maxlength="100"')}${commSelect(
          `ct-${i}-channel`,
          "Canal",
          [
            ["whatsapp", "WhatsApp"],
            ["instagram", "Instagram"],
          ],
          t.channel,
        )}${commSelect(
          `ct-${i}-purpose`,
          "Uso",
          [
            ["general", "Novedades"],
            ["recovery", "Regreso al gimnasio"],
            ["expense", "Boletas a dueños"],
          ],
          t.purpose,
        )}${commText(`ct-${i}-body`, "Mensaje", t.body)}</div><p class="comm-footnote" id="ct-${i}-variables"></p>${commSubmit(t.id ? "Guardar plantilla" : "Crear plantilla")}</form></details>`,
    )
    .join("")}</section>`;
}
function commBindTemplates() {
  document.querySelectorAll("[data-comm-template]").forEach((form, i) => {
    const field = (name) => document.getElementById(`ct-${i}-${name}`);
    const update = () => {
      document.getElementById(`ct-${i}-variables`).textContent =
        `Variables: ${commVariables[field("purpose").value].map((v) => `{${v}}`).join(" · ")}`;
    };
    field("purpose").onchange = update;
    update();
    form.onsubmit = (e) => {
      e.preventDefault();
      const body = field("body").value.trim(),
        channel = field("channel").value,
        purpose = field("purpose").value;
      const error = commTemplateError(body, purpose);
      if (error || (purpose === "expense" && channel !== "whatsapp"))
        return toast(error || "Los avisos a dueños se preparan para WhatsApp.");
      if (
        Object.entries(state.communications.rules).some(
          ([kind, r]) =>
            r.templateId === form.dataset.commTemplate &&
            (r.channel !== channel || kind !== purpose),
        )
      )
        return toast(
          "La plantilla usada por una regla debe conservar su canal y uso.",
        );
      const data = {
        title: field("title").value.trim(),
        channel,
        purpose,
        body,
      };
      const t = state.communications.templates.find(
        (t) => t.id === form.dataset.commTemplate,
      );
      if (t) Object.assign(t, data);
      else
        state.communications.templates.push({
          id: crypto.randomUUID(),
          ...data,
        });
      save();
      commPage("plantillas");
      toast("Plantilla guardada.");
    };
  });
}
function commOwnersMarkup() {
  return `<section class="ops-section"><h2>¿Quién recibe las boletas?</h2><p>Un mensaje privado por dueño activo cuando se conecte WhatsApp.</p>${[...state.communications.owners, { id: "", name: "", phone: "", active: true }].map((o, i) => `<details class="comm-details" ${o.id ? "" : "open"}><summary>${escapeHtml(o.name || "Agregar dueño")}<small>${o.id ? `${o.active ? "Activo" : "Desactivado"} · ${escapeHtml(o.phone)}` : "Contacto para avisos de gastos"}</small></summary><form class="panel" data-comm-owner="${escapeHtml(o.id)}"><div class="form-grid">${opsField(`co-${i}-name`, "Nombre", o.name, "text", 'required minlength="2" maxlength="100"')}${opsField(`co-${i}-phone`, "Celular internacional", o.phone, "tel", 'required placeholder="+54…"')}</div>${commCheck(`co-${i}-active`, "Recibir avisos", o.active)}${commSubmit(o.id ? "Guardar contacto" : "Agregar dueño")}</form></details>`).join("")}</section>`;
}
function commBindOwners() {
  document.querySelectorAll("[data-comm-owner]").forEach(
    (form, i) =>
      (form.onsubmit = (e) => {
        e.preventDefault();
        const phone = commPhone(document.getElementById(`co-${i}-phone`).value);
        if (!phone) return toast("Usá un celular con + y código de país.");
        if (
          state.communications.owners.some(
            (o) => o.phone === phone && o.id !== form.dataset.commOwner,
          )
        )
          return toast("Ese celular ya está registrado.");
        const data = {
          name: document.getElementById(`co-${i}-name`).value.trim(),
          phone,
          active: document.getElementById(`co-${i}-active`).checked,
        };
        const owner = state.communications.owners.find(
          (o) => o.id === form.dataset.commOwner,
        );
        if (owner) Object.assign(owner, data);
        else
          state.communications.owners.push({
            id: crypto.randomUUID(),
            ...data,
          });
        save();
        commPage("duenos");
        toast("Contacto guardado.");
      }),
  );
}
function commChannelsMarkup() {
  const c = state.communications;
  return `<div class="form-grid"><article class="panel"><h2>WhatsApp</h2><strong>Pendiente de vincular</strong><p>Número exclusivo, cuenta de empresa y plantillas aprobadas para iniciar conversaciones.</p></article><article class="panel"><h2>Instagram</h2><strong>Pendiente de vincular</strong><p>Cuenta profesional y conversación iniciada por el cliente. Su @ por sí solo no permite un envío por la API oficial.</p></article></div><form id="comm-config" class="panel"><div class="form-grid">${opsField("cc-name", "Nombre del gimnasio", c.businessName, "text", 'required minlength="2" maxlength="100"')}${opsField("cc-phone", "Número exclusivo de WhatsApp (opcional)", c.whatsappPhone, "tel", 'placeholder="Completar cuando esté disponible"')}${opsField("cc-ig", "Instagram del gimnasio (opcional)", c.instagramHandle, "text", 'placeholder="@shelby.gymm" maxlength="31"')}</div><p>Guardar estos datos no conecta las cuentas. No pegues contraseñas ni tokens aquí.</p>${commSubmit("Guardar datos del gimnasio")}</form>`;
}
function commBindChannels() {
  document.getElementById("comm-config").onsubmit = (e) => {
    e.preventDefault();
    const raw = document.getElementById("cc-phone").value,
      ig = normalizeInstagram(document.getElementById("cc-ig").value);
    if ((raw && !commPhone(raw)) || !validInstagram(ig))
      return toast("Revisá el celular internacional y el @.");
    Object.assign(state.communications, {
      businessName: document.getElementById("cc-name").value.trim(),
      whatsappPhone: raw ? commPhone(raw) : "",
      instagramHandle: ig,
    });
    save();
    toast("Datos guardados. Las cuentas siguen pendientes de conectar.");
  };
}
function commRulesMarkup() {
  const c = state.communications;
  return `<section class="ops-section"><h2>Reglas de preparación</h2><p>Guardá la configuración ahora. Hasta conectar los canales y un servicio programado, revisá los avisos manualmente; no se enviará nada.</p>${Object.entries(
    c.rules,
  )
    .map(
      ([kind, r]) =>
        `<article class="panel"><h3>${kind === "recovery" ? "Regreso después de dos meses" : "Boletas para los dueños"}</h3><form data-comm-rule="${kind}">${commCheck(`cr-${kind}-enabled`, "Habilitar la preparación de esta regla", r.enabled)}<div class="form-grid">${commSelect(
          `cr-${kind}-channel`,
          "Canal",
          kind === "recovery"
            ? [
                ["whatsapp", "WhatsApp"],
                ["instagram", "Instagram"],
              ]
            : [["whatsapp", "WhatsApp"]],
          r.channel,
        )}${commSelect(
          `cr-${kind}-template`,
          "Plantilla",
          c.templates
            .filter((t) => t.purpose === kind && t.channel === r.channel)
            .map((t) => [t.id, t.title]),
          r.templateId,
        )}${opsField(`cr-${kind}-hour`, "Hora prevista en Argentina", r.sendHour, "number", 'required min="0" max="23" step="1"')}</div>${
          kind === "recovery"
            ? `${opsField("cr-offer", "Oferta", r.offer, "text", 'maxlength="500"')}${commSelect(
                "cr-audience",
                "Destinatarios",
                [
                  ["selected", "Solo clientes seleccionados"],
                  ["all_eligible", "Todos los que cumplan las condiciones"],
                ],
                r.audience,
              )}<fieldset id="cr-customers" class="ops-recipients"><legend>Clientes para esta regla</legend><p>Se esperarán los dos meses desde el vencimiento antes de preparar un aviso.</p><div class="comm-recipient-scroll">${state.customers
                .filter((c) => !c.deletedAt)
                .map(
                  (person) =>
                    `<label class="ops-person"><input type="checkbox" name="rule-customer" value="${escapeHtml(person.id)}" ${r.customers.includes(person.id) ? "checked" : ""}><span>${escapeHtml(person.name)}</span></label>`,
                )
                .join("")}</div></fieldset>`
            : `${commCheck("cr-before", "Avisar antes del vencimiento", r.notifyBefore)}${opsField("cr-days", "Días antes", r.daysBefore, "number", 'required min="1" max="30"')}${commCheck("cr-due", "Avisar el día del vencimiento", r.notifyOnDue)}${commCheck("cr-overdue", "Repetir mientras siga pendiente", r.notifyOverdue)}${opsField("cr-every", "Repetir cada cuántos días (desde el primer día vencido)", r.overdueEvery, "number", 'required min="1" max="30"')}${commCheck("cr-recurring", "Solo boletas de gastos recurrentes", r.recurringOnly)}<p>Se usa el saldo real, incluidos pagos parciales. Con saldo cero dejan de prepararse avisos.</p>`
        }${commSubmit("Guardar regla")}</form></article>`,
    )
    .join(
      "",
    )}<article class="panel"><h3>Revisión de hoy</h3><p>Revisá las reglas y generá los mensajes propuestos sin enviarlos. Repetir no duplica el mismo aviso.</p><button type="button" id="comm-review" class="button">Revisar avisos de hoy</button></article></section>`;
}
function commBindRules() {
  const $ = (id) => document.getElementById(id);
  function audience() {
    $("cr-customers").hidden = $("cr-audience").value !== "selected";
  }
  $("cr-audience").onchange = audience;
  audience();
  document.querySelectorAll("[data-comm-rule]").forEach((form) => {
    const kind = form.dataset.commRule,
      channel = $(`cr-${kind}-channel`),
      template = $(`cr-${kind}-template`);
    channel.onchange = () => {
      template.innerHTML = state.communications.templates
        .filter((t) => t.purpose === kind && t.channel === channel.value)
        .map(
          (t) =>
            `<option value="${escapeHtml(t.id)}">${escapeHtml(t.title)}</option>`,
        )
        .join("");
    };
    form.onsubmit = (e) => {
      e.preventDefault();
      const data = {
        enabled: $(`cr-${kind}-enabled`).checked,
        channel: channel.value,
        templateId: template.value,
        sendHour: Number($(`cr-${kind}-hour`).value),
      };
      if (!template.value) return toast("Elegí una plantilla compatible.");
      if (kind === "recovery")
        Object.assign(data, {
          offer: $("cr-offer").value.trim(),
          audience: $("cr-audience").value,
          customers: [
            ...form.querySelectorAll('[name="rule-customer"]:checked'),
          ].map((i) => i.value),
        });
      else
        Object.assign(data, {
          notifyBefore: $("cr-before").checked,
          daysBefore: Number($("cr-days").value),
          notifyOnDue: $("cr-due").checked,
          notifyOverdue: $("cr-overdue").checked,
          overdueEvery: Number($("cr-every").value),
          recurringOnly: $("cr-recurring").checked,
        });
      if (
        kind === "recovery" &&
        data.enabled &&
        data.audience === "selected" &&
        (!data.customers.length || data.customers.length > 500)
      )
        return toast("Seleccioná entre 1 y 500 clientes.");
      Object.assign(state.communications.rules[kind], data);
      save();
      toast("Regla guardada. No se activa ningún envío.");
    };
  });
  $("comm-review").onclick = () => {
    commPrepareRules(today());
    save();
    location.hash = "#comunicaciones/historial";
    toast("Avisos revisados y preparados. Sin enviar.");
  };
}
function commExpensePhase(dueOn, day, r) {
  const n = Math.round((utc(day) - utc(dueOn)) / 86400000);
  return n === -r.daysBefore && r.notifyBefore
    ? "before"
    : n === 0 && r.notifyOnDue
      ? "due"
      : n > 0 && r.notifyOverdue && (n - 1) % r.overdueEvery === 0
        ? "overdue"
        : "";
}
function commPrepareRules(day) {
  const config = state.communications,
    recovery = config.rules.recovery,
    expense = config.rules.expense;
  for (const item of config.outbox.filter(
    (m) => m.source !== "campaign" && m.status === "prepared",
  )) {
    const customer = state.customers.find((c) => c.id === item.customerId),
      owner = config.owners.find((o) => o.id === item.ownerId),
      bill = state.expenses.find((e) => e.id === item.expenseId);
    if (
      (item.source === "recovery" &&
        (!customer ||
          commReason(customer, item.channel, "recovery", day) ||
          (item.channel === "whatsapp"
            ? commPhone(customer.phone)
            : customer.instagram) !== item.destination)) ||
      (item.source === "expense" &&
        (!owner?.active || !bill || !expenseBalance(bill)))
    )
      item.status = "cancelled";
  }
  if (recovery.enabled) {
    const template = config.templates.find((t) => t.id === recovery.templateId);
    for (const person of state.customers) {
      if (
        !template ||
        (recovery.audience === "selected" &&
          !recovery.customers.includes(person.id)) ||
        commReason(person, recovery.channel, "recovery", day)
      )
        continue;
      const dedup = `recovery:${person.id}:${membershipEnd(person, day)}:${recovery.channel}`;
      if (config.outbox.some((m) => m.dedup === dedup)) continue;
      config.outbox.unshift({
        id: crypto.randomUUID(),
        dedup,
        source: "recovery",
        customerId: person.id,
        channel: recovery.channel,
        name: person.name,
        destination:
          recovery.channel === "whatsapp"
            ? commPhone(person.phone)
            : person.instagram,
        body: commRender(template.body, commContext(person, recovery.offer)),
        scheduledFor: `${day}T${String(recovery.sendHour).padStart(2, "0")}:00:00-03:00`,
        status: "prepared",
      });
    }
  }
  if (expense.enabled) {
    const template = config.templates.find((t) => t.id === expense.templateId);
    for (const bill of state.expenses) {
      if (
        !template ||
        expenseBalance(bill) <= 0 ||
        (expense.recurringOnly && !bill.templateId) ||
        !commExpensePhase(bill.dueOn, day, expense)
      )
        continue;
      for (const owner of config.owners.filter((o) => o.active)) {
        const dedup = `expense:${bill.id}:${owner.id}:${day}`,
          existing = config.outbox.find((m) => m.dedup === dedup);
        const data = {
          source: "expense",
          ownerId: owner.id,
          expenseId: bill.id,
          channel: "whatsapp",
          name: owner.name,
          destination: owner.phone,
          body: commRender(template.body, {
            nombre: owner.name,
            dueno: owner.name,
            gimnasio: config.businessName,
            gasto: bill.title,
            importe: money.format(bill.amount),
            saldo: money.format(expenseBalance(bill)),
            vencimiento: dateLabel(bill.dueOn),
            dias: String(Math.round((utc(day) - utc(bill.dueOn)) / 86400000)),
          }),
          scheduledFor: `${day}T${String(expense.sendHour).padStart(2, "0")}:00:00-03:00`,
          status: "prepared",
        };
        if (!existing)
          config.outbox.unshift({ id: crypto.randomUUID(), dedup, ...data });
        else if (existing.status === "prepared") Object.assign(existing, data);
      }
    }
  }
}
function commOutboxMarkup() {
  const rows = state.communications.outbox.slice(0, 200);
  return `<section class="ops-section"><h2>Mensajes preparados</h2><p>Últimos 200. Cada fila es un mensaje privado. Preparado nunca significa enviado ni entregado.</p>${rows.length ? rows.map((m) => `<article class="ops-item"><div class="ops-entry"><h3>${escapeHtml(m.name)}</h3><strong>${m.status === "cancelled" ? "Cancelado" : "Preparado · Sin enviar"}</strong></div><small>${m.channel === "whatsapp" ? "WhatsApp" : "Instagram"} · ${escapeHtml(m.destination)} · ${new Intl.DateTimeFormat("es-AR", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Argentina/Buenos_Aires" }).format(new Date(m.scheduledFor))}</small><p class="ops-message">${escapeHtml(m.body)}</p><small>${m.source === "expense" ? "Boleta a dueño" : m.source === "recovery" ? "Regla de regreso" : "Campaña"} · cuenta pendiente de vincular</small>${m.status === "prepared" ? `<div class="form-actions"><button type="button" class="button secondary" data-comm-cancel="${escapeHtml(m.id)}">Cancelar preparación</button></div>` : ""}</article>`).join("") : '<p class="empty">Todavía no hay mensajes preparados. Creá una campaña o revisá las reglas de hoy.</p>'}</section>`;
}
function commBindOutbox() {
  document.querySelectorAll("[data-comm-cancel]").forEach(
    (b) =>
      (b.onclick = () => {
        const m = state.communications.outbox.find(
          (m) => m.id === b.dataset.commCancel,
        );
        if (!m || m.status !== "prepared") return;
        m.status = "cancelled";
        save();
        commPage("historial");
        toast("Preparación cancelada.");
      }),
  );
}
