// REPLACE your whole Apps Script with this file.
// Project Settings > Script Properties: add APP_PASSWORD (your login) and GEMINI_API_KEY.
var OT = "Aswin's OT Sheet", ESC = "Catering Escort Log", DAYS = 90;

function doGet() { return respond_({status: "ok"}); }

function doPost(e) {
  var d;
  try { d = JSON.parse(e.postData.contents); } catch (x) { return respond_({error: "bad request"}); }
  var type = String(d.type || "").toLowerCase();
  try {
    if (type === "ot" || type === "escort") return locked_(function () { return write_(type, d); }); // iOS shortcuts
    if (type === "login") return login_(d);
    if (!valid_(d.token)) return respond_({error: "auth"});
    if (type === "logout") { drop_(d.token); return respond_({ok: 1}); }
    if (type === "data") return respond_({ot: rows_(OT), esc: rows_(ESC)});
    if (type === "chat") return chat_(d);
    return locked_(function () {
      if (type === "add") return write_(d.sheet, d.f);
      if (type === "update") return update_(d);
      if (type === "delete") return del_(d);
      return respond_({error: "unknown request"});
    });
  } catch (err) { return respond_({error: String(err)}); }
}

function locked_(fn) {
  var l = LockService.getScriptLock(); l.waitLock(10000);
  try { return fn(); } finally { l.releaseLock(); }
}
function sheet_(k) { return SpreadsheetApp.getActiveSpreadsheet().getSheetByName(k === "ot" ? OT : ESC); }

function rowFor_(kind, f, sno) {
  if (kind === "ot") {
    var s = mins_(f.shiftStart), x = mins_(f.extendedTill), w = x - s;
    if (w < 0) w += 1440;
    var ot = Math.max(0, w - 510);
    return [sno, f.date, f.shift, fmt_(s) + " - " + fmt_(s + 510), fmt_(s) + " - " + fmt_(x),
            Math.floor(ot / 60) + "H" + (ot % 60) + "M", f.incharge, f.remarks || ""];
  }
  return [sno, f.date, f.shift, String(f.flight || "").toUpperCase(), f.incharge, f.remarks || ""];
}
function write_(kind, f) {
  var sh = sheet_(kind), v = rowFor_(kind, f, sh.getLastRow());
  sh.appendRow(v); sh.getRange(sh.getLastRow(), 2).setNumberFormat("dd-MMM-yyyy");
  return respond_({status: "success"});
}
function update_(d) {
  var sh = sheet_(d.sheet), r = +d.row;
  if (r < 2 || r > sh.getLastRow()) throw new Error("Row not found");
  var v = rowFor_(d.sheet, d.f, r - 1);
  sh.getRange(r, 1, 1, v.length).setValues([v]); sh.getRange(r, 2).setNumberFormat("dd-MMM-yyyy");
  return respond_({ok: 1});
}
function del_(d) {
  var sh = sheet_(d.sheet), r = +d.row;
  if (r < 2 || r > sh.getLastRow()) throw new Error("Row not found");
  sh.deleteRow(r);
  var n = sh.getLastRow() - 1;
  if (n > 0) { var s = []; for (var i = 1; i <= n; i++) s.push([i]); sh.getRange(2, 1, n, 1).setValues(s); }
  return respond_({ok: 1});
}
function rows_(name) {
  var out = [], v = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name).getDataRange().getDisplayValues();
  for (var i = 1; i < v.length; i++) if (v[i][1]) out.push({row: i + 1, v: v[i]});
  return out;
}

// ---- auth: password -> long-lived token, kept until you sign out ----
function tokens_() {
  var p = PropertiesService.getScriptProperties(), t = JSON.parse(p.getProperty("TOKENS") || "{}"), now = Date.now(), c = false;
  for (var k in t) if (t[k] < now) { delete t[k]; c = true; }
  if (c) p.setProperty("TOKENS", JSON.stringify(t));
  return t;
}
function valid_(t) { return !!t && tokens_()[t] > Date.now(); }
function drop_(t) { var a = tokens_(); delete a[t]; PropertiesService.getScriptProperties().setProperty("TOKENS", JSON.stringify(a)); }
function login_(d) {
  var pw = PropertiesService.getScriptProperties().getProperty("APP_PASSWORD");
  if (!pw || String(d.password) !== pw) { Utilities.sleep(1500); return respond_({error: "Wrong password"}); }
  var a = tokens_(), t = Utilities.getUuid() + Utilities.getUuid();
  a[t] = Date.now() + DAYS * 864e5;
  PropertiesService.getScriptProperties().setProperty("TOKENS", JSON.stringify(a));
  return respond_({token: t});
}

// ---- Gemini chat (key never leaves Google) ----
function chat_(d) {
  var key = PropertiesService.getScriptProperties().getProperty("GEMINI_API_KEY");
  var contents = d.messages.map(function (m) {
    return {role: m.role === "assistant" ? "model" : "user", parts: [{text: m.content}]};
  });
  var res = UrlFetchApp.fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
    {method: "post", contentType: "application/json", muteHttpExceptions: true,
     headers: {"x-goog-api-key": key}, payload: JSON.stringify({contents: contents})});
  var j = JSON.parse(res.getContentText());
  if (j.error) return respond_({error: j.error.message});
  return respond_({text: j.candidates[0].content.parts[0].text});
}

function mins_(t) {
  var s = String(t).replace(/[^0-9]/g, ""); if (s.length === 3) s = "0" + s;
  if (s.length !== 4) throw new Error("Invalid time: " + t);
  var h = +s.substring(0, 2), m = +s.substring(2);
  if (h > 23 || m > 59) throw new Error("Invalid time: " + t);
  return h * 60 + m;
}
function fmt_(m) { m = ((m % 1440) + 1440) % 1440; var h = Math.floor(m / 60), n = m % 60; return (h < 10 ? "0" : "") + h + (n < 10 ? "0" : "") + n; }
function respond_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
