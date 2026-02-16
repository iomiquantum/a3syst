import { useState } from "react";
import AppLayout from "@/components/AppLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Video, Plus, Clock, Users, FileText, Brain, Loader2, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useClinic } from "@/hooks/useClinic";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";

const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "Pendiente", variant: "outline" },
  recording: { label: "Grabando", variant: "default" },
  processing: { label: "Procesando", variant: "secondary" },
  completed: { label: "Completada", variant: "default" },
  failed: { label: "Error", variant: "destructive" },
};

const ReunionesPage = () => {
  const { clinicId } = useClinic();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [meetingUrl, setMeetingUrl] = useState("");
  const [meetingTitle, setMeetingTitle] = useState("");
  const [selectedMeeting, setSelectedMeeting] = useState<any>(null);

  const { data: meetings = [], isLoading } = useQuery({
    queryKey: ["meetings", clinicId],
    queryFn: async () => {
      if (!clinicId) return [];
      const { data, error } = await supabase
        .from("meetings")
        .select("*")
        .eq("clinic_id", clinicId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!clinicId,
  });

  const { data: selectedSummary } = useQuery({
    queryKey: ["meeting-summary", selectedMeeting?.id],
    queryFn: async () => {
      if (!selectedMeeting?.id) return null;
      const { data } = await supabase
        .from("meeting_summaries")
        .select("*")
        .eq("meeting_id", selectedMeeting.id)
        .maybeSingle();
      return data;
    },
    enabled: !!selectedMeeting?.id,
  });

  const { data: selectedTranscript } = useQuery({
    queryKey: ["meeting-transcript", selectedMeeting?.id],
    queryFn: async () => {
      if (!selectedMeeting?.id) return null;
      const { data } = await supabase
        .from("meeting_transcripts")
        .select("*")
        .eq("meeting_id", selectedMeeting.id)
        .maybeSingle();
      return data;
    },
    enabled: !!selectedMeeting?.id,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!clinicId || !user) throw new Error("Sin contexto");
      const { data, error } = await supabase.from("meetings").insert({
        clinic_id: clinicId,
        created_by: user.id,
        title: meetingTitle || "Reunión sin título",
        meeting_url: meetingUrl || null,
        platform: meetingUrl?.includes("zoom") ? "zoom" : "google_meet",
      }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meetings"] });
      setShowCreate(false);
      setMeetingUrl("");
      setMeetingTitle("");
      toast.success("Reunión creada. El bot se unirá cuando las API keys estén configuradas.");
    },
    onError: (err: any) => toast.error(err.message),
  });

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Reuniones</h1>
            <p className="text-muted-foreground">Graba, transcribe y analiza tus reuniones con IA</p>
          </div>
          <Button onClick={() => setShowCreate(true)} className="gap-2">
            <Plus className="w-4 h-4" /> Nueva Reunión
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[
            { icon: Video, label: "Total reuniones", value: meetings.length },
            { icon: Clock, label: "Grabando", value: meetings.filter(m => m.status === "recording").length },
            { icon: Brain, label: "Procesando", value: meetings.filter(m => m.status === "processing").length },
            { icon: FileText, label: "Completadas", value: meetings.filter(m => m.status === "completed").length },
          ].map(({ icon: Icon, label, value }) => (
            <Card key={label} className="shadow-card">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{value}</p>
                    <p className="text-xs text-muted-foreground">{label}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Meetings list + detail */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* List */}
          <div className="lg:col-span-1 space-y-2">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Historial</h2>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : meetings.length === 0 ? (
              <Card className="shadow-card">
                <CardContent className="py-12 text-center">
                  <Video className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
                  <p className="text-sm text-muted-foreground">No hay reuniones aún</p>
                  <p className="text-xs text-muted-foreground mt-1">Crea tu primera reunión para empezar</p>
                </CardContent>
              </Card>
            ) : (
              meetings.map(m => {
                const st = statusMap[m.status] || statusMap.pending;
                return (
                  <Card
                    key={m.id}
                    className={`shadow-card cursor-pointer transition-all hover:ring-1 hover:ring-primary/30 ${selectedMeeting?.id === m.id ? "ring-2 ring-primary" : ""}`}
                    onClick={() => setSelectedMeeting(m)}
                  >
                    <CardContent className="py-3 px-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{m.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(m.created_at), "dd MMM yyyy · HH:mm", { locale: es })}
                          </p>
                          {m.meeting_url && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                              <ExternalLink className="w-3 h-3" />
                              {m.platform === "zoom" ? "Zoom" : "Google Meet"}
                            </p>
                          )}
                        </div>
                        <Badge variant={st.variant} className="shrink-0 text-[10px]">{st.label}</Badge>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>

          {/* Detail */}
          <div className="lg:col-span-2">
            {selectedMeeting ? (
              <Card className="shadow-card">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{selectedMeeting.title}</CardTitle>
                    <Badge variant={statusMap[selectedMeeting.status]?.variant || "outline"}>
                      {statusMap[selectedMeeting.status]?.label || selectedMeeting.status}
                    </Badge>
                  </div>
                  <CardDescription>
                    {format(new Date(selectedMeeting.created_at), "EEEE dd 'de' MMMM yyyy · HH:mm", { locale: es })}
                    {selectedMeeting.duration_seconds && ` · ${Math.round(selectedMeeting.duration_seconds / 60)} min`}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="resumen" className="w-full">
                    <TabsList>
                      <TabsTrigger value="resumen">Resumen</TabsTrigger>
                      <TabsTrigger value="transcripcion">Transcripción</TabsTrigger>
                      <TabsTrigger value="acciones">Items de Acción</TabsTrigger>
                    </TabsList>

                    <TabsContent value="resumen" className="mt-4 space-y-4">
                      {selectedSummary ? (
                        <>
                          <div>
                            <h3 className="text-sm font-semibold text-foreground mb-2">Resumen Ejecutivo</h3>
                            <p className="text-sm text-muted-foreground leading-relaxed">
                              {selectedSummary.executive_summary || "Sin resumen disponible"}
                            </p>
                          </div>
                          {selectedSummary.sentiment && (
                            <div>
                              <h3 className="text-sm font-semibold text-foreground mb-1">Sentimiento general</h3>
                              <Badge variant="outline">{selectedSummary.sentiment}</Badge>
                            </div>
                          )}
                          {Array.isArray(selectedSummary.key_topics) && (selectedSummary.key_topics as any[]).length > 0 && (
                            <div>
                              <h3 className="text-sm font-semibold text-foreground mb-2">Temas Clave</h3>
                              <div className="flex flex-wrap gap-2">
                                {(selectedSummary.key_topics as string[]).map((t, i) => (
                                  <Badge key={i} variant="secondary">{t}</Badge>
                                ))}
                              </div>
                            </div>
                          )}
                          {Array.isArray(selectedSummary.decisions) && (selectedSummary.decisions as any[]).length > 0 && (
                            <div>
                              <h3 className="text-sm font-semibold text-foreground mb-2">Decisiones</h3>
                              <ul className="list-disc list-inside space-y-1">
                                {(selectedSummary.decisions as string[]).map((d, i) => (
                                  <li key={i} className="text-sm text-muted-foreground">{d}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="py-8 text-center">
                          <Brain className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                          <p className="text-sm text-muted-foreground">
                            {selectedMeeting.status === "completed" ? "No se generó resumen" : "El resumen se generará al completar la grabación"}
                          </p>
                        </div>
                      )}
                    </TabsContent>

                    <TabsContent value="transcripcion" className="mt-4">
                      {selectedTranscript ? (
                        <div className="space-y-3 max-h-96 overflow-y-auto">
                          {Array.isArray(selectedTranscript.raw_transcript) ? (
                            (selectedTranscript.raw_transcript as any[]).map((entry: any, i: number) => (
                              <div key={i} className="flex gap-3">
                                <div className="shrink-0">
                                  <Badge variant="outline" className="text-[10px]">{entry.speaker || `P${i + 1}`}</Badge>
                                </div>
                                <div>
                                  <p className="text-xs text-muted-foreground">{entry.timestamp || ""}</p>
                                  <p className="text-sm text-foreground">{entry.text}</p>
                                </div>
                              </div>
                            ))
                          ) : (
                            <p className="text-sm text-muted-foreground">Formato de transcripción no reconocido</p>
                          )}
                        </div>
                      ) : (
                        <div className="py-8 text-center">
                          <FileText className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                          <p className="text-sm text-muted-foreground">
                            {selectedMeeting.status === "completed" ? "No hay transcripción" : "La transcripción se generará al completar la grabación"}
                          </p>
                        </div>
                      )}
                    </TabsContent>

                    <TabsContent value="acciones" className="mt-4">
                      {selectedSummary && Array.isArray(selectedSummary.action_items) && (selectedSummary.action_items as any[]).length > 0 ? (
                        <div className="space-y-2">
                          {(selectedSummary.action_items as any[]).map((item: any, i: number) => (
                            <div key={i} className="flex items-start gap-3 p-3 rounded-lg border border-border bg-background">
                              <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                                {i + 1}
                              </div>
                              <div>
                                <p className="text-sm text-foreground">{typeof item === "string" ? item : item.task || item.description || JSON.stringify(item)}</p>
                                {item.assignee && <p className="text-xs text-muted-foreground mt-1">Asignado a: {item.assignee}</p>}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="py-8 text-center">
                          <Users className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                          <p className="text-sm text-muted-foreground">Sin items de acción</p>
                        </div>
                      )}
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            ) : (
              <Card className="shadow-card">
                <CardContent className="py-20 text-center">
                  <Video className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-foreground font-medium">Selecciona una reunión</p>
                  <p className="text-sm text-muted-foreground mt-1">Elige una reunión del historial para ver sus detalles</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Create dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nueva Reunión</DialogTitle>
            <DialogDescription>Pega el link de tu reunión de Google Meet o Zoom para que el bot se una y grabe automáticamente.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Título de la reunión</Label>
              <Input
                placeholder="Ej: Standup semanal del equipo"
                value={meetingTitle}
                onChange={e => setMeetingTitle(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>URL de la reunión (opcional)</Label>
              <Input
                placeholder="https://meet.google.com/xxx-xxxx-xxx"
                value={meetingUrl}
                onChange={e => setMeetingUrl(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">Compatible con Google Meet y Zoom</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancelar</Button>
            <Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending}>
              {createMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
              Crear Reunión
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default ReunionesPage;
