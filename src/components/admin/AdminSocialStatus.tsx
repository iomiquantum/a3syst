import { useState, useEffect } from "react";
import { Shield, Building2, CheckCircle2, AlertCircle, Clock, BarChart3 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

interface SocialStats {
  totalConnected: number;
  sharedCount: number;
  customCount: number;
  activeTokens: number;
  expiredTokens: number;
  recentPosts: number;
  failedPosts: number;
}

const AdminSocialStatus = () => {
  const [stats, setStats] = useState<SocialStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      const [connRes, configRes, postsRes] = await Promise.all([
        supabase.from("social_media_connections").select("token_status, app_mode"),
        supabase.from("meta_app_configurations").select("app_mode"),
        supabase.from("social_media_posts_log").select("status, created_at")
          .gte("created_at", new Date(Date.now() - 86400000).toISOString()),
      ]);

      const conns = (connRes.data || []) as any[];
      const configs = (configRes.data || []) as any[];
      const posts = (postsRes.data || []) as any[];

      setStats({
        totalConnected: conns.length,
        sharedCount: configs.filter(c => c.app_mode === "shared" || !c.app_mode).length,
        customCount: configs.filter(c => c.app_mode === "custom").length,
        activeTokens: conns.filter(c => c.token_status === "active").length,
        expiredTokens: conns.filter(c => c.token_status === "expired" || c.token_status === "revoked").length,
        recentPosts: posts.filter(p => p.status === "published").length,
        failedPosts: posts.filter(p => p.status === "failed").length,
      });
      setLoading(false);
    };
    fetchStats();
  }, []);

  if (loading) return <div className="animate-pulse h-40 bg-muted/30 rounded-xl" />;
  if (!stats) return null;

  const totalConfigs = stats.sharedCount + stats.customCount || 1;

  return (
    <Card className="border-border/50">
      <CardContent className="p-6 space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
            <BarChart3 className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-foreground">Estado de Conexiones Sociales</h3>
            <p className="text-xs text-muted-foreground">Panel SuperAdmin — Vista global</p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-muted/30 rounded-xl p-3 border border-border/50 text-center">
            <p className="text-2xl font-bold text-foreground">{stats.totalConnected}</p>
            <p className="text-xs text-muted-foreground">Total conexiones</p>
          </div>
          <div className="bg-[#1877F2]/5 rounded-xl p-3 border border-[#1877F2]/10 text-center">
            <p className="text-2xl font-bold text-[#1877F2]">{stats.sharedCount}</p>
            <p className="text-xs text-muted-foreground flex items-center justify-center gap-1"><Shield className="w-3 h-3" /> App compartida ({Math.round(stats.sharedCount / totalConfigs * 100)}%)</p>
          </div>
          <div className="bg-purple-500/5 rounded-xl p-3 border border-purple-500/10 text-center">
            <p className="text-2xl font-bold text-purple-500">{stats.customCount}</p>
            <p className="text-xs text-muted-foreground flex items-center justify-center gap-1"><Building2 className="w-3 h-3" /> App propia ({Math.round(stats.customCount / totalConfigs * 100)}%)</p>
          </div>
          <div className="bg-muted/30 rounded-xl p-3 border border-border/50 text-center">
            <p className="text-2xl font-bold text-foreground">{stats.recentPosts + stats.failedPosts}</p>
            <p className="text-xs text-muted-foreground">Posts últimas 24h</p>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Estado de tokens</p>
          <div className="flex gap-4 text-sm">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <CheckCircle2 className="w-4 h-4 text-[hsl(var(--success))]" /> Activos: {stats.activeTokens}
            </span>
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <AlertCircle className="w-4 h-4 text-destructive" /> Expirados: {stats.expiredTokens}
            </span>
          </div>
          <div className="flex gap-4 text-sm">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <CheckCircle2 className="w-4 h-4 text-[hsl(var(--success))]" /> Exitosas: {stats.recentPosts}
            </span>
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <AlertCircle className="w-4 h-4 text-destructive" /> Fallidas: {stats.failedPosts}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default AdminSocialStatus;
