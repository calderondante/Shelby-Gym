import readXlsx from "read-excel-file/web-worker";
import { unzipSync, strFromU8 } from "fflate";
self.onmessage = async (event: MessageEvent<File>) => {
  try {
    if (event.data.size > 2 * 1024 * 1024)
      throw new Error("El archivo supera 2 MB.");
    const bytes = new Uint8Array(await event.data.arrayBuffer());
    let expanded = 0,
      entries = 0;
    const files = unzipSync(bytes, {
      filter(entry) {
        expanded += entry.originalSize;
        entries++;
        if (
          expanded > 12 * 1024 * 1024 ||
          entries > 200 ||
          /vbaProject|externalLinks/i.test(entry.name)
        )
          throw new Error(
            "Archivo demasiado complejo o con contenido externo. Exportá una copia solo con valores.",
          );
        return /\.xml$/i.test(entry.name);
      },
    });
    for (const file of Object.values(files))
      if (/<(?:\w+:)?f(?:\s|>)/.test(strFromU8(file)))
        throw new Error(
          "El Excel contiene fórmulas. Pegá sus resultados como valores en una copia antes de importar.",
        );
    const sheets = await readXlsx(event.data);
    if (sheets.length > 10)
      throw new Error("Usá un archivo con un máximo de 10 hojas.");
    self.postMessage({
      sheets: sheets.map((s) => {
        if (s.data.length > 1001 || s.data.some((r) => r.length > 50))
          throw new Error("Cada hoja admite hasta 1.000 filas y 50 columnas.");
        return {
          sheet: s.sheet,
          data: s.data.map((r) =>
            r.map((v) =>
              v instanceof Date ? v.toISOString().slice(0, 10) : v,
            ),
          ),
        };
      }),
    });
  } catch (error) {
    self.postMessage({
      error:
        error instanceof Error ? error.message : "No pudimos leer el Excel.",
    });
  }
};
