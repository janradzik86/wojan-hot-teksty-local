(function () {
var CATS = [
"reklamowe",
"motto",
"śmieszne",
"okazjonalne",
"cytaty",
"życzenia",
"do skandowania",
"hard-sell live CTA"
];
var FAV_KEY = "hot-teksty-favs-v1";
var RECENT_KEY = "hot-teksty-recent-v1";
var bank = [];
try {
bank = window.__HOT_BANK__.entries || [];
} catch (e) {
bank = [];
}
var catsEl = document.getElementById("cats");
var listEl = document.getElementById("list");
var customPanel = document.getElementById("custom-panel");
var toast = document.getElementById("toast");
var favOnlyBtn = document.getElementById("fav-only-btn");
var toastTimer = null;
var mode = { type: "cat", value: CATS[0], favOnly: false };
var viewItems = [];
function loadFavs() {
try {
var raw = localStorage.getItem(FAV_KEY);
var arr = raw ? JSON.parse(raw) : [];
return Array.isArray(arr) ? arr : [];
} catch (e) { return []; }
}
function saveFavs(arr) {
try { localStorage.setItem(FAV_KEY, JSON.stringify(arr)); } catch (e) {}
}
function isFav(key) {
return loadFavs().indexOf(key) >= 0;
}
function toggleFav(key) {
var favs = loadFavs();
var i = favs.indexOf(key);
if (i >= 0) favs.splice(i, 1);
else favs.push(key);
saveFavs(favs);
}
function pushRecent(key) {
try {
var arr = JSON.parse(localStorage.getItem(RECENT_KEY) || "[]");
if (!Array.isArray(arr)) arr = [];
arr = arr.filter(function (x) { return x !== key; });
arr.unshift(key);
localStorage.setItem(RECENT_KEY, JSON.stringify(arr.slice(0, 30)));
} catch (e) {}
}
function showToast(msg) {
toast.textContent = msg || "Skopiowano";
toast.classList.add("show");
clearTimeout(toastTimer);
toastTimer = setTimeout(function () { toast.classList.remove("show"); }, 1400);
}
function copyText(text) {
if (navigator.clipboard && navigator.clipboard.writeText) {
return navigator.clipboard.writeText(text);
}
return new Promise(function (resolve, reject) {
var ta = document.createElement("textarea");
ta.value = text;
ta.setAttribute("readonly", "");
ta.style.position = "fixed";
ta.style.left = "-9999px";
document.body.appendChild(ta);
ta.select();
try {
var ok = document.execCommand("copy");
document.body.removeChild(ta);
if (ok) resolve(); else reject(new Error("copy failed"));
} catch (err) {
document.body.removeChild(ta);
reject(err);
}
});
}
function norm(s) {
return String(s || "")
.toLowerCase()
.normalize("NFD")
.replace(/[\u0300-\u036f]/g, "")
.replace(/[^a-z0-9ąćęłńóśźż\s]/gi, " ")
.replace(/\s+/g, " ")
.trim();
}
function tokens(s) {
var stop = {
i:1, w:1, z:1, na:1, do:1, od:1, po:1, za:1, to:1, sie:1, się:1,
oraz:1, lub:1, jak:1, nie:1, the:1, a:1, o:1, u:1, ze:1, ku:1
};
return norm(s).split(" ").filter(function (t) {
return t.length >= 3 && !stop[t];
});
}
function placeholders() {
return {
imie: document.getElementById("ph-imie").value.trim(),
produkt: document.getElementById("ph-produkt").value.trim(),
cena: document.getElementById("ph-cena").value.trim(),
okazja: document.getElementById("ph-okazja").value.trim()
};
}
function fillTemplate(tpl, ph) {
var out = tpl;
var map = {
"{imie}": ph.imie,
"{produkt}": ph.produkt,
"{cena}": ph.cena,
"{okazja}": ph.okazja
};
var missing = false;
Object.keys(map).forEach(function (k) {
if (out.indexOf(k) >= 0) {
if (map[k]) out = out.split(k).join(map[k]);
else missing = true;
}
});
return { text: out, missing: missing };
}
function resolveEntry(e, ph) {
if (e.szablon) {
var f = fillTemplate(e.szablon, ph);
if (f.missing && mode.type === "cat") {
var hinted = e.szablon
.replace(/\{imie\}/g, ph.imie || "…")
.replace(/\{produkt\}/g, ph.produkt || "…")
.replace(/\{cena\}/g, ph.cena || "…")
.replace(/\{okazja\}/g, ph.okazja || "…");
return { key: e.id, kategoria: e.kategoria, text: hinted, rawId: e.id };
}
if (f.missing && mode.type === "custom") return null;
return { key: e.id + "::" + f.text, kategoria: e.kategoria, text: f.text, rawId: e.id };
}
return { key: e.id, kategoria: e.kategoria, text: e.tekst, rawId: e.id };
}
function scoreEntry(e, toks) {
if (!toks.length) return 0;
var hay = norm((e.tekst || e.szablon || "") + " " + (e.tagi || []).join(" ") + " " + e.kategoria);
var score = 0;
for (var i = 0; i < toks.length; i++) {
if (hay.indexOf(toks[i]) >= 0) score += 2;
(e.tagi || []).forEach(function (tg) {
if (norm(tg).indexOf(toks[i]) >= 0) score += 3;
});
}
return score;
}
function shuffle(arr) {
var a = arr.slice();
for (var i = a.length - 1; i > 0; i--) {
var j = Math.floor(Math.random() * (i + 1));
var t = a[i]; a[i] = a[j]; a[j] = t;
}
return a;
}
function buildView() {
var ph = placeholders();
var items = [];
if (mode.favOnly) {
var favs = loadFavs();
bank.forEach(function (e) {
var r = resolveEntry(e, ph);
if (!r) return;
if (favs.indexOf(r.key) >= 0 || favs.indexOf(e.id) >= 0) items.push(r);
});
viewItems = items;
return;
}
if (mode.type === "custom") {
var ctx = document.getElementById("ctx").value;
var toks = tokens(ctx);
var scored = [];
bank.forEach(function (e) {
var sc = scoreEntry(e, toks);
if (sc > 0 || !toks.length) {
var r = resolveEntry(e, ph);
if (r) scored.push({ sc: sc || 1, item: r });
}
});
scored.sort(function (a, b) { return b.sc - a.sc; });
items = scored.slice(0, 15).map(function (x) { return x.item; });
if (!items.length) {
var fb = bank.filter(function (e) {
return e.kategoria === "hard-sell live CTA" || e.kategoria === "motto";
});
shuffle(fb).slice(0, 3).forEach(function (e) {
var r = resolveEntry(e, ph);
if (r) items.push(r);
});
}
viewItems = items;
return;
}
bank.filter(function (e) { return e.kategoria === mode.value; })
.forEach(function (e) {
var r = resolveEntry(e, ph);
if (r) items.push(r);
});
viewItems = items;
}
function renderCats() {
var html = "";
CATS.forEach(function (c) {
var active = mode.type === "cat" && mode.value === c && !mode.favOnly ? " active" : "";
html += '<button type="button" data-cat="' + c.replace(/"/g, "") + '" class="' + active.trim() + '">' + c + "</button>";
});
var customActive = mode.type === "custom" && !mode.favOnly ? " active" : "";
html += '<button type="button" data-cat="__custom__" class="' + customActive.trim() + '">Własna</button>';
catsEl.innerHTML = html;
favOnlyBtn.className = mode.favOnly ? "active" : "ghost";
customPanel.className = mode.type === "custom" && !mode.favOnly ? "panel show" : "panel";
}
function escapeHtml(s) {
return String(s)
.replace(/&/g, "&")
.replace(/</g, "<")
.replace(/>/g, ">")
.replace(/"/g, """);
}
function renderList() {
if (!viewItems.length) {
var msg = mode.type === "custom"
? "Brak trafień. Dodaj słowa kluczowe / uzupełnij placeholdery albo wybierz kategorię."
: "Brak tekstów.";
listEl.innerHTML = '<div class="empty">' + msg + "</div>";
return;
}
var html = "";
viewItems.forEach(function (it, idx) {
var on = isFav(it.key) || isFav(it.rawId) ? " on" : "";
html +=
'<div class="item" data-idx="' + idx + '">' +
'<div class="body">' +
'<div class="kat">' + escapeHtml(it.kategoria) + "</div>" +
'<div class="txt">' + escapeHtml(it.text) + "</div>" +
"</div>" +
'<div class="ops">' +
'<button type="button" class="copy-btn" data-action="copy">Copy</button>' +
'<button type="button" class="fav' + on + '" data-action="fav" aria-label="Ulubione">★</button>' +
"</div>" +
"</div>";
});
listEl.innerHTML = html;
}
function refresh() {
buildView();
renderCats();
renderList();
}
catsEl.addEventListener("click", function (e) {
var btn = e.target.closest("[data-cat]");
if (!btn) return;
var v = btn.getAttribute("data-cat");
mode.favOnly = false;
if (v === "__custom__") {
mode.type = "custom";
mode.value = null;
} else {
mode.type = "cat";
mode.value = v;
}
refresh();
});
favOnlyBtn.addEventListener("click", function () {
mode.favOnly = !mode.favOnly;
refresh();
});
document.getElementById("run-custom").addEventListener("click", function () {
mode.type = "custom";
mode.favOnly = false;
refresh();
});
document.getElementById("shuffle-btn").addEventListener("click", function () {
viewItems = shuffle(viewItems);
renderList();
});
listEl.addEventListener("click", function (e) {
var btn = e.target.closest("[data-action]");
if (!btn) return;
var itemEl = btn.closest(".item");
if (!itemEl) return;
var idx = parseInt(itemEl.getAttribute("data-idx"), 10);
var it = viewItems[idx];
if (!it) return;
var action = btn.getAttribute("data-action");
if (action === "copy") {
copyText(it.text).then(function () {
showToast("Skopiowano");
pushRecent(it.key);
}).catch(function () {
alert("Nie udało się skopiować.");
});
} else if (action === "fav") {
toggleFav(it.key);
renderList();
}
});
["ph-imie", "ph-produkt", "ph-cena", "ph-okazja"].forEach(function (id) {
document.getElementById(id).addEventListener("change", function () {
if (mode.type === "custom" || mode.type === "cat") refresh();
});
});
refresh();
})();