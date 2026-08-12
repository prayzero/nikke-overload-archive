const siteUrl = new URL(process.argv[2] ?? "");
const pause = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

let lastError;

for (let attempt = 1; attempt <= 10; attempt += 1) {
  try {
    const pageResponse = await fetch(siteUrl, { cache: "no-store", redirect: "follow" });
    if (!pageResponse.ok) throw new Error(`HTML returned ${pageResponse.status}`);

    const html = await pageResponse.text();
    const assetUrls = [...html.matchAll(/(?:href|src)="([^"]+\/_next\/[^"]+\.(?:css|js))"/g)]
      .map((match) => new URL(match[1], siteUrl));

    if (assetUrls.length < 2) throw new Error("CSS/JavaScript asset URLs were not found");

    let sawCss = false;
    let sawJavaScript = false;

    for (const assetUrl of assetUrls) {
      const response = await fetch(assetUrl, { cache: "no-store", redirect: "follow" });
      if (!response.ok) throw new Error(`${assetUrl.pathname} returned ${response.status}`);

      const contentType = response.headers.get("content-type") ?? "";
      if (assetUrl.pathname.endsWith(".css")) {
        sawCss = true;
        if (!contentType.includes("text/css")) throw new Error(`${assetUrl.pathname} is not CSS`);
      }
      if (assetUrl.pathname.endsWith(".js")) {
        sawJavaScript = true;
        if (!/javascript|ecmascript/.test(contentType)) throw new Error(`${assetUrl.pathname} is not JavaScript`);
      }
    }

    if (!sawCss || !sawJavaScript) throw new Error("Both CSS and JavaScript assets are required");
    console.log(`Live smoke test passed: ${siteUrl} (${assetUrls.length} assets)`);
    process.exit(0);
  } catch (error) {
    lastError = error;
    console.warn(`Smoke test attempt ${attempt}/10 failed: ${error.message}`);
    if (attempt < 10) await pause(8000);
  }
}

throw lastError;
