import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useClinic } from "@/hooks/useClinic";

export interface QueueItem {
  id: string;
  conversation_id: string;
  clinic_id: string;
  contact_number: number;
  message_type: string;
  status: string;
  priority: number;
  scheduled_at: string;
  attempt_count: number;
  max_attempts: number;
  last_error: string | null;
  generated_message: string | null;
  sent_at: string | null;
  created_at: string;
}

export interface QueueStats {
  pending: number;
  processing: number;
  retry: number;
  failed: number;
  sentToday: number;
}

export const useMessageQueue = (conversationId?: string) => {
  const { clinicId } = useClinic();
  const [queueItem, setQueueItem] = useState<QueueItem | null>(null);
  const [stats, setStats] = useState<QueueStats>({ pending: 0, processing: 0, retry: 0, failed: 0, sentToday: 0 });
  const [loading, setLoading] = useState(true);

  // Fetch queue item for a specific conversation
  useEffect(() => {
    if (!clinicId || !conversationId) return;

    const fetchItem = async () => {
      const { data } = await supabase
        .from("pipeline_message_queue")
        .select("*")
        .eq("conversation_id", conversationId)
        .in("status", ["pending", "processing", "retry", "failed"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      setQueueItem(data as QueueItem | null);
      setLoading(false);
    };

    fetchItem();

    // Subscribe to realtime changes
    const channel = supabase
      .channel(`queue-${conversationId}`)
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "pipeline_message_queue",
        filter: `conversation_id=eq.${conversationId}`,
      }, () => { fetchItem(); })
      .subscribe();

    // Poll every 30 seconds as backup
    const interval = setInterval(fetchItem, 30000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [clinicId, conversationId]);

  // Fetch global stats
  useEffect(() => {
    if (!clinicId) return;

    const fetchStats = async () => {
      const { data: allItems } = await supabase
        .from("pipeline_message_queue")
        .select("status, sent_at")
        .eq("clinic_id", clinicId)
        .in("status", ["pending", "processing", "retry", "failed", "sent"]);

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const s: QueueStats = { pending: 0, processing: 0, retry: 0, failed: 0, sentToday: 0 };
      for (const item of allItems || []) {
        if (item.status === "pending") s.pending++;
        else if (item.status === "processing") s.processing++;
        else if (item.status === "retry") s.retry++;
        else if (item.status === "failed") s.failed++;
        if (item.status === "sent" && item.sent_at && new Date(item.sent_at) >= today) s.sentToday++;
      }
      setStats(s);
    };

    fetchStats();
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, [clinicId]);

  const cancelQueueItem = async (queueId: string) => {
    await supabase.from("pipeline_message_queue").update({
      status: "resolved_manually",
      resolved_manually_at: new Date().toISOString(),
    }).eq("id", queueId);
  };

  const retryQueueItem = async (queueId: string) => {
    await supabase.from("pipeline_message_queue").update({
      status: "retry",
      attempt_count: 0,
      last_error: null,
    }).eq("id", queueId);
  };

  return { queueItem, stats, loading, cancelQueueItem, retryQueueItem };
};
