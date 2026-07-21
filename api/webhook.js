import {
  readRawBody,
  verifyLineSignature,
  replyText,
} from "../utils/line.js";

import { handleCommand } from "../commands/index.js";

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res
      .status(405)
      .send("Method Not Allowed");
  }

  try {
    const rawBody = await readRawBody(req);

    const signature =
      req.headers["x-line-signature"];

    const isValid = verifyLineSignature(
      rawBody,
      signature
    );

    if (!isValid) {
      return res
        .status(401)
        .send("Invalid signature");
    }

    let body;

    try {
      body = JSON.parse(
        rawBody.toString("utf8")
      );
    } catch {
      return res
        .status(400)
        .send("Invalid JSON");
    }

    for (const event of body.events || []) {
      const isTextMessage =
        event.type === "message" &&
        event.message?.type === "text" &&
        event.replyToken;

      if (!isTextMessage) {
        continue;
      }

      const text = event.message.text.trim();
      const userId = event.source?.userId || "";

      try {
        const reply = await handleCommand(
          text,
          userId
        );

        if (reply) {
          await replyText(
            event.replyToken,
            reply,
            [
              "/today",
              "/my",
              "/waiting",
              "/summary",
              "/help",
            ]
          );
        } else {
          await replyText(
            event.replyToken,
            "ไม่รู้จักคำสั่งนี้ พิมพ์ /help เพื่อดูวิธีใช้",
            [
              "/help",
              "/today",
              "/my",
            ]
          );
        }
      } catch (eventError) {
        console.error(
          "Event processing failed:",
          eventError
        );

        await replyText(
          event.replyToken,
          `เกิดข้อผิดพลาด: ${
            eventError.message ||
            "กรุณาลองใหม่"
          }`
        ).catch(() => {});
      }
    }

    return res.status(200).send("OK");
  } catch (error) {
    console.error("Webhook failed:", error);

    return res
      .status(500)
      .send("Internal Server Error");
  }
}
