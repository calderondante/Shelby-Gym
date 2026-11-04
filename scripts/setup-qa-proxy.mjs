// QA loopback proxy: counters contain only method/table/RPC names, never params or bodies.
import http from "node:http";
import net from "node:net";
let delayMs = 0,
  totalRequests = 0,
  requestsByPath = {},
  durationMsByPath = {};
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://127.0.0.1");
  if (url.pathname === "/__qa/metrics") {
    res.writeHead(200, { "content-type": "application/json" });
    return res.end(
      JSON.stringify({
        delayMs,
        totalRequests,
        requestsByPath,
        durationMsByPath,
      }),
    );
  }
  if (url.pathname === "/__qa/control" && req.method === "POST") {
    let body = "";
    for await (const chunk of req) {
      body += chunk;
      if (body.length > 1024) {
        res.writeHead(413);
        res.end();
        return;
      }
    }
    try {
      const x = JSON.parse(body);
      delayMs = Math.min(2000, Math.max(0, Number(x.delayMs) || 0));
      totalRequests = 0;
      requestsByPath = {};
      durationMsByPath = {};
      res.end("OK");
    } catch {
      res.writeHead(400);
      res.end();
    }
    return;
  }
  const auth = url.pathname.startsWith("/auth/v1/"),
    rest = url.pathname.startsWith("/rest/v1/"),
    realtime = url.pathname.startsWith("/realtime/v1/");
  if (!auth && !rest && !realtime) {
    res.writeHead(404);
    res.end();
    return;
  }
  const path =
    url.pathname
      .replace(/^\/(auth|rest)\/v1/, "")
      .replace(/^\/realtime\/v1/, "/socket") + url.search;
  const port = auth ? 54324 : rest ? 54325 : 54326;
  const key = url.pathname.replace(/\/[0-9a-f-]{36}(?=\/|$)/gi, "/:id");
  const started = performance.now();
  totalRequests++;
  requestsByPath[key] = (requestsByPath[key] ?? 0) + 1;
  if (delayMs) await new Promise((r) => setTimeout(r, delayMs));
  const proxy = http.request(
    {
      hostname: "127.0.0.1",
      port,
      path,
      method: req.method,
      headers: {
        ...req.headers,
        host: realtime ? "realtime-dev.supabase-realtime" : `127.0.0.1:${port}`,
      },
    },
    (up) => {
      res.writeHead(up.statusCode, up.headers);
      up.pipe(res);
      up.on("end", () => {
        durationMsByPath[key] =
          (durationMsByPath[key] ?? 0) + performance.now() - started;
      });
    },
  );
  proxy.on("error", () => {
    res.writeHead(502);
    res.end("Local QA upstream unavailable");
  });
  req.pipe(proxy);
});
server.on("upgrade", (req, socket, head) => {
  if (!req.url.startsWith("/realtime/v1/")) return socket.destroy();
  const upstream = net.connect(54326, "127.0.0.1", () => {
    const headers = { ...req.headers, host: "realtime-dev.supabase-realtime" };
    upstream.write(
      `${req.method} ${req.url.replace("/realtime/v1", "/socket")} HTTP/1.1\r\n${Object.entries(
        headers,
      )
        .map(([k, v]) => `${k}: ${v}`)
        .join("\r\n")}\r\n\r\n`,
    );
    if (head.length) upstream.write(head);
    socket.pipe(upstream).pipe(socket);
  });
  upstream.on("error", () => socket.destroy());
  socket.on("error", () => upstream.destroy());
});
server.listen(54321, "127.0.0.1", () =>
  console.log(
    "QA API 54321; metrics /__qa/metrics; POST /__qa/control {delayMs:200} resets counters. Local only.",
  ),
);
