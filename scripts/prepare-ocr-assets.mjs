import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { mkdir, copyFile } from "node:fs/promises";
const require = createRequire(import.meta.url);
const tess = dirname(require.resolve("tesseract.js/package.json"));
const tessRequire = createRequire(join(tess, "package.json"));
const core = dirname(tessRequire.resolve("tesseract.js-core/package.json"));
const model = dirname(require.resolve("@tesseract.js-data/spa/package.json"));
const target = join(process.cwd(), "public", "ocr");
await mkdir(target, { recursive: true });
const copies = [
  [join(tess, "dist/worker.min.js"), "worker.min.js"],
  [join(tess, "dist/worker.min.js.LICENSE.txt"), "worker.LICENSE.txt"],
  [join(tess, "LICENSE.md"), "tesseract-js.LICENSE.txt"],
  [join(core, "LICENSE"), "tesseract-core.LICENSE.txt"],
  [
    join(process.cwd(), "docs/licenses/tessdata-APACHE-2.0.txt"),
    "tessdata.LICENSE.txt",
  ],
  [join(model, "4.0.0_best_int/spa.traineddata.gz"), "spa.traineddata.gz"],
  ...[
    "tesseract-core-relaxedsimd-lstm.wasm.js",
    "tesseract-core-relaxedsimd-lstm.wasm",
    "tesseract-core-lstm.wasm.js",
    "tesseract-core-lstm.wasm",
    "tesseract-core-simd-lstm.wasm.js",
    "tesseract-core-simd-lstm.wasm",
  ].map((name) => [join(core, name), name]),
];
await Promise.all(
  copies.map(([source, name]) => copyFile(source, join(target, name))),
);
console.log(
  "OCR: recursos locales preparados; sin CDN ni imágenes de usuarios.",
);
