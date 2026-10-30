import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { createServer } from "node:net";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer-core";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputDir = process.env.VISUAL_OUTPUT_DIR
  ? path.resolve(root, process.env.VISUAL_OUTPUT_DIR)
  : path.join(root, "artifacts", "visual-browser");
let baseUrl;
let origin;
const viewports = [
  { name: "small-smartphone", width: 320, height: 844, isMobile: true },
  { name: "compact-smartphone", width: 360, height: 844, isMobile: true },
  { name: "smartphone", width: 390, height: 844, isMobile: true },
  { name: "tablet", width: 820, height: 1180, isMobile: false },
  { name: "desktop", width: 1440, height: 900, isMobile: false },
];
const studioViewports = viewports.filter((viewport) => viewport.width >= 390);
const prompt7Viewports = viewports.filter((viewport) => viewport.width === 390 || viewport.width === 1440);
const enforcePrompt7 = process.env.VISUAL_EXPECT_PROMPT7 !== "false";

let viteProcess;
let viteOutput = "";
let browser;
const report = {
  generatedAt: new Date().toISOString(),
  viewports: [],
  prompt7Captures: [],
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
    const coursePosition = [...document.querySelectorAll("main *")].find(
      (element) => element.childElementCount === 0 && element.textContent?.trim().startsWith("Lezione "),
    );
    const progressbar = document.querySelector('main [role="progressbar"]');
    const courseProgressPercent = progressbar?.parentElement?.querySelector("span")?.textContent?.trim() ?? null;
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
      coursePositionText: coursePosition?.textContent?.trim() ?? null,
      courseProgressPercent,
      listCount: items.length,
      listRects: items.map((item) => {
        const rect = item.getBoundingClientRect();
        return { left: rect.left, top: rect.top, bottom: rect.bottom };
      }),
      nav,
      courseCoverFound: !!document.querySelector("[data-cover-root]"),
      actionButtons: ["Interrogazione", "Esercizi", "Carica materiale", "Chat"].map((label) => {
        const button = [...document.querySelectorAll("button")]
          .find((candidate) => candidate.textContent?.includes(label));
        const text = [...(button?.querySelectorAll("span") ?? [])]
          .find((candidate) => candidate.textContent?.trim() === label);
        const buttonRect = button?.getBoundingClientRect();
        const textRect = text?.getBoundingClientRect();
        const buttonStyle = button ? getComputedStyle(button) : null;
        return {
          label,
          found: !!button,
          left: buttonRect?.left ?? null,
          right: buttonRect?.right ?? null,
          clientWidth: button?.clientWidth ?? null,
          scrollWidth: button?.scrollWidth ?? null,
          clientHeight: button?.clientHeight ?? null,
          scrollHeight: button?.scrollHeight ?? null,
          whiteSpace: buttonStyle?.whiteSpace ?? null,
          textLeft: textRect?.left ?? null,
          textRight: textRect?.right ?? null,
        };
      }),
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
  for (const action of metrics.actionButtons) {
    assert.ok(action.found, `${viewport.name}: azione Home «${action.label}» non trovata`);
    assert.equal(action.whiteSpace, "normal",
      `${viewport.name}: «${action.label}» non consente il ritorno a capo`);
    assert.ok(action.left >= -1 && action.right <= viewport.width + 1,
      `${viewport.name}: pulsante «${action.label}» tagliato lateralmente (${JSON.stringify(action)})`);
    assert.ok(action.textLeft >= action.left - 1 && action.textRight <= action.right + 1,
      `${viewport.name}: etichetta «${action.label}» esce dal pulsante (${JSON.stringify(action)})`);
    assert.ok(action.scrollWidth <= action.clientWidth + 2 && action.scrollHeight <= action.clientHeight + 2,
      `${viewport.name}: contenuto del pulsante «${action.label}» tagliato (${JSON.stringify(action)})`);
  }
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

  return {
    view: "home",
    viewport: viewport.name,
    width: viewport.width,
    height: viewport.height,
    coursePositionText: metrics.coursePositionText,
    courseProgressPercent: metrics.courseProgressPercent,
    ...widths,
    lastTaskRect,
  };
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

async function inspectPrompt7(viewport) {
  const studioPage = await newIsolatedPage(viewport);
  await openFixture(studioPage, "studio");
  await studioPage.waitForSelector('button[aria-label="Crea un nuovo percorso di studio"]', {
    visible: true,
    timeout: 15_000,
  });
  const studioMetrics = await studioPage.evaluate(() => {
    const bounds = (element) => {
      if (!element) return null;
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      return {
        x: Math.round(rect.x),
        y: Math.round(rect.y),
        width: Math.round(rect.width),
        height: Math.round(rect.height),
        backgroundColor: style.backgroundColor,
        className: typeof element.className === "string" ? element.className : "",
      };
    };
    const buttons = [...document.querySelectorAll("button")];
    const continueButton = buttons.find((button) => button.textContent?.trim().startsWith("Continua"));
    const progressPosition = [...document.querySelectorAll("main *")]
      .find((element) => element.childElementCount === 0 && element.textContent?.trim().startsWith("Lezione "));
    return {
      createPath: bounds(document.querySelector('button[aria-label="Crea un nuovo percorso di studio"]')),
      continue: bounds(continueButton),
      courseActions: bounds(document.querySelector('button[aria-label="Azioni corso"]')),
      progressText: progressPosition?.textContent?.trim() ?? null,
      progressPercent: progressPosition?.parentElement?.querySelector("p:last-of-type")?.textContent?.trim() ?? null,
    };
  });
  assert.ok(studioMetrics.createPath, `${viewport.name}: CTA Crea nuovo percorso non trovata`);
  assert.ok(studioMetrics.continue, `${viewport.name}: CTA Continua non trovata`);
  if (enforcePrompt7) {
    assert.match(studioMetrics.createPath.className, /bg-sheet/,
      `${viewport.name}: «Crea nuovo percorso» non usa lo stile outline`);
    assert.doesNotMatch(studioMetrics.createPath.className, /bg-primary/,
      `${viewport.name}: «Crea nuovo percorso» appare ancora come CTA primaria piena`);
    assert.equal(studioMetrics.courseActions?.width, 44,
      `${viewport.name}: «Azioni corso» non misura 44px di larghezza`);
    assert.equal(studioMetrics.courseActions?.height, 44,
      `${viewport.name}: «Azioni corso» non misura 44px di altezza`);
    assert.equal(studioMetrics.progressText, "Lezione 2 di 8",
      `${viewport.name}: posizione del corso incoerente in Studio`);
    const homeProgress = report.viewports.find(
      (entry) => entry.view === "home" && entry.width === viewport.width,
    );
    assert.ok(homeProgress, `${viewport.name}: avanzamento Home non rilevato`);
    assert.equal(homeProgress.coursePositionText, studioMetrics.progressText,
      `${viewport.name}: Home e Studio mostrano posizioni diverse per lo stesso corso`);
    assert.equal(homeProgress.courseProgressPercent, studioMetrics.progressPercent,
      `${viewport.name}: Home e Studio mostrano percentuali diverse per lo stesso corso`);
    assert.ok(studioMetrics.continue.y >= 0 && studioMetrics.continue.y + studioMetrics.continue.height <= viewport.height,
      `${viewport.name}: «Continua» non è visibile above the fold`);
  }
  const studioWidths = await assertNoHorizontalOverflow(studioPage, `${viewport.name} Studio prompt 7`);
  const studioScreenshot = `studio-${viewport.width}x${viewport.height}.png`;
  await studioPage.screenshot({ path: path.join(outputDir, studioScreenshot), fullPage: false });
  await studioPage.close();
  report.prompt7Captures.push({
    view: "studio",
    viewport: viewport.name,
    width: viewport.width,
    height: viewport.height,
    screenshot: studioScreenshot,
    ...studioMetrics,
    ...studioWidths,
  });

  const lessonPage = await newIsolatedPage(viewport);
  await openFixture(lessonPage, "lesson");
  await lessonPage.waitForSelector('[role="dialog"][aria-label*="Velocità media e istantanea"]', {
    visible: true,
    timeout: 15_000,
  });
  const lessonMetrics = await lessonPage.evaluate(() => {
    const bounds = (element) => {
      if (!element) return null;
      const rect = element.getBoundingClientRect();
      return {
        x: Math.round(rect.x),
        y: Math.round(rect.y),
        width: Math.round(rect.width),
        height: Math.round(rect.height),
      };
    };
    const reader = document.querySelector(".lesson-reader");
    const buttons = [...(reader?.querySelectorAll("button") ?? [])];
    const continueButton = buttons.find((button) => button.textContent?.trim().startsWith("Continua"));
    const assistantButton = reader?.querySelector('button[aria-label="Spiegami meglio questa slide"]');
    return {
      assistantText: assistantButton?.textContent?.trim() ?? null,
      assistantAriaLabel: assistantButton?.getAttribute("aria-label") ?? null,
      assistant: bounds(assistantButton),
      contentColumn: bounds(reader?.querySelector(".lesson-paper > div")),
      bottomColumn: bounds(reader?.querySelector(".safe-area-bottom > div")),
      continue: bounds(continueButton),
    };
  });
  assert.equal(lessonMetrics.assistantAriaLabel, "Spiegami meglio questa slide",
    `${viewport.name}: etichetta accessibile di Spiegami è cambiata`);
  assert.ok(lessonMetrics.continue, `${viewport.name}: pulsante Continua del lettore non trovato`);
  if (enforcePrompt7) {
    assert.equal(lessonMetrics.assistantText, "Spiegami",
      `${viewport.name}: etichetta visibile «Spiegami» non trovata`);
    assert.ok(lessonMetrics.contentColumn.width <= 720,
      `${viewport.name}: la colonna del contenuto supera 720px`);
    assert.ok(lessonMetrics.bottomColumn.width <= 720,
      `${viewport.name}: la colonna inferiore supera 720px`);
    assert.equal(lessonMetrics.continue.width, lessonMetrics.bottomColumn.width,
      `${viewport.name}: «Continua» non riempie la colonna inferiore`);
    assert.ok(Math.abs(lessonMetrics.contentColumn.x + lessonMetrics.contentColumn.width / 2 - viewport.width / 2) <= 1,
      `${viewport.name}: il contenuto non è centrato`);
    assert.ok(Math.abs(lessonMetrics.bottomColumn.x + lessonMetrics.bottomColumn.width / 2 - viewport.width / 2) <= 1,
      `${viewport.name}: la barra inferiore non è centrata`);
  }
  const lessonWidths = await assertNoHorizontalOverflow(lessonPage, `${viewport.name} lezione prompt 7`);
  const lessonScreenshot = `lesson-${viewport.width}x${viewport.height}.png`;
  await lessonPage.screenshot({ path: path.join(outputDir, lessonScreenshot), fullPage: false });
  await lessonPage.close();
  report.prompt7Captures.push({
    view: "lesson",
    viewport: viewport.name,
    width: viewport.width,
    height: viewport.height,
    screenshot: lessonScreenshot,
    ...lessonMetrics,
    ...lessonWidths,
  });
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
  }
  for (const viewport of studioViewports) {
    report.viewports.push(await inspectStudio(viewport));
  }
  for (const viewport of prompt7Viewports) {
    await inspectPrompt7(viewport);
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
