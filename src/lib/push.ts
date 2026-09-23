import webPush from "web-push";
import { prisma } from "@/lib/prisma";

const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "BOPDofGoPQCqk6zk0QSOFbSECpX9dDmhUh0dwxPqZZJCTDo9bgQ1_EAR8G_ikeh9dlF8zp4005buCcz6_783yVs";
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY || "lHEzamOypeYQlF4inyVN8uUbBs-HUDW75ki8POjj6ZU";

if (vapidPublicKey && vapidPrivateKey) {
  try {
    webPush.setVapidDetails(
      "mailto:support@trellis.da.gov.ph",
      vapidPublicKey,
      vapidPrivateKey
    );
  } catch (e) {
    console.error("[WebPush] Failed to set VAPID details:", e);
  }
}

export interface PushNotificationPayload {
  title: string;
  body: string;
  icon?: string;
  url?: string;
}

export async function sendPushToUser(userId: string, payload: PushNotificationPayload) {
  try {
    const subscriptions = await prisma.pushSubscription.findMany({
      where: { userId }
    });

    if (subscriptions.length === 0) return;

    const pushPayload = JSON.stringify({
      title: payload.title,
      body: payload.body,
      icon: payload.icon || "/icon-192.png",
      url: payload.url || "/dashboard"
    });

    const sendPromises = subscriptions.map(async (sub) => {
      const pushSub = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.p256dh,
          auth: sub.auth
        }
      };

      try {
        await webPush.sendNotification(pushSub, pushPayload);
      } catch (err: any) {
        // If subscription is expired or invalid (404 / 410), delete it from DB
        if (err.statusCode === 404 || err.statusCode === 410) {
          console.log(`[WebPush] Pruning expired subscription endpoint: ${sub.endpoint}`);
          await prisma.pushSubscription.delete({
            where: { id: sub.id }
          }).catch(() => {});
        } else {
          console.error(`[WebPush] Error sending push to ${sub.endpoint}:`, err);
        }
      }
    });

    await Promise.allSettled(sendPromises);
  } catch (error) {
    console.error("[WebPush] sendPushToUser error:", error);
  }
}
