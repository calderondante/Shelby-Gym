"use client";
import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import {
  ArrowUpRight,
  Check,
  FileSpreadsheet,
  Upload,
  Download,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldLabel, FieldDescription } from "@/components/ui/field";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { MotionStage } from "@/components/shared/motion";
import { ImportReview } from "./import-review";
import {
  columns,
  guessMapping,
  normalize,
  type Sheet,
  type Mapping,
  type ImportPayload,
  type ImportReport,
} from "../domain/contracts";
import { prepareImport } from "../domain/prepare";
import { importHistoryAction } from "../server/actions";
type Activity = { id: string; name: string };
export function ImportWizard({
  activities,
  currency,
  today,
}: {
  activities: Activity[];
  currency: string;
  today: string;
}) {
  const [stage, setStage] = useState(0),
    [sheets, setSheets] = useState<Sheet[]>([]),
    [sheetIndex, setSheetIndex] = useState(0);
  const [filename, setFilename] = useState(""),
    [mapping, setMapping] = useState<Mapping>(guessMapping([]));
  const [activityMap, setActivityMap] = useState<Record<string, string>>({});
  const [source, setSource] = useState("Migración inicial"),
    [ageDate, setAgeDate] = useState(today);
  const [error, setError] = useState(""),
    [issues, setIssues] = useState<{ row: number; message: string }[]>([]);
  const [reading, setReading] = useState(false),
    [pending, startTransition] = useTransition();
  const [payload, setPayload] = useState<ImportPayload | null>(null),
    [report, setReport] = useState<ImportReport | null>(null),
    [confirmed, setConfirmed] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null),
    worker = useRef<Worker | null>(null),
    timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const busy = reading || pending;
  useEffect(
    () => () => {
      worker.current?.terminate();
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );
  useEffect(() => {
    if (!sheets.length || stage === 3) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [sheets.length, stage]);
  const sheet = sheets[sheetIndex];
  const activityNames =
    sheet && mapping.activity >= 0
      ? [
          ...new Set(
            sheet.data
              .slice(1)
              .map((r) => String(r[mapping.activity] ?? "").trim())
              .filter(Boolean),
          ),
        ]
      : [];
  const effectiveActivities = Object.fromEntries(
    activityNames.map((name) => [
      name,
      activityMap[name] ??
        activities.find((a) => normalize(a.name) === normalize(name))?.id ??
        "",
    ]),
  );
  function selectSheet(index: number) {
    setSheetIndex(index);
    setMapping(guessMapping(sheets[index].data[0] ?? []));
    setIssues([]);
    setError("");
    setActivityMap({});
  }
  async function read(file: File) {
    if (!/\.xlsx$/i.test(file.name)) {
      setError(
        "Elegí un archivo .xlsx. Si tenés .xls o CSV, abrilo en Excel y guardá una copia .xlsx.",
      );
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError("El archivo supera 2 MB. Dividilo por clientes completos.");
      return;
    }
    worker.current?.terminate();
    if (timer.current) clearTimeout(timer.current);
    setError("");
    setIssues([]);
    setReading(true);
    setFilename(file.name);
    setReport(null);
    setPayload(null);
    let task: Worker;
    try {
      task = new Worker(
        new URL("../domain/read-workbook.worker.ts", import.meta.url),
      );
    } catch {
      setReading(false);
      setError(
        "Este navegador no pudo iniciar la lectura segura. Actualizalo y volvé a intentar.",
      );
      return;
    }
    worker.current = task;
    const stop = () => {
      task.terminate();
      if (timer.current) clearTimeout(timer.current);
      setReading(false);
    };
    timer.current = setTimeout(() => {
      stop();
      setError(
        "La lectura tardó demasiado. Simplificá el archivo y volvé a intentar.",
      );
    }, 15000);
    task.onerror = () => {
      stop();
      setError(
        "No pudimos leer el archivo. Guardá una copia nueva como .xlsx y reintentá.",
      );
    };
    task.onmessage = (
      e: MessageEvent<{ sheets?: Sheet[]; error?: string }>,
    ) => {
      stop();
      if (e.data.error || !e.data.sheets?.length) {
        setError(e.data.error ?? "El archivo no tiene hojas.");
        return;
      }
      setSheets(e.data.sheets);
      setSheetIndex(0);
      setMapping(guessMapping(e.data.sheets[0].data[0] ?? []));
      setActivityMap({});
      setStage(1);
    };
    task.postMessage(file);
  }
  function review() {
    if (!sheet) return;
    setError("");
    setIssues([]);
    const parsed = prepareImport(
      sheet.data,
      mapping,
      effectiveActivities,
      ageDate,
    );
    if (parsed.issues.length) {
      setIssues(parsed.issues);
      return;
    }
    const draft = {
      requestId: crypto.randomUUID(),
      source,
      currency,
      clients: parsed.clients,
    };
    startTransition(async () => {
      try {
        const result = await importHistoryAction(draft, false);
        if (result.error) {
          setError(result.error);
          return;
        }
        if (result.report?.issues.length) {
          setIssues(result.report.issues);
          return;
        }
        if (result.report) {
          setPayload(draft);
          setReport(result.report);
          setConfirmed(false);
          setStage(2);
        }
      } catch {
        setError(
          "No pudimos comprobar los datos. Revisá la conexión y reintentá.",
        );
      }
    });
  }
  function save() {
    if (!payload || !confirmed) return;
    setError("");
    startTransition(async () => {
      try {
        const result = await importHistoryAction(payload, true);
        if (result.error) {
          setError(result.error);
          return;
        }
        if (result.report?.issues.length) {
          setIssues(result.report.issues);
          setStage(1);
          setError(
            "Los datos cambiaron desde la revisión. Resolvé estas filas y revisá otra vez.",
          );
          return;
        }
        if (result.report?.committed) {
          setReport(result.report);
          setStage(3);
          setSheets([]);
        }
      } catch {
        setError(
          "No pudimos confirmar el resultado. Reintentá sin cambiar los datos: no se duplicará la importación.",
        );
      }
    });
  }
  return (
    <div className="import-flow" aria-busy={busy}>
      <ol className="import-steps" aria-label="Pasos de importación">
        {["Archivo", "Columnas", "Revisión", "Listo"].map((label, i) => (
          <li
            key={label}
            aria-current={i === stage ? "step" : undefined}
            data-complete={i < stage}
          >
            <span>
              {i < stage ? <Check size={14} aria-hidden="true" /> : i + 1}
            </span>
            <b>{label}</b>
          </li>
        ))}
      </ol>
      <MotionStage stage={stage}>
        {stage === 0 ? (
          <div className="import-welcome">
            <div className="import-upload">
              <div className="import-file-mark" aria-hidden="true">
                <FileSpreadsheet size={34} />
                <span>.xlsx</span>
              </div>
              <h2 data-step-heading tabIndex={-1}>
                Tu gimnasio ya tiene historia.
              </h2>
              <p>
                Traela con vos. Clientes, actividades, cuotas y pagos
                anteriores, en su lugar.
              </p>
              <input
                ref={fileInput}
                type="file"
                accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                className="sr-only"
                aria-label="Archivo Excel"
                disabled={busy}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void read(f);
                  e.target.value = "";
                }}
              />
              <Button
                size="lg"
                disabled={busy}
                onClick={() => fileInput.current?.click()}
              >
                <Upload data-icon="inline-start" aria-hidden="true" />
                {reading ? "Leyendo archivo…" : "Elegir archivo Excel"}
              </Button>
              <small>.xlsx · Hasta 2 MB · 1.000 filas / 500 clientes</small>
            </div>
            <aside className="import-promise">
              <span className="eyebrow">CONTINUIDAD, SIN EMPEZAR DE CERO</span>
              <h3>Cada cuota, con el precio de su momento.</h3>
              <p>
                Los importes anteriores no se recalculan con la tarifa actual.
                Conservamos fechas, pagos y saldos tal como los revises.
              </p>
              <ul>
                <li>
                  <Check aria-hidden="true" />
                  Primero revisás. Después importás.
                </li>
                <li>
                  <Check aria-hidden="true" />
                  Detectamos posibles duplicados.
                </li>
                <li>
                  <Check aria-hidden="true" />
                  El archivo se lee en tu dispositivo.
                </li>
              </ul>
              <Button
                variant="outline"
                onClick={() =>
                  void import("../domain/template")
                    .then((m) => m.downloadTemplate())
                    .catch(() =>
                      setError("No pudimos descargar la plantilla. Reintentá."),
                    )
                }
              >
                <Download data-icon="inline-start" aria-hidden="true" />
                Descargar plantilla Excel
              </Button>
            </aside>
          </div>
        ) : null}
        {stage === 1 && sheet ? (
          <div className="import-mapping">
            <div className="import-section-heading">
              <div>
                <span className="eyebrow">01 / PREPARAR</span>
                <h2 data-step-heading tabIndex={-1}>
                  Cada columna, en su lugar.
                </h2>
                <p>
                  {filename} · {Math.max(0, sheet.data.length - 1)} filas
                </p>
              </div>
              <Button
                variant="ghost"
                disabled={busy}
                onClick={() => {
                  setStage(0);
                  setError("");
                  setIssues([]);
                }}
              >
                Cambiar archivo
              </Button>
            </div>
            <div className="import-settings">
              <Field>
                <FieldLabel htmlFor="sheet">Hoja del Excel</FieldLabel>
                <NativeSelect
                  id="sheet"
                  value={sheetIndex}
                  disabled={busy}
                  onChange={(e) => selectSheet(Number(e.target.value))}
                >
                  {sheets.map((s, i) => (
                    <NativeSelectOption key={s.sheet} value={i}>
                      {s.sheet}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </Field>
              <Field>
                <FieldLabel htmlFor="import-source">
                  Origen de los datos
                </FieldLabel>
                <Input
                  id="import-source"
                  value={source}
                  maxLength={80}
                  disabled={busy}
                  onChange={(e) => setSource(e.target.value)}
                />
                <FieldDescription>
                  Conservá este nombre en reintentos para reconocer los mismos
                  IDs.
                </FieldDescription>
              </Field>
              <Field>
                <FieldLabel htmlFor="age-date">Edad referida al</FieldLabel>
                <Input
                  id="age-date"
                  type="date"
                  value={ageDate}
                  max={today}
                  disabled={busy}
                  onChange={(e) => setAgeDate(e.target.value)}
                />
                <FieldDescription>
                  Usá la fecha en que se anotaron esas edades.
                </FieldDescription>
              </Field>
            </div>
            <div className="mapping-guide">
              <ShieldCheck size={20} aria-hidden="true" />
              <p>
                Una fila por pago o cuota. Repetí el ID de cliente para reunir
                su historial, y el ID de cuota para reunir sus pagos. Si solo
                tenés clientes, dejá las columnas de cuotas sin asignar.
              </p>
            </div>
            <div className="mapping-columns">
              {columns.map(([key, label]) => (
                <Field key={key}>
                  <FieldLabel htmlFor={`map-${key}`}>
                    {label}
                    {["external_id", "name"].includes(key) ? " *" : ""}
                  </FieldLabel>
                  <NativeSelect
                    id={`map-${key}`}
                    value={mapping[key]}
                    disabled={busy}
                    onChange={(e) => {
                      setMapping({ ...mapping, [key]: Number(e.target.value) });
                      setIssues([]);
                    }}
                  >
                    <NativeSelectOption value={-1}>
                      Sin asignar
                    </NativeSelectOption>
                    {(sheet.data[0] ?? []).map((h, i) => (
                      <NativeSelectOption key={i} value={i}>
                        {String(h ?? `Columna ${i + 1}`)}
                      </NativeSelectOption>
                    ))}
                  </NativeSelect>
                </Field>
              ))}
            </div>
            {activityNames.length ? (
              <section className="activity-mapping">
                <h3>Relacioná las actividades</h3>
                <p>
                  Elegí la plantilla correspondiente. Su precio actual no
                  modifica las cuotas importadas.
                </p>
                {activityNames.map((name) => (
                  <Field key={name}>
                    <FieldLabel
                      htmlFor={`activity-${activityNames.indexOf(name)}`}
                    >
                      {name}
                    </FieldLabel>
                    <NativeSelect
                      id={`activity-${activityNames.indexOf(name)}`}
                      value={effectiveActivities[name]}
                      disabled={busy}
                      onChange={(e) =>
                        setActivityMap({
                          ...activityMap,
                          [name]: e.target.value,
                        })
                      }
                    >
                      <NativeSelectOption value="">
                        Elegir actividad
                      </NativeSelectOption>
                      {activities.map((a) => (
                        <NativeSelectOption key={a.id} value={a.id}>
                          {a.name}
                        </NativeSelectOption>
                      ))}
                    </NativeSelect>
                  </Field>
                ))}
                {!activities.length ? (
                  <Link
                    className="text-link"
                    href="/actividades/nueva"
                    target="_blank"
                  >
                    Crear actividades en otra pestaña{" "}
                    <ArrowUpRight size={15} aria-hidden="true" />
                  </Link>
                ) : null}
              </section>
            ) : null}
            <p className="import-format-note">
              Fechas: DD/MM/AAAA o AAAA-MM-DD. Importes en {currency}, como
              números o texto 25.000,50. Saldo 0 significa pagado; una celda
              vacía no significa cero. Exportá fórmulas como valores.
            </p>
            <Button
              size="lg"
              disabled={busy || !source.trim()}
              onClick={review}
            >
              {pending ? "Comprobando datos…" : "Revisar importación"}
              <ArrowRight data-icon="inline-end" aria-hidden="true" />
            </Button>
          </div>
        ) : null}
        {stage === 2 && report && payload ? (
          <ImportReview
            payload={payload}
            report={report}
            activities={activities}
            currency={currency}
            busy={busy}
            confirmed={confirmed}
            setConfirmed={setConfirmed}
            onBack={() => setStage(1)}
            onSave={save}
          />
        ) : null}
        {stage === 3 && report ? (
          <div className="import-success">
            <div className="success-seal" aria-hidden="true">
              <Check size={30} />
            </div>
            <span className="eyebrow">YA ESTÁN EN SHELBY</span>
            <h2 data-step-heading tabIndex={-1}>
              Tu historia sigue acá.
            </h2>
            <p role="status">
              {report.created} clientes incorporados.{" "}
              {report.skipped
                ? `${report.skipped} ya estaban importados y no se duplicaron.`
                : "Las cuotas y pagos quedaron guardados con sus condiciones originales."}
            </p>
            <Link href="/clientes" className={buttonVariants({ size: "lg" })}>
              Ver clientes
              <ArrowRight data-icon="inline-end" aria-hidden="true" />
            </Link>
            <Button
              variant="ghost"
              onClick={() => {
                setStage(0);
                setReport(null);
                setPayload(null);
              }}
            >
              Importar otro archivo
            </Button>
          </div>
        ) : null}
      </MotionStage>
      {busy ? (
        <p className="import-working" role="status">
          <span aria-hidden="true" />
          {reading
            ? "Leyendo el Excel en este dispositivo…"
            : stage === 2
              ? "Guardando de forma segura…"
              : "Validando fechas, saldos y duplicados…"}
        </p>
      ) : null}
      {error ? (
        <Alert variant="destructive" role="alert">
          <AlertTitle>No pudimos continuar</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
      {issues.length ? (
        <Alert variant="destructive" role="alert">
          <AlertTitle>
            {issues.length} observaciones · no se importó ninguna fila
          </AlertTitle>
          <AlertDescription>
            <p>
              Corregí estas filas en el Excel o ajustá la relación de columnas.
            </p>
            <ul className="import-issues">
              {issues.slice(0, 50).map((issue, i) => (
                <li key={i}>
                  <strong>Fila {issue.row}:</strong> {issue.message}
                </li>
              ))}
            </ul>
            {issues.length > 50 ? (
              <p>Mostrando las primeras 50 observaciones.</p>
            ) : null}
          </AlertDescription>
        </Alert>
      ) : null}
    </div>
  );
}
