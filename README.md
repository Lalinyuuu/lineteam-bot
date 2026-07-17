# LINE Team Update Bot

บอทรับข้อความที่ขึ้นต้นด้วย `/update` จาก LINE แล้วบันทึกเป็นรายการใน Google Sheets พร้อมตอบรับในห้องแชต

## ตัวอย่างข้อความ

```text
/update

*Project 50*
1. ได้วันอาจารย์มาแล้ว 22 ได้บ่าย 24 ทั้งวัน ☑
2. พี่บอยพี่ใหญ่ รอคำตอบ
3. พี่แตยังไม่ได้คอนเฟิร์มวันที่ 24

*Pjoy*
1. งานกรมสตรี รอคอนเฟิร์มคอลัมน์และ wording
2. Mapping ใบเสร็จแก้แล้ว รอ deploy
```

## 1) เตรียม Google Sheet

1. สร้าง Google Sheet ใหม่
2. เปิด `Extensions > Apps Script`
3. วางโค้ดจาก `setup-sheet.js`
4. Run ฟังก์ชัน `setupSheet`
5. คัดลอก Spreadsheet ID จาก URL

## 2) สร้าง Google Service Account

1. เปิด Google Cloud Console และสร้าง Project
2. เปิดใช้งาน Google Sheets API
3. สร้าง Service Account และ JSON Key
4. นำอีเมลของ Service Account ไป Share Google Sheet โดยให้สิทธิ์ Editor
5. เก็บ JSON ทั้งก้อนสำหรับตัวแปร `GOOGLE_SERVICE_ACCOUNT_JSON`

## 3) สร้าง LINE Bot

1. สร้าง LINE Official Account และ Messaging API channel
2. สร้าง Channel access token
3. จด Channel secret
4. เปิด Allow bot to join group chats
5. ปิด Auto-reply messages เพื่อไม่ให้ตอบซ้ำ

## 4) Deploy ขึ้น Vercel

```bash
npm install
vercel
```

เพิ่ม Environment Variables ตาม `.env.example` แล้ว Deploy production

Webhook URL:

```text
https://ชื่อโปรเจกต์.vercel.app/api/webhook
```

นำ URL ไปใส่ใน LINE Developers > Messaging API > Webhook URL แล้วกด Verify และเปิด Use webhook

## 5) หา LINE User ID ของยูและฝ้าย

ช่วงทดลอง สามารถดู `event.source.userId` ใน Vercel Function Logs แล้วนำไปใส่:

- `LINE_USER_ID_YUU`
- `LINE_USER_ID_FAI`

หากยังไม่ใส่ ระบบยังบันทึกได้ แต่ Reporter จะแสดงว่า `ไม่ทราบชื่อ`

## ขอบเขตเวอร์ชันแรก

- บันทึกเฉพาะข้อความ `/update`
- รองรับหัวข้อ Project และรายการเลข/ขีด
- แยกสถานะเบื้องต้นจากคำว่า เสร็จ, รอ, คอนเฟิร์ม, deploy
- เก็บข้อความต้นฉบับทุกครั้ง
- ยังไม่มี AI จึงอาจต้องแก้ Project/Status ใน Sheet บางรายการ
