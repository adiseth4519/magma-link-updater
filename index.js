require("dotenv").config();
const express = require("express");
const puppeteer = require("puppeteer");

const app = express();
const port = process.env.PORT || 3000;

app.get("/", (req, res) => {
  res.send("Use /update?name=YourName to change the Magma layer.");
});

app.get("/update", async (req, res) => {
  const name = req.query.name;
  if (!name) return res.status(400).send("Missing 'name' parameter");

  try {
    await updateMagmaLayer(name);
    res.send(`✅ Name updated to "${name}"`);
  } catch (err) {
    console.error("Error updating Magma:", err);
    res.status(500).send("❌ Failed to update Magma layer");
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

async function updateMagmaLayer(text) {
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  const page = await browser.newPage();

  await page.goto("https://app.magma.com/login", { waitUntil: "networkidle0" });

  await page.type('input[name="email"]', process.env.MAGMA_EMAIL);
  await page.type('input[name="password"]', process.env.MAGMA_PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForNavigation({ waitUntil: "networkidle0" });

  await page.goto(process.env.MAGMA_URL, { waitUntil: "networkidle0" });

  await page.waitForSelector('[data-testid="layer-list"]');

  const layerHandle = await page.$x(`//div[contains(@aria-label, "\${process.env.MAGMA_TEXT_LAYER_NAME}")]`);
  if (layerHandle.length === 0) throw new Error("Layer not found");
  await layerHandle[0].click();

  await page.waitForSelector('[contenteditable="true"]');
  await page.evaluate((text) => {
    const editable = document.querySelector('[contenteditable="true"]');
    editable.innerText = text;
    editable.dispatchEvent(new Event("input", { bubbles: true }));
  }, text);

  await page.keyboard.press("Enter");
  await browser.close();
}