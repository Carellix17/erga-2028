import assert from "node:assert/strict";
import path from "node:path";

/** Browser-only regression checks for the app refinement; all data is local demo data. */
export async function inspectInterface({ browser, baseUrl, outputDir, report, fontStyles }) {
  report.interfaceCaptures = [];
  report.interfaceFindings = [];
  const sizes = [
    { width: 375, height: 812, isMobile: true },
    { width: 390, height: 844, isMobile: true },
    { width: 768, height: 1024, isMobile: false },
    { width: 1024, height: 768, isMobile: false },
    { width: 1440, height: 900, isMobile: false },
  ];
  const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const verify = (condition, message, context) => {
    if (!condition) report.interfaceFindings.push({ ...context, message });
  };
  const byLabel = (page, name) => page.$(`button[aria-label=${JSON.stringify(name)}]`);

  const metrics = (page) => page.evaluate(() => {
    const rect = (node) => {
      const bounds = node.getBoundingClientRect();
      return { x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height, right: bounds.right, bottom: bounds.bottom };
    };
    const visible = (node) => {
      const bounds = node.getBoundingClientRect();
      const style = getComputedStyle(node);
      return bounds.width > 0 && bounds.height > 0 && style.visibility !== "hidden" && Number(style.opacity) > 0.98;
    };
    const controls = [...document.querySelectorAll("button,select,textarea,a[href]")].filter(visible);
    const clipped = controls.filter((node) => {
      const bounds = node.getBoundingClientRect();
      return !node.closest(".planner-deadlines") && (bounds.x < -1 || bounds.right > window.innerWidth + 1);
    }).map((node) => ({ name: node.getAttribute("aria-label") || node.textContent?.trim().slice(0, 70), ...rect(node) }));
    const croppedText = controls.filter((node) => node.scrollWidth > node.clientWidth + 2 || node.scrollHeight > node.clientHeight + 2).map((node) => ({ name: node.getAttribute("aria-label") || node.textContent?.trim().slice(0, 70), ...rect(node) }));
    const small = controls.filter((node) => node.getBoundingClientRect().height < 43).map((node) => ({ name: node.getAttribute("aria-label") || node.textContent?.trim().slice(0, 70), ...rect(node) }));
    const navs = [...document.querySelectorAll("nav")].filter(visible).map(rect);
    return {
      width: window.innerWidth, height: window.innerHeight,
      documentWidth: document.documentElement.scrollWidth, bodyWidth: document.body.scrollWidth,
      clipped, croppedText, small, navs,
      fonts: ["Ubuntu Sans", "Ubuntu Sans Mono", "Instrument Serif"].map((family) => ({ family, loaded: document.fonts.check(`400 16px "${family}"`) })),
    };
  });

  for (const viewport of sizes) {
    const page = await browser.newPage();
    await page.setViewport({ ...viewport, deviceScaleFactor: 1, hasTouch: viewport.isMobile });
    await page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "reduce" }]);
    await page.setRequestInterception(true);
    page.on("request", (request) => {
      const url = request.url();
      if (url.startsWith(`${baseUrl}/`) && url.endsWith("/functions/v1/lesson-chat")) {
        const body = `data: ${JSON.stringify({ choices: [{ delta: { content: "Esempio dimostrativo: la velocità media mette in relazione spazio e tempo." } }] })}\n\ndata: [DONE]\n\n`;
        void request.respond({ status: 200, contentType: "text/event-stream", body }).catch(() => {});
      } else if (url.startsWith(baseUrl) || /^(data|blob|about):/.test(url)) {
        void request.continue().catch(() => {});
      } else {
        report.blockedExternalRequests.push(url);
        void request.abort("blockedbyclient").catch(() => {});
      }
    });
    page.on("pageerror", (error) => report.pageErrors.push(`${viewport.width}: ${error.message}`));
    await page.evaluateOnNewDocument(() => {
      window.__hapticTrace = [];
      Object.defineProperty(navigator, "vibrate", { configurable: true, value: (pattern) => { window.__hapticTrace.push(pattern); return true; } });
    });

    const open = async (view, theme = "light") => {
      await page.goto(`${baseUrl}/visual-preview.html?view=${view}`, { waitUntil: "domcontentloaded" });
      await page.waitForFunction(() => document.documentElement.dataset.visualReady === "true");
      await page.evaluate((dark) => document.documentElement.classList.toggle("dark", dark), theme === "dark");
      if (fontStyles) {
        await page.addStyleTag({ content: fontStyles });
        await page.evaluate(async () => {
          await Promise.all([document.fonts.load('400 16px "Ubuntu Sans"'), document.fonts.load('600 16px "Ubuntu Sans"'), document.fonts.load('400 16px "Instrument Serif"'), document.fonts.load('400 16px "Ubuntu Sans Mono"')]);
          await document.fonts.ready;
        });
      }
      await pause(200);
    };
    const capture = async (view, theme = "light", screenshot = true) => {
      const context = { view, theme, viewport: `${viewport.width}x${viewport.height}` };
      const result = await metrics(page);
      verify(result.documentWidth <= result.width + 1 && result.bodyWidth <= result.width + 1, "Horizontal document overflow", context);
      verify(result.clipped.length === 0, `Clipped controls: ${JSON.stringify(result.clipped)}`, context);
      verify(result.croppedText.length === 0, `Text clipped within controls: ${JSON.stringify(result.croppedText)}`, context);
      verify(result.small.length === 0, `Controls shorter than 44px: ${JSON.stringify(result.small)}`, context);
      const filename = `${view}-${viewport.width}-${theme}.png`;
      if (screenshot) await page.screenshot({ path: path.join(outputDir, filename), fullPage: false });
      report.interfaceCaptures.push({ ...context, ...result, screenshot: screenshot ? filename : null });
    };

    await open("home");
    await capture("home");
    const navMetrics = await metrics(page);
    verify(navMetrics.navs.length === 1, "Expected one visible app navigation", { view: "home", width: viewport.width });
    if (viewport.isMobile) {
      const nav = navMetrics.navs[0];
      verify(nav.x === 0 && Math.abs(nav.right - viewport.width) <= 1 && Math.abs(nav.bottom - viewport.height) <= 1, "Mobile navigation is detached from the viewport edge", { view: "home", width: viewport.width });
    }

    await open("piano");
    const calendarVisible = await page.$eval('.planner-month-grid', (node) => node.getBoundingClientRect().height > 0);
    verify(calendarVisible, "Month calendar hidden at first load", { view: "piano", width: viewport.width });
    const deadlines = await page.$eval('.planner-deadlines', (node) => {
      const list = node.getBoundingClientRect();
      const cards = [...node.querySelectorAll('button')].map((card) => card.getBoundingClientRect());
      return { visible: cards.filter((card) => card.left >= list.left - 1 && card.right <= list.right + 1).length, count: cards.length };
    });
    verify(deadlines.visible === (viewport.width < 640 ? 3 : viewport.width < 1024 ? 4 : viewport.width < 1280 ? 5 : 6), `Wrong number of visible deadlines: ${JSON.stringify(deadlines)}`, { view: "piano", width: viewport.width });
    verify(deadlines.count === 8, "Missing imminent test cards", { view: "piano", width: viewport.width });
    const actionsBelow = await page.evaluate(() => document.querySelector('.planner-actions').getBoundingClientRect().top >= document.querySelector('.planner-month-grid').getBoundingClientRect().bottom);
    const actionColors = await page.$$eval('.planner-actions button', (buttons) => buttons.map((button) => ({ background: getComputedStyle(button).backgroundColor, color: getComputedStyle(button).color })));
    verify(actionColors[0].background !== actionColors[1].background, "Planner actions use the same color", { view: "piano", width: viewport.width });
    verify(actionsBelow, "Planner actions are not below the calendar", { view: "piano", width: viewport.width });
    await capture("piano");
    await (await byLabel(page, "Altre scadenze")).click();
    await pause(220);
    verify(await page.$eval('.planner-deadlines', (node) => node.scrollLeft > 0), "Deadline arrows fail to scroll", { view: "piano", width: viewport.width });
    await capture("piano-scadenze");
    await page.$eval('.planner-month-grid', (node) => node.scrollIntoView({ block: "center" }));
    await capture("piano-calendar");
    await page.click('button[aria-current="date"]');
    await page.waitForSelector('.planner-timeline');
    const fullDay = await page.evaluate(() => ["Ripasso: il moto rettilineo", "Ripasso delle formule", "Allenamento di pallavolo", "Consegna ricerca di storia", "Interrogazione sul moto"].every((title) => document.body.textContent.includes(title)));
    verify(fullDay, "Daily schedule omits a study session, exam or personal event", { view: "piano-day", width: viewport.width });
    const firstHourVisible = await page.$eval('.planner-timeline', (node) => Math.abs(node.querySelector('[data-hour="9"]').getBoundingClientRect().top - node.getBoundingClientRect().top - node.clientTop) < 2);
    verify(firstHourVisible, "Daily schedule does not begin at the first saved event", { view: "piano-day", width: viewport.width });
    await capture("piano-day");
    await page.$eval('.planner-timeline', (node) => { node.scrollTop += node.querySelector('[data-hour="15"]').getBoundingClientRect().top - node.getBoundingClientRect().top - node.clientTop; });
    await capture("piano-day-study");
    await (await byLabel(page, "Giorno successivo")).click();
    const tomorrow = await page.evaluate(() => document.body.textContent.includes("Verifica sui Promessi sposi") && !document.body.textContent.includes("Allenamento di pallavolo"));
    verify(tomorrow, "Daily next-day navigation is inconsistent", { view: "piano-day", width: viewport.width });
    await page.evaluate(() => [...document.querySelectorAll('button')].find((node) => node.textContent.includes('Torna al calendario')).click());
    await page.waitForSelector('.planner-month-grid');
    const restoredFocus = await page.evaluate(() => document.activeElement?.getAttribute('aria-current') === 'date');
    verify(restoredFocus, "Returning from the day loses the selected calendar button", { view: "piano-day", width: viewport.width });
    await page.evaluate(() => [...document.querySelectorAll('button')].find((node) => node.textContent.includes('Sessione giornaliera')).click());
    await page.waitForSelector('.planner-timeline');
    await page.evaluate(() => [...document.querySelectorAll('button')].find((node) => node.textContent.includes('Torna al calendario')).click());

    await open("studio");
    await page.waitForSelector('button[aria-label="Crea un nuovo percorso di studio"]', { visible: true });
    await capture("studio");
    if (viewport.width < 1280) {
      const materials = await page.$('button[aria-controls="study-material-controls"]');
      await materials.click();
      await pause(80);
      const expanded = await page.$eval("#study-material-controls", (node) => node.getBoundingClientRect().height > 0);
      verify(expanded, "Materials disclosure fails to open", { view: "studio", width: viewport.width });
      const menuComplete = await page.evaluate(() => ["Carica PDF", "Carica foto", "Ricerca web"].every((label) => [...document.querySelectorAll("#study-material-controls button")].some((node) => node.textContent.includes(label) && Number(getComputedStyle(node).opacity) > 0.98)));
      verify(menuComplete, "Some upload options are hidden", { view: "studio-materials", width: viewport.width });
      await capture("studio-materials");
      await materials.click();
    }
    const create = await byLabel(page, "Crea un nuovo percorso di studio");
    await create.click();
    await pause(120);
    const dialog = await page.$('[role="dialog"][data-state="open"]');
    if (viewport.isMobile) {
      verify(!!dialog, "Create path should open the mobile upload sheet", { view: "upload", width: viewport.width });
      if (dialog) {
        const optionsFit = await dialog.evaluate((node) => {
          const frame = node.getBoundingClientRect();
          return ["Carica PDF", "Carica foto", "Ricerca web"].every((label) => [...node.querySelectorAll("button")].some((button) => {
            const bounds = button.getBoundingClientRect();
            return button.textContent.includes(label) && Number(getComputedStyle(button).opacity) > 0.98 && bounds.top >= frame.top && bounds.bottom <= frame.bottom + 1;
          }));
        });
        verify(optionsFit, "Mobile upload options do not all fit in the sheet", { view: "upload", width: viewport.width });
        await capture("studio-upload");
        await page.keyboard.press("Escape");
      }
    } else verify(!dialog, "Tablet/desktop upload unexpectedly opens a modal", { view: "upload", width: viewport.width });

    await open("lesson");
    await page.waitForSelector('[role="dialog"][aria-label*="Velocità"]', { visible: true });
    await capture("lesson");
    const aligned = await page.evaluate(() => {
      const text = document.querySelector(".lesson-paper > div").getBoundingClientRect();
      const footer = document.querySelector(".safe-area-bottom > div").getBoundingClientRect();
      return Math.abs(text.x - footer.x) <= 1 && Math.abs(text.width - footer.width) <= 1;
    });
    verify(aligned, "Reader text/footer columns do not align", { view: "lesson", width: viewport.width });
    for (let index = 0; index < 6; index += 1) await page.keyboard.press("Tab");
    const trapped = await page.evaluate(() => document.querySelector(".lesson-reader").contains(document.activeElement));
    verify(trapped, "Focus leaves the lesson dialog", { view: "lesson", width: viewport.width });
    const help = await byLabel(page, "Spiegami meglio questa slide");
    await help.click();
    await page.waitForSelector('textarea[aria-label]', { visible: true });
    await pause(160);
    await capture("lesson-tutor");
    await page.keyboard.press("Escape");
    await pause(80);
    const readerStays = await page.$('.lesson-reader');
    verify(!!readerStays, "Closing tutor also closes the lesson", { view: "lesson", width: viewport.width });
    await page.keyboard.press("Escape");
    await pause(80);
    const readerClosed = await page.$('.lesson-reader');
    verify(!readerClosed, "Escape does not close the lesson", { view: "lesson", width: viewport.width });

    if ([390, 768, 1024].includes(viewport.width)) {
      for (const view of ["home", "piano", "studio", "lesson"]) {
        await open(view, "dark");
        await capture(view, "dark");
        if (view === "piano") {
          await page.evaluate(() => [...document.querySelectorAll('button')].find((node) => node.textContent.includes('Sessione giornaliera')).click());
          await page.waitForSelector('.planner-timeline');
          await capture("piano-day", "dark");
        }
      }
      await open("home");
      await page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "no-preference" }]);
      await page.evaluate(() => document.querySelector('nav button[data-haptic="medium"]').click());
      await pause(220);
      const motion = await page.evaluate(() => ({
        duration: document.querySelector(".app-nav-indicator") ? getComputedStyle(document.querySelector(".app-nav-indicator")).transitionDuration : null,
        haptics: window.__hapticTrace,
      }));
      verify(motion.haptics.length === 1 && motion.haptics[0] === 36, `Navigation haptic missing or duplicated: ${JSON.stringify(motion.haptics)}`, { view: "motion", width: viewport.width });
      report.interfaceCaptures.push({ view: "motion", width: viewport.width, ...motion });
      await open("piano");
      await page.click('button[data-plan-opener="daily"]');
      const plannerMotion = await page.$eval('.planner-view-enter', (node) => getComputedStyle(node).animationDuration);
      verify(plannerMotion === "0.18s", `Unexpected planner transition duration: ${plannerMotion}`, { view: "planner-motion", width: viewport.width });
      await page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "reduce" }]);
      const plannerReduced = await page.$eval('.planner-view-enter', (node) => getComputedStyle(node).animationName);
      verify(plannerReduced === "none", "Planner ignores reduced motion", { view: "planner-motion", width: viewport.width });
      report.interfaceCaptures.push({ view: "planner-motion", width: viewport.width, duration: plannerMotion, reduced: plannerReduced });
    }
    await page.close();
  }
  assert.deepEqual(report.pageErrors, [], "JavaScript errors in responsive verification");
  assert.deepEqual(report.blockedExternalRequests, [], "Unexpected external requests in isolated verification");
  assert.deepEqual(report.interfaceFindings, [], "Responsive findings require a repair pass");
}
