// ==UserScript==
// @name         Google Maps 门店导出 JSON
// @namespace    https://cursor.local/maps-export
// @version      1.2.0
// @description  在 Google Maps 门店详情页提取地址等信息，下载为「店名+地址.json」
// @author       You
// @match        *://www.google.com/maps/*
// @match        *://www.google.com/maps?*
// @match        *://google.com/maps/*
// @match        *://maps.google.com/*
// @match        *://*.google.com/maps/*
// @match        *://*.google.com.hk/maps/*
// @include      /^https?:\/\/(www\.)?google\.(com|com\.hk)\/maps\//
// @grant        none
// @run-at       document-end
// ==/UserScript==

(function () {
  "use strict";

  const BTN_ID = "gm-json-export-btn";
  const DEBUG_BTN_ID = "gm-json-debug-btn";

  function text(el) {
    return (el && el.textContent ? el.textContent : "").trim();
  }

  function getPlaceName() {
    const selectors = [
      "h1.DUwDvf",
      "h1.fontHeadlineLarge",
      'h1[class*="fontHeadline"]',
      '[data-attrid="title"] h1',
      "h1",
    ];
    for (const sel of selectors) {
      const el = document.querySelector(sel);
      const value = text(el);
      if (value && value.length < 200) return value;
    }
    return "";
  }

  function getFromDataItem(itemId) {
    const buttons = document.querySelectorAll(
      `button[data-item-id="${itemId}"], button[data-item-id^="${itemId}:"], ` +
        `[data-item-id="${itemId}"], [data-item-id^="${itemId}:"]`
    );
    for (const btn of buttons) {
      const label = btn.getAttribute("aria-label") || "";
      const cleaned = label.replace(/^[^:]+:\s*/, "").trim();
      if (cleaned) return cleaned;

      const inner = btn.querySelector(
        '[aria-hidden="true"], .fontBodyMedium, .Io6YTe, div[class*="fontBody"]'
      );
      const innerText = text(inner);
      if (innerText) return innerText;
      const btnText = text(btn);
      if (btnText) return btnText;
    }
    return "";
  }

  function getAddressFallback() {
    const address = getFromDataItem("address");
    if (address) return address;

    const ariaEls = document.querySelectorAll("[aria-label]");
    for (const el of ariaEls) {
      const label = el.getAttribute("aria-label") || "";
      if (/^(地址|Address)[:：]/i.test(label)) {
        return label.replace(/^(地址|Address)[:：]\s*/i, "").trim();
      }
    }

    const io6 = document.querySelector(".Io6YTe.fontBodyMedium");
    if (io6) return text(io6);

    return "";
  }

  function getRating() {
    const aria = document.querySelector(
      'span[aria-label*="star"], span[aria-label*="星"], span[aria-label*="评分"]'
    );
    if (aria) {
      const m = (aria.getAttribute("aria-label") || "").match(/[\d.]+/);
      if (m) return m[0];
    }
    const num = document.querySelector("div.F7nice span[aria-hidden='true']");
    return text(num);
  }

  function getSearchQuery() {
    const placeMatch = location.pathname.match(/\/maps\/place\/([^/@]+)/);
    if (placeMatch) {
      return decodeURIComponent(placeMatch[1].replace(/\+/g, " "));
    }
    const searchMatch = location.pathname.match(/\/maps\/search\/([^/@]+)/);
    if (searchMatch) {
      return decodeURIComponent(searchMatch[1].replace(/\+/g, " "));
    }
    const q = new URLSearchParams(location.search).get("q");
    return q ? decodeURIComponent(q.replace(/\+/g, " ")) : "";
  }

  function extractPlaceData() {
    const name = getPlaceName();
    const address = getAddressFallback();
    const phone = getFromDataItem("phone");
    const website = getFromDataItem("authority") || getFromDataItem("website");

    return {
      name,
      address,
      phone,
      rating: getRating(),
      website,
      maps_url: location.href.split("&utm_")[0],
      search_query: getSearchQuery(),
      page_title: document.title,
      page_host: location.hostname,
      scraped_at: new Date().toISOString(),
    };
  }

  function collectDiagnostics() {
    const h1s = [...document.querySelectorAll("h1")].slice(0, 5).map((el) => ({
      class: el.className,
      text: text(el).slice(0, 100),
    }));
    const addressNodes = [...document.querySelectorAll("[data-item-id]")]
      .filter((el) => (el.getAttribute("data-item-id") || "").includes("address"))
      .slice(0, 5)
      .map((el) => ({
        tag: el.tagName,
        dataItemId: el.getAttribute("data-item-id"),
        ariaLabel: el.getAttribute("aria-label"),
        text: text(el).slice(0, 120),
      }));

    return {
      url: location.href,
      hostname: location.hostname,
      pathname: location.pathname,
      title: document.title,
      scriptLoaded: true,
      exportButtonVisible: !!document.getElementById(BTN_ID),
      extracted: extractPlaceData(),
      h1Elements: h1s,
      addressElements: addressNodes,
    };
  }

  function sanitizePart(value, maxLen) {
    return String(value || "")
      .replace(/[\\/:*?"<>|]/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, maxLen);
  }

  function buildFilename(name, address) {
    const n = sanitizePart(name, 60) || "未命名门店";
    const a = sanitizePart(address, 100) || "无地址";
    return `${n}+${a}.json`;
  }

  function downloadJson(data) {
    const filename = buildFilename(data.name, data.address);
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    return filename;
  }

  function downloadDiagnostics() {
    const diag = collectDiagnostics();
    const blob = new Blob([JSON.stringify(diag, null, 2)], {
      type: "application/json;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "maps-debug-诊断信息.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    console.log("[Maps导出] 诊断信息", diag);
    showToast("已下载 maps-debug-诊断信息.json，请发给开发者");
  }

  function showToast(message, isError) {
    let toast = document.getElementById("gm-json-export-toast");
    if (!toast) {
      toast = document.createElement("div");
      toast.id = "gm-json-export-toast";
      toast.style.cssText = [
        "position:fixed",
        "bottom:120px",
        "right:24px",
        "z-index:2147483647",
        "padding:12px 16px",
        "border-radius:8px",
        "color:#fff",
        "font:14px/1.4 Arial,sans-serif",
        "box-shadow:0 4px 12px rgba(0,0,0,.25)",
        "max-width:360px",
        "white-space:pre-wrap",
      ].join(";");
      document.body.appendChild(toast);
    }
    toast.style.background = isError ? "#c5221f" : "#1e8e3e";
    toast.textContent = message;
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => toast.remove(), 5000);
  }

  function onExportClick() {
    const data = extractPlaceData();
    if (!data.name) {
      showToast(
        "未检测到店名\n请确认 URL 含 /maps/place/\n并已进入门店详情页",
        true
      );
      return;
    }
    if (!data.address) {
      showToast(
        "未检测到地址\n请点击「诊断」下载调试文件发给我",
        true
      );
      return;
    }
    const filename = downloadJson(data);
    showToast(`已下载：${filename}`);
  }

  function createFixedButton(id, label, bottom, color, handler) {
    if (document.getElementById(id)) return;
    const btn = document.createElement("button");
    btn.id = id;
    btn.type = "button";
    btn.textContent = label;
    btn.style.cssText = [
      "position:fixed",
      `bottom:${bottom}px`,
      "right:24px",
      "z-index:2147483647",
      "padding:12px 18px",
      "border:none",
      "border-radius:24px",
      `background:${color}`,
      "color:#fff",
      "font:600 14px Arial,sans-serif",
      "cursor:pointer",
      "box-shadow:0 4px 12px rgba(0,0,0,.25)",
    ].join(";");
    btn.addEventListener("click", handler);
    document.body.appendChild(btn);
  }

  function ensureButtons() {
    createFixedButton(BTN_ID, "导出 JSON", 24, "#1a73e8", onExportClick);
    createFixedButton(DEBUG_BTN_ID, "诊断", 76, "#5f6368", downloadDiagnostics);
  }

  ensureButtons();
  window.__gmExportDiag = collectDiagnostics;
  console.log("[Maps导出] 脚本已加载", location.href);

  const observer = new MutationObserver(() => ensureButtons());
  observer.observe(document.body, { childList: true, subtree: true });
})();
