# LINE Team Update Bot v2

รองรับ `/update`, `/today`, `/my`, `/waiting`, `/done`, `/project ชื่อ`, `/summary`, `/help`

หัวตารางจะถูกสร้าง/แก้อัตโนมัติเป็น:

`Timestamp | Date | Reporter | Project | Task | Status | UserId | RawText`

## Deploy

```bash
npm install
git add .
git commit -m "Deploy LINE bot v2"
git push
```

Webhook URL: `https://YOUR-DOMAIN.vercel.app/api/webhook`

Environment Variables ที่ต้องตั้งบน Vercel ดูใน `.env.example`
