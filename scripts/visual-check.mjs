import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { createServer } from "node:net";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer-core";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputDir = path.join(root, "artifacts", "visual-browser");
let baseUrl;
let origin;
const viewports = [
  { name: "smartphone", width: 390, height: 844, isMobile: true },
  { name: "tablet", width: 820, height: 1180, isMobile: false },
  { name: "desktop", width: 1440, height: 900, isMobile: false },
];

let viteProcess;
let viteOutput = "";
let browser;
const report = {
  generatedAt: new Date().toISOString(),
  viewports: [],
  blockedExternalRequests: [],
  pageErrors: [],
};

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function findAvailablePort() {
  const server = createServer();
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  assert.ok(address && typeof address === "object", "Impossibile allocare una porta locale per Vite.");
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  return address.port;
}

async function waitForVite(url) {
  for (let attempt = 0; attempt < 120; attempt += 1) {
    if (viteProcess.exitCode !== null) {
      throw new Error(`La fixture Vite si è chiusa all'avvio.\n${viteOutput}`);
    }
    try {
      const response = await fetch(url);
      if (response.ok && /\bLocal:\s+http/.test(viteOutput) && viteProcess.exitCode === null) return;
    } catch {
      // Il server non è ancora in ascolto.
    }
    await delay(250);
  }
  throw new Error(`Timeout avviando la fixture Vite.\n${viteOutput}`);
}

async function newIsolatedPage(viewport) {
  const page = await browser.newPage();
  await page.setViewport({
    width: viewport.width,
    height: viewport.height,
    deviceScaleFactor: 1,
    isMobile: viewport.isMobile,
    hasTouch: viewport.isMobile,
  });
  await page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "reduce" }]);
  await page.setRequestInterception(true);
  page.on("request", (request) => {
    const requestUrl = request.url();
    let requestOrigin = "";
    try {
      requestOrigin = new URL(requestUrl).origin;
    } catch {
      // Schemi non HTTP (data:, blob:, about:) non hanno un origin standard.
    }

    if (requestOrigin === origin || /^(data|blob|about):/.test(requestUrl)) {
      void request.continue().catch(() => {});
      return;
    }

    report.blockedExternalRequests.push(requestUrl);
    void request.abort("blockedbyclient").catch(() => {});
  });
  page.on("pageerror", (error) => {
    report.pageErrors.push(`${viewport.name}: ${error.message}`);
  });
  return page;
}

async function openFixture(page, view) {
  await page.goto(`${baseUrl}/visual-preview.html?view=${view}`, {
    waitUntil: "domcontentloaded",
    timeout: 30_000,
  });
  await page.waitForFunction(
    () => document.documentElement.dataset.visualReady === "true",
    { timeout: 30_000 },
  );
  await page.evaluate(() => document.fonts.ready);
  await page.waitForFunction(() => document.querySelector("main") !== null);
  await delay(120);
}

async function assertNoHorizontalOverflow(page, label) {
  const widths = await page.evaluate(() => ({
    viewportWidth: window.innerWidth,
    documentWidth: document.documentElement.scrollWidth,
    bodyWidth: document.body.scrollWidth,
  }));
  assert.ok(
    widths.documentWidth <= widths.viewportWidth + 1 && widths.bodyWidth <= widths.viewportWidth + 1,
    `${label}: overflow orizzontale (${JSON.stringify(widths)})`,
  );
  return widths;
}

async function inspectHome(viewport) {
  const page = await newIsolatedPage(viewport);
  await openFixture(page, "home");

  const metrics = await page.evaluate(() => {
    const brand = [...document.querySelectorAll("header p")].find(
      (element) => element.textContent?.trim() === "Erga",
    );
    const greeting = document.querySelector("main h1");
    const items = [...document.querySelectorAll("main ul > li")];
    const nav = [...document.querySelectorAll('nav[aria-label]')]
      .filter((element) => getComputedStyle(element).display !== "none")
      .map((element) => {
        const rect = element.getBoundingClientRect();
        return { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom };
      });
    const brandRect = brand?.getBoundingClientRect();
    const greetingRect = greeting?.getBoundingClientRect();
    return {
      brandFound: !!brandRect,
      greetingFound: !!greetingRect,
      brandBottom: brandRect?.bottom ?? null,
      greetingTop: greetingRect?.top ?? null,
      listCount: items.length,
      listRects: items.map((item) => {
        const rect = item.getBoundingClientRect();
        return { left: rect.left, top: rect.top, bottom: rect.bottom };
      }),
      nav,
      courseCoverFound: !!document.querySelector("[data-cover-root]"),
      requiredActionsFound: ["Interrogazione", "Esercizi", "Carica materiale", "Chat"].every(
        (label) => [...document.querySelectorAll("button")].some((button) => button.textContent?.includes(label)),
      ),
    };
  });

  assert.ok(metrics.brandFound, `${viewport.name}: wordmark Erga non trovato`);
  assert.ok(metrics.greetingFound, `${viewport.name}: saluto Home non trovato`);
  assert.ok(
    metrics.greetingTop >= metrics.brandBottom - 1,
    `${viewport.name}: saluto sovrapposto al wordmark (${JSON.stringify(metrics)})`,
  );
  assert.equal(metrics.listCount, 3, `${viewport.name}: attività del giorno non renderizzate in colonna`);
  assert.ok(metrics.listRects[0].top < metrics.listRects[1].top && metrics.listRects[1].top < metrics.listRects[2].top,
    `${viewport.name}: le attività non sono in ordine verticale`);
  assert.ok(metrics.courseCoverFound, `${viewport.name}: copertina del percorso non renderizzata`);
  assert.ok(metrics.requiredActionsFound, `${viewport.name}: mancano azioni principali Home`);
  assert.ok(metrics.nav.length > 0, `${viewport.name}: navigazione app non visibile`);
  for (const rect of metrics.nav) {
    assert.ok(rect.left >= -1 && rect.right <= viewport.width + 1, `${viewport.name}: navigazione tagliata lateralmente`);
    assert.ok(rect.top >= -1 && rect.bottom <= viewport.height + 1, `${viewport.name}: navigazione tagliata verticalmente`);
  }

  const widths = await assertNoHorizontalOverflow(page, `${viewport.name} Home`);
  await page.screenshot({ path: path.join(outputDir, `home-${viewport.name}.png`), fullPage: true });

  const lastTask = await page.evaluateHandle(() =>
    [...document.querySelectorAll("main ul > li")].find((item) =>
      item.textContent?.includes("Ripasso conclusivo di cinematica"),
    ) ?? null,
  );
  assert.ok(await lastTask.asElement(), `${viewport.name}: ultima attività Home non trovata`);
  await page.evaluate((element) => element.scrollIntoView({ block: "center", behavior: "instant" }), lastTask);
  const lastTaskRect = await lastTask.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return { top: rect.top, bottom: rect.bottom };
  });
  assert.ok(
    lastTaskRect.top >= 0 && lastTaskRect.bottom <= viewport.height,
    `${viewport.name}: ultima attività non raggiungibile dopo scroll (${JSON.stringify(lastTaskRect)})`,
  );
  await page.screenshot({ path: path.join(outputDir, `home-${viewport.name}-timeline.png`), fullPage: true });
  await page.close();

  return { view: "home", viewport: viewport.name, width: viewport.width, height: viewport.height, ...widths, lastTaskRect };
}

async function inspectStudio(viewport) {
  const page = await newIsolatedPage(viewport);
  await openFixture(page, "studio");

  const createButton = 'button[aria-label="Crea un nuovo percorso di studio"]';
  await page.waitForSelector(createButton, { visible: true, timeout: 15_000 });
  const buttonRect = await page.$eval(createButton, (button) => {
    const rect = button.getBoundingClientRect();
    return { top: rect.top, bottom: rect.bottom, left: rect.left, right: rect.right };
  });
  assert.ok(buttonRect.top >= 0 && buttonRect.bottom <= viewport.height,
    `${viewport.name}: CTA «Crea nuovo percorso» tagliata (${JSON.stringify(buttonRect)})`);
  const widthsBefore = await assertNoHorizontalOverflow(page, `${viewport.name} Studio prima dell'apertura`);
  await page.screenshot({ path: path.join(outputDir, `studio-${viewport.name}.png`), fullPage: true });

  await page.click(createButton);
  if (viewport.isMobile) {
    await page.waitForSelector('[role="dialog"]', { visible: true, timeout: 10_000 });
    await page.waitForFunction(() => {
      const dialog = document.querySelector('[role="dialog"]');
      if (!dialog) return false;
      const rect = dialog.getBoundingClientRect();
      return rect.height > 0 && Math.abs(rect.bottom - window.innerHeight) < 8;
    }, { timeout: 10_000 });

    await page.waitForFunction(() => {
      const dialog = document.querySelector('[role="dialog"]');
      if (!dialog) return false;
      return ["Carica PDF", "Carica foto", "Ricerca web"].every((label) => {
        const button = [...dialog.querySelectorAll("button")].find((candidate) => candidate.textContent?.includes(label));
        if (!button) return false;
        const style = getComputedStyle(button);
        const rect = button.getBoundingClientRect();
        return style.display !== "none" && style.visibility !== "hidden" && Number(style.opacity) >= 0.98 && rect.width > 0;
      });
    }, { timeout: 5_000 });

    const sheet = await page.$eval('[role="dialog"]', (dialog) => {
      const rect = dialog.getBoundingClientRect();
      const options = ["Carica PDF", "Carica foto", "Ricerca web"].map((label) => {
        const button = [...dialog.querySelectorAll("button")].find((candidate) => candidate.textContent?.includes(label));
        const buttonRect = button?.getBoundingClientRect();
        const style = button ? getComputedStyle(button) : null;
        return {
          label,
          found: !!button,
          display: style?.display ?? null,
          visibility: style?.visibility ?? null,
          opacity: style ? Number(style.opacity) : null,
          top: buttonRect?.top ?? null,
          bottom: buttonRect?.bottom ?? null,
          scrollHeight: button?.parentElement?.parentElement?.scrollHeight ?? null,
          clientHeight: button?.parentElement?.parentElement?.clientHeight ?? null,
        };
      });
      return {
        top: rect.top,
        bottom: rect.bottom,
        height: rect.height,
        text: dialog.textContent ?? "",
        options,
      };
    });
    assert.ok(sheet.top >= 0 && sheet.bottom <= viewport.height + 1,
      `${viewport.name}: bottom sheet tagliato (${JSON.stringify(sheet)})`);
    assert.ok(sheet.height <= viewport.height * 0.86,
      `${viewport.name}: bottom sheet supera il limite previsto (${JSON.stringify(sheet)})`);
    for (const label of ["Carica PDF", "Carica foto", "Ricerca web"]) {
      assert.ok(sheet.text.includes(label), `${viewport.name}: opzione «${label}» non raggiungibile nel menu mobile`);
      const option = sheet.options.find((candidate) => candidate.label === label);
      assert.ok(option?.found && option.display !== "none" && option.visibility === "visible" && option.opacity >= 0.98,
        `${viewport.name}: opzione «${label}» non è visibile (${JSON.stringify(option)})`);
      assert.ok(option.top >= sheet.top && option.bottom <= sheet.bottom,
        `${viewport.name}: opzione «${label}» esce dal bottom sheet (${JSON.stringify(option)})`);
    }
    const embeddedPanelVisible = await page.$eval("#study-material-controls", (element) => {
      const style = getComputedStyle(element);
      return style.display !== "none" && element.getBoundingClientRect().height > 0;
    });
    assert.equal(embeddedPanelVisible, false, "Su smartphone il menu deve aprirsi dal basso, non nel pannello materiali incorporato.");
    const widthsAfter = await assertNoHorizontalOverflow(page, `${viewport.name} Studio con bottom sheet`);
    await page.screenshot({ path: path.join(outputDir, `studio-${viewport.name}-bottom-sheet.png`), fullPage: true });
    await page.close();
    return { view: "studio", viewport: viewport.name, width: viewport.width, height: viewport.height, ...widthsBefore, sheet, widthsAfter };
  }

  await page.waitForFunction(() => {
    const panel = document.querySelector(".material-panel");
    if (!panel) return false;
    const rect = panel.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  }, { timeout: 10_000 });
  await page.waitForFunction(() => {
    const panel = document.querySelector(".material-panel");
    if (!panel) return false;
    return ["Carica PDF", "Carica foto", "Ricerca web"].every((label) =>
      [...panel.querySelectorAll("button")].some((button) => button.textContent?.includes(label) && Number(getComputedStyle(button).opacity) >= 0.98),
    );
  }, { timeout: 5_000 });
  const embeddedPanel = await page.$eval(".material-panel", (panel) => {
    const title = [...panel.querySelectorAll("h2")].find((heading) => heading.textContent?.trim() === "I tuoi materiali");
    const titleRect = title?.getBoundingClientRect();
    const appHeader = document.querySelector("#app-scroll-view > header");
    const headerRect = appHeader?.getBoundingClientRect();
    return {
      titleFound: !!titleRect,
      titleTop: titleRect?.top ?? null,
      titleBottom: titleRect?.bottom ?? null,
      headerBottom: headerRect?.bottom ?? null,
      appScrollTop: document.querySelector("#app-scroll-view")?.scrollTop ?? null,
      options: ["Carica PDF", "Carica foto", "Ricerca web"].map((label) => {
        const button = [...panel.querySelectorAll("button")].find((candidate) => candidate.textContent?.includes(label));
        const rect = button?.getBoundingClientRect();
        return { label, top: rect?.top ?? null, bottom: rect?.bottom ?? null };
      }),
    };
  });
  assert.ok(embeddedPanel.titleFound, `${viewport.name}: intestazione materiali non trovata`);
  assert.ok(
    embeddedPanel.titleTop >= embeddedPanel.headerBottom - 1,
    `${viewport.name}: intestazione del pannello materiali nascosta sotto l'header sticky (${JSON.stringify(embeddedPanel)})`,
  );
  const sheetCount = await page.$$eval('[role="dialog"]', (dialogs) => dialogs.length);
  assert.equal(sheetCount, 0, `${viewport.name}: il flusso desktop/tablet non deve aprire un bottom sheet`);
  const widthsAfter = await assertNoHorizontalOverflow(page, `${viewport.name} Studio con pannello materiali`);
  await page.screenshot({ path: path.join(outputDir, `studio-${viewport.name}-materials.png`), fullPage: true });
  await page.close();
  return { view: "studio", viewport: viewport.name, width: viewport.width, height: viewport.height, ...widthsBefore, widthsAfter, embeddedPanel };
}

async function stopVite() {
  if (!viteProcess || viteProcess.exitCode !== null) return;
  viteProcess.kill("SIGTERM");
  await Promise.race([
    new Promise((resolve) => viteProcess.once("exit", resolve)),
    delay(4_000),
  ]);
  if (viteProcess.exitCode === null) viteProcess.kill("SIGKILL");
}

try {
  await mkdir(outputDir, { recursive: true });
  const port = await findAvailablePort();
  baseUrl = `http://127.0.0.1:${port}`;
  origin = new URL(baseUrl).origin;
  const viteBin = path.join(root, "node_modules", "vite", "bin", "vite.js");
  viteProcess = spawn(process.execPath, [
    viteBin,
    "--config", "vite.visual.config.ts",
    "--host", "127.0.0.1",
    "--port", String(port),
    "--strictPort",
  ], {
    cwd: root,
    env: { ...process.env, NODE_ENV: "development" },
    stdio: ["ignore", "pipe", "pipe"],
  });
  viteProcess.stdout.on("data", (chunk) => { viteOutput += chunk.toString(); });
  viteProcess.stderr.on("data", (chunk) => { viteOutput += chunk.toString(); });

  await waitForVite(`${baseUrl}/visual-preview.html`);

  // @sparticuz/chromium ships the matching AL2023 shared libraries in its npm
  // package. Trigger only that local extraction; restore the environment flag
  // immediately, before any browser page is opened or application code runs.
  const previousExecutionEnv = process.env.AWS_EXECUTION_ENV;
  process.env.AWS_EXECUTION_ENV = "AWS_Lambda_nodejs22.x";
  let chromiumModule;
  let executablePath;
  try {
    chromiumModule = await import("@sparticuz/chromium");
    const runtimeArchive = path.join(root, "node_modules", "@sparticuz", "chromium", "bin", "al2023.tar.br");
    await chromiumModule.inflate(runtimeArchive);
    chromiumModule.setupLambdaEnvironment(path.join(tmpdir(), "al2023", "lib"));
    executablePath = await chromiumModule.default.executablePath();
  } finally {
    if (previousExecutionEnv === undefined) delete process.env.AWS_EXECUTION_ENV;
    else process.env.AWS_EXECUTION_ENV = previousExecutionEnv;
  }

  browser = await puppeteer.launch({
    args: chromiumModule.default.args.filter(
      (argument) => argument !== "--disable-web-security" && argument !== "--allow-running-insecure-content",
    ),
    executablePath,
    headless: true,
    defaultViewport: null,
  });

  for (const viewport of viewports) {
    report.viewports.push(await inspectHome(viewport));
    report.viewports.push(await inspectStudio(viewport));
  }

  assert.deepEqual(report.blockedExternalRequests, [], "La fixture ha tentato richieste verso servizi esterni.");
  assert.deepEqual(report.pageErrors, [], "Il browser ha segnalato errori JavaScript.");
  report.status = "passed";
  await writeFile(path.join(outputDir, "report.json"), `${JSON.stringify(report, null, 2)}\n`);
  console.log("Verifica browser completata: smartphone, tablet e desktop.");
  console.log(`Screenshot e report: ${path.relative(root, outputDir)}`);
} catch (error) {
  report.status = "failed";
  report.error = error instanceof Error ? error.message : String(error);
  await mkdir(outputDir, { recursive: true });
  await writeFile(path.join(outputDir, "report.json"), `${JSON.stringify(report, null, 2)}\n`);
  console.error(report.error);
  if (viteOutput.trim()) console.error(viteOutput.trim());
  process.exitCode = 1;
} finally {
  if (browser) await browser.close().catch(() => {});
  await stopVite();
}
