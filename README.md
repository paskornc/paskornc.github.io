# บันทึกตัดอัดก้อนชีวมวล

เว็บที่ใช้งานจริง: **<https://paskornc.github.io/>** (repo: <https://github.com/paskornc/paskornc.github.io>)
แก้ไฟล์แล้ว `git push` ได้เลย GitHub Pages จะอัปเดตให้เอง

เว็บแอปหน้าเดียวสำหรับบันทึกงานภาคสนามของโครงการชีวมวล
บ้านหาดประชาสามัคคี หมู่ 8 ต.จางเหนือ อ.แม่เมาะ จ.ลำปาง
ข้อมูลเก็บใน **Google Sheets** ผ่าน Apps Script Web App

## ไฟล์ในโปรเจกต์

| ไฟล์ | หน้าที่ |
|---|---|
| `index.html` | หน้าเว็บทั้งหมด (HTML/CSS/JS) |
| `sat.jpg` | ภาพดาวเทียมที่ใช้เป็นพื้นหลังแผนที่แปลง |
| `Code.gs` | โค้ด Apps Script ที่ทำหน้าที่เป็น backend อ่าน/เขียน Google Sheets |
| `appsscript.json` | manifest ของโปรเจกต์ Apps Script (เขตเวลา + ตั้งค่า Web App) |
| `.clasp.json` | ผูกโฟลเดอร์นี้กับโปรเจกต์ Apps Script (scriptId) |
| `.claspignore` | จำกัดไฟล์ที่ `clasp push` ส่งขึ้น (เอาเฉพาะ `Code.gs`, `appsscript.json`) |

## สถานะการติดตั้ง (ติดตั้งผ่าน clasp แล้ว)

| รายการ | ค่า |
|---|---|
| Google Sheets (ฐานข้อมูล) | `1O2FzRic5rlMiX0kYvYroSbRWurKI6IpzKHTKsDli_nI` |
| Apps Script project | `1q5cNOjoc6W-E-s_Sfd-L7PPkifjJFVDZLwUsjGo8FxdLwwgP2ORqHyEv` |
| Web App URL (deployment `v1`) | `https://script.google.com/macros/s/AKfycbyESQnbxczJ72sap7E5wStL31v7rkHWpFyomEd3Zc_d3OcBSXXJBA2hbNeBgqoamEtv/exec` |

URL นี้ถูกใส่ไว้ใน `index.html` แล้วที่ตัวแปร `API_URL`

### แก้ backend แล้วอัปเดต

```bash
# 1) ส่งไฟล์ขึ้น Apps Script
bun x @google/clasp@2.4.2 push --force

# 2) สร้าง version ใหม่ แล้วอัปเดต deployment เดิม (URL ไม่เปลี่ยน)
bun x @google/clasp@2.4.2 version "v4 ..."
bun x @google/clasp@2.4.2 deploy -V 4 -d "v4 ..." -i AKfycbyESQnbxczJ72sap7E5wStL31v7rkHWpFyomEd3Zc_d3OcBSXXJBA2hbNeBgqoamEtv
```

ถ้าลืมรหัส deployment ดูได้ด้วย `bun x @google/clasp@2.4.2 deployments`

ครั้งแรกต้อง `bun x @google/clasp@2.4.2 login` และเปิด **Google Apps Script API** ที่
<https://script.google.com/home/usersettings>

## ขั้นตอนที่ 1 — สร้าง Google Sheets + Apps Script (ทำเสร็จแล้ว — เก็บไว้เป็นเอกสารอ้างอิง)

1. สร้าง Google Sheets ใหม่ 1 ไฟล์ ตั้งชื่อ เช่น `บันทึกตัดอัดก้อนชีวมวล`
2. เมนู **Extensions → Apps Script**
3. ลบโค้ดตัวอย่างใน `Code.gs` แล้ววางเนื้อหาจากไฟล์ `Code.gs` ในโปรเจกต์นี้
4. กด **Save** แล้วเลือกฟังก์ชัน `setup` จากแถบด้านบน กด **Run** หนึ่งครั้ง
   (ครั้งแรกจะมีหน้าขออนุญาตสิทธิ์ → Allow)
5. กลับไปดูที่ Google Sheets จะมีชีต `bale_records`, `chop_records`, `pellet_records`, `settings`
   พร้อมหัวคอลัมน์ไทย — **ห้ามลบหรือสลับหัวคอลัมน์** (โค้ดจับคู่คอลัมน์จากชื่อหัวตาราง)

## ขั้นตอนที่ 2 — Deploy เป็น Web App

1. ในหน้า Apps Script กด **Deploy → New deployment**
2. เลือกชนิด **Web app**
3. ตั้งค่า
   - **Execute as**: `Me`
   - **Who has access**: `Anyone`
4. กด **Deploy** แล้วคัดลอก URL ที่ลงท้ายด้วย `/exec`
5. เปิด `index.html` หาบรรทัด

   ```js
   var API_URL = "PASTE_APPS_SCRIPT_WEB_APP_URL_HERE";
   ```

   แล้วเปลี่ยนเป็น URL ที่คัดลอกมา

   ทางเลือก: เปิดหน้าเว็บด้วย `index.html?api=<URL>` หนึ่งครั้ง เบราว์เซอร์จะจำ URL
   ไว้ใน localStorage ของเครื่องนั้น (สะดวกตอนทดสอบ แต่เครื่องอื่นต้องใส่เอง)

6. ทดสอบโดยเปิดหน้าเว็บ — แถบสถานะใต้แท็บควรขึ้น "อัปเดตล่าสุด HH:MM"
   และกดบันทึกแล้วข้อมูลต้องไปโผล่ใน Google Sheets

ถ้าแก้โค้ด Apps Script ภายหลัง ต้อง **Deploy → Manage deployments → แก้ไข → Deploy** ซ้ำ
(หรือสร้าง New deployment ใหม่) แล้วนำ URL ใหม่มาใส่ ถ้า URL เปลี่ยน

## ขั้นตอนที่ 3 — ขึ้น GitHub Pages

ต้องมี repository ชื่อ `paskornc.github.io` ในบัญชี `paskornc` (แบบ public)
เพราะ GitHub Pages ของบัญชีผู้ใช้ให้บริการที่ `https://paskornc.github.io/` พอดี

```bash
# ครั้งแรก (ทำในโฟลเดอร์นี้)
git init -b main
git add index.html sat.jpg Code.gs README.md
git commit -m "บันทึกตัดอัดก้อนชีวมวล + Google Sheets backend"
git remote add origin https://github.com/paskornc/paskornc.github.io.git
git push -u origin main
```

จากนั้นใน GitHub ไปที่ **Settings → Pages** ตั้ง **Source = Deploy from a branch**,
**Branch = main**, **Folder = / (root)** แล้ว Save
รอประมาณ 1 นาที เว็บจะขึ้นที่ <https://paskornc.github.io/>

ครั้งถัดไปที่แก้ไฟล์ ใช้แค่

```bash
git add -A && git commit -m "..." && git push
```

Pages จะอัปเดตให้เองภายในไม่กี่นาที

## ความปลอดภัย

- Web App แบบ `Anyone` หมายถึงใครมี URL ก็อ่าน/เขียนได้ ถ้าต้องการกันคนนอก
  ให้ตั้ง `var TOKEN = 'ข้อความลับ';` ใน `Code.gs` และใส่ค่าเดียวกันใน
  `var API_TOKEN = "";` ของ `index.html` แล้ว deploy ใหม่
  (ค่า token จะฝังในไฟล์หน้าเว็บ ซึ่งใครเปิดหน้าเว็บก็เห็นได้ — ใช้กันคนที่เดา URL ได้เท่านั้น)
- Token ในไฟล์หน้าเว็บเป็นเพียงการกันการเขียนโดยบังเอิญ ไม่ใช่ระบบยืนยันตัวตนจริง

## ข้อจำกัดที่ควรรู้

- ไม่มี realtime: หน้าเว็บดึงข้อมูลใหม่ทุก 60 วินาที (และทันทีหลังบันทึก/ลบ หรือกลับเข้าหน้านั้น)
  ถ้าสองคนบันทึกพร้อมกัน ต่างคนจะเห็นข้อมูลใหม่อีกครั้งเมื่อถึงรอบดึงถัดไป
- งานสับและงานอัดเม็ดใช้เลขมิเตอร์ไฟตัวเดียวกัน ค่าไฟที่ใช้จึงหักเลขมิเตอร์ข้ามสองงาน
- ลบรายการได้อย่างเดียว (ไม่มีแก้ไข) — ถ้าต้องแก้ ให้แก้ใน Google Sheets โดยตรง
  แล้วรอรอบดึงข้อมูลถัดไป
