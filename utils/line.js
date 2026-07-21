import crypto from "node:crypto";
import { compact } from "./common.js";

const LINE_REPLY_URL = "https://api.line.me/v2/bot/message/reply";

export async function readRawBody(req) {
  const chunks = [];

  for await (const chunk of req) {
    chunks.push(
      Buffer.isBuffer(chunk)
        ? chunk
        : Buffer.from(chunk)
    );
  }

  return Buffer.concat(chunks);
}

export function verifyLineSignature(rawBody, signature) {
  const secret = process.env.LINE_CHANNEL_SECRET;

  if (!secret || !signature) {
    return false;
  }

  const expected = crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest("base64");

  const expectedBuffer = Buffer.from(expected);
  const actualBuffer = Buffer.from(signature);

  if (expectedBuffer.length !== actualBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(
    expectedBuffer,
    actualBuffer
  );
}

export async function replyText(
  replyToken,
  text,
  quickReplyItems = []
) {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;

  if (!token) {
    throw new Error(
      "Missing LINE_CHANNEL_ACCESS_TOKEN"
    );
  }

  const message = {
    type: "text",
    text: compact(text),
  };

  if (quickReplyItems.length) {
    message.quickReply = {
      items: quickReplyItems
        .slice(0, 13)
        .map((label) => ({
          type: "action",
          action: {
            type: "message",
            label: label.slice(0, 20),
            text: label,
          },
        })),
    };
  }

  const response = await fetch(LINE_REPLY_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      replyToken,
      messages: [message],
    }),
  });

  if (!response.ok) {
    throw new Error(
      `LINE reply failed: ${response.status} ${await response.text()}`
    );
  }
}
