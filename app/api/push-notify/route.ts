import { NextRequest, NextResponse } from "next/server";
import webpush from "web-push";
import { createClient } from "@/lib/supabase/server";
import { koreaYmd } from "@/lib/korea-date";

/**
 * Vercel Cron Job — 매 30분 실행
 * 1) 일정(todos): 30분 전 예정 알림 / 기간 초과 미완료 알림
 * 2) 루틴(routines): 복약·활력징후 예정 시각 30분 경과 + 미수행 → 알림
 * 3) 매일 저녁 8시: 오늘 건강 체크 요약 가족 알림
 */
export const GET = async (req: NextRequest) => {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  webpush.setVapidDetails(
    process.env.VAPID_EMAIL!,
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
  );

  const sendPush = async (
    subscriptionStr: string,
    title: string,
    body: string,
    tag: string
  ) => {
    try {
      const subscription = JSON.parse(subscriptionStr) as webpush.PushSubscription;
      await webpush.sendNotification(
        subscription,
        JSON.stringify({ title, body, tag, url: "/" })
      );
    } catch (err) {
      console.error("푸시 전송 실패:", err);
    }
  };

  try {
    const supabase = await createClient();
    const now = new Date();
    const kstNow = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Seoul" }));
    const in30min = new Date(now.getTime() + 30 * 60 * 1000);
    const todayStr = koreaYmd();
    const kstHour = kstNow.getHours();
    const kstMinute = kstNow.getMinutes();
    // 현재 KST 기준 HH:MM (30분 전 기준)
    const past30min = new Date(kstNow.getTime() - 30 * 60 * 1000);
    const past30HH = String(past30min.getHours()).padStart(2, "0");
    const past30MM = String(past30min.getMinutes()).padStart(2, "0");
    const past30Time = `${past30HH}:${past30MM}`;
    const nowHH = String(kstNow.getHours()).padStart(2, "0");
    const nowMM = String(kstNow.getMinutes()).padStart(2, "0");
    const nowTime = `${nowHH}:${nowMM}`;

    const notifications: Promise<void>[] = [];

    // ── 1. 일정(todos) 알림 ─────────────────────────────────────
    const { data: upcomingTodos } = await supabase
      .from("todos")
      .select("id, content, start_time, user_id")
      .eq("is_completed", false)
      .gte("start_time", now.toISOString())
      .lte("start_time", in30min.toISOString());

    const { data: overdueTodos } = await supabase
      .from("todos")
      .select("id, content, end_time, user_id")
      .eq("is_completed", false)
      .lt("end_time", now.toISOString());

    for (const todo of upcomingTodos ?? []) {
      const { data: subData } = await supabase
        .from("push_subscriptions").select("subscription")
        .eq("user_id", todo.user_id as string).single();
      if (!subData?.subscription) continue;
      const startTime = new Date(todo.start_time as string).toLocaleString("ko-KR", {
        timeZone: "Asia/Seoul", hour: "2-digit", minute: "2-digit", hour12: false,
      });
      notifications.push(sendPush(
        subData.subscription as string,
        `⏰ 30분 후 일정`,
        `${startTime} — ${todo.content as string}`,
        `upcoming-${todo.id as string}`
      ));
    }

    for (const todo of overdueTodos ?? []) {
      const { data: subData } = await supabase
        .from("push_subscriptions").select("subscription")
        .eq("user_id", todo.user_id as string).single();
      if (!subData?.subscription) continue;
      notifications.push(sendPush(
        subData.subscription as string,
        `🔔 미완료 일정`,
        `"${todo.content as string}" 시간이 지났어요. 확인해 주세요.`,
        `overdue-${todo.id as string}`
      ));
    }

    // ── 2. 복약·활력징후 루틴 미수행 알림 ──────────────────────
    // 조건: routine_time 이 30분~0분 전 사이 && 오늘 routine_logs 없음
    // 대상: sort_order 0~9 (복약 + 활력징후)
    const { data: overdueRoutines } = await supabase
      .from("routines")
      .select("id, title, emoji, routine_time, user_id")
      .gte("sort_order", 0)
      .lte("sort_order", 9)                    // 복약(0~2) + 활력징후(6~9)
      .gte("routine_time", past30Time)
      .lte("routine_time", nowTime);

    for (const routine of overdueRoutines ?? []) {
      // 오늘 이미 체크했는지 확인
      const { data: log } = await supabase
        .from("routine_logs")
        .select("id")
        .eq("routine_id", routine.id as string)
        .eq("done_date", todayStr)
        .limit(1)
        .single();

      if (log) continue; // 이미 완료 → 알림 불필요

      const { data: subData } = await supabase
        .from("push_subscriptions").select("subscription")
        .eq("user_id", routine.user_id as string).single();
      if (!subData?.subscription) continue;

      notifications.push(sendPush(
        subData.subscription as string,
        `💊 복약·건강 체크 알림`,
        `${routine.emoji as string} ${routine.title as string} (${routine.routine_time as string}) 아직 안 하셨어요!`,
        `routine-${routine.id as string}`
      ));
    }

    // ── 3. 저녁 8시 일일 요약 알림 ─────────────────────────────
    // 20:00~20:29 사이에 cron 실행될 때만 동작
    if (kstHour === 20 && kstMinute < 30) {
      const { data: allUsers } = await supabase
        .from("push_subscriptions")
        .select("user_id, subscription");

      for (const sub of allUsers ?? []) {
        const userId = sub.user_id as string;
        const { data: totalRoutines } = await supabase
          .from("routines").select("id").eq("user_id", userId);
        const { data: doneLogs } = await supabase
          .from("routine_logs").select("id")
          .eq("user_id", userId).eq("done_date", todayStr);

        const total = totalRoutines?.length ?? 0;
        const done = doneLogs?.length ?? 0;
        if (total === 0) continue;

        const pct = Math.round((done / total) * 100);
        const msg = pct === 100
          ? "오늘 모든 체크를 완료하셨어요! 수고하셨습니다 🎉"
          : `오늘 ${total}개 중 ${done}개 완료했어요 (${pct}%). 남은 항목을 확인해 주세요.`;

        notifications.push(sendPush(
          sub.subscription as string,
          `🌙 오늘 하루 건강 체크 요약`,
          msg,
          `daily-summary-${todayStr}`
        ));
      }
    }

    await Promise.all(notifications);
    return NextResponse.json({ success: true, sent: notifications.length });
  } catch (error) {
    console.error("알림 전송 중 오류:", error);
    return NextResponse.json({ error: "알림 전송 실패" }, { status: 500 });
  }
};
