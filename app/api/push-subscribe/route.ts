import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface PushSubscriptionData {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

/**
 * 푸시 구독 정보를 Supabase에 저장하는 API
 */
export const POST = async (req: NextRequest) => {
  try {
    const { subscription } = await req.json() as { subscription: PushSubscriptionData };
    if (!subscription) {
      return NextResponse.json({ error: "구독 정보가 없습니다." }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }

    const { error } = await supabase
      .from("push_subscriptions")
      .upsert(
        {
          user_id: user.id,
          subscription: JSON.stringify(subscription),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      );

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("푸시 구독 저장 실패:", error);
    return NextResponse.json({ error: "구독 저장에 실패했습니다." }, { status: 500 });
  }
};

export const DELETE = async () => {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }

    const { error } = await supabase
      .from("push_subscriptions")
      .delete()
      .eq("user_id", user.id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("푸시 구독 삭제 실패:", error);
    return NextResponse.json({ error: "구독 삭제에 실패했습니다." }, { status: 500 });
  }
};
