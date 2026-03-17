import { useState } from "react";
import AppLayout from "@/components/AppLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Video, Plus, Clock, Users, FileText, Brain, Loader2, ExternalLink, ClipboardPaste, Sparkles, CheckCircle2, ListTodo } from "lucide-react";
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

const SUMMARY_TYPES = [
  { id: "executive", label: "Resumen ejecutivo", description: "Resumen conciso de toda la reunión" },
  { id: "action_items", label: "Items de acción", description: "Tareas concretas con responsables" },
  { id: "decisions", label: "Decisiones", description: "Decisiones tomadas en la reunión" },
  { id: "key_topics", label: "Temas clave", description: "Principales temas discutidos" },
  { id: "sentiment", label: "Sentimiento", description: "Análisis del tono de la reunión" },
];

const ReunionesPage = () => {
  const { clinicId } = useClinic();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [meetingUrl, setMeetingUrl] = useState("");
  const [meetingTitle, setMeetingTitle] = useState("");
  const [pasteTranscript, setPasteTranscript] = useState("");
  const [selectedMeeting, setSelectedMeeting] = useState<any>(null);

  // Summarize dialog state
  const [showSummarize, setShowSummarize] = useState(false);
  const [summarizeTranscript, setSummarizeTranscript] = useState("");
  const [selectedSummaryTypes, setSelectedSummaryTypes] = useState<string[]>(["executive", "action_items", "decisions", "key_topics", "sentiment"]);

  // Create tasks dialog
  const [showCreateTasks, setShowCreateTasks] = useState(false);
  const [selectedActions, setSelectedActions] = useState<Set<number>>(new Set());
  const [targetProjectId, setTargetProjectId] = useState("");

  // Queries
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

  const { data: selectedSummary, refetch: refetchSummary } = useQuery({
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

  const { data: selectedTranscript, refetch: refetchTranscript } = useQuery({
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

  const { data: planningProjects = [] } = useQuery({
    queryKey: ["planning-projects", clinicId],
    queryFn: async () => {
      if (!clinicId) return [];
      const { data } = await supabase
        .from("planning_projects")
        .select("*")
        .eq("clinic_id", clinicId)
        .eq("status", "active")
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!clinicId,
  });

  const { data: planningColumns = [] } = useQuery({
    queryKey: ["planning-columns-for-tasks", targetProjectId],
    queryFn: async () => {
      if (!targetProjectId) return [];
      const { data } = await supabase
        .from("planning_columns")
        .select("*")
        .eq("project_id", targetProjectId)
        .order("position");
      return data || [];
    },
    enabled: !!targetProjectId,
  });

  // Create meeting mutation
  const createMutation = useMutation({
    mutationFn: async () => {
      if (!clinicId || !user) throw new Error("Sin contexto");
      const { data: meeting, error } = await supabase.from("meetings").insert({
        clinic_id: clinicId,
        created_by: user.id,
        title: meetingTitle || "Reunión sin título",
        meeting_url: meetingUrl || null,
        platform: meetingUrl?.includes("zoom") ? "zoom" : "google_meet",
        status: pasteTranscript.trim() ? "completed" : "pending",
      }).select().single();
      if (error) throw error;

      // If transcript was pasted, save it
      if (pasteTranscript.trim()) {
        const lines = pasteTranscript.trim().split("\n").filter(l => l.trim());
        const rawTranscript = lines.map((line, i) => ({ speaker: `Participante`, text: line.trim(), timestamp: "" }));

        await supabase.from("meeting_transcripts").insert({
          meeting_id: meeting.id,
          clinic_id: clinicId,
          raw_transcript: rawTranscript,
          speakers: [],
          language: "es",
        });
      }

      return meeting;
    },
    onSuccess: (meeting) => {
      queryClient.invalidateQueries({ queryKey: ["meetings"] });
      setShowCreate(false);
      setMeetingUrl("");
      setMeetingTitle("");
      setPasteTranscript("");
      setSelectedMeeting(meeting);
      toast.success(pasteTranscript.trim() ? "Reunión creada con transcripción" : "Reunión creada");
    },
    onError: (err: any) => toast.error(err.message),
  });

  // Save pasted transcript to existing meeting
  const saveTranscriptMutation = useMutation({
    mutationFn: async (text: string) => {
      if (!selectedMeeting?.id || !clinicId) throw new Error("Sin contexto");
      const lines = text.trim().split("\n").filter(l => l.trim());
      const rawTranscript = lines.map((line) => ({ speaker: "Participante", text: line.trim(), timestamp: "" }));

      // Upsert transcript
      if (selectedTranscript) {
        await supabase.from("meeting_transcripts").update({
          raw_transcript: rawTranscript,
        }).eq("id", selectedTranscript.id);
      } else {
        await supabase.from("meeting_transcripts").insert({
          meeting_id: selectedMeeting.id,
          clinic_id: clinicId,
          raw_transcript: rawTranscript,
          speakers: [],
          language: "es",
        });
      }

      // Update meeting status
      await supabase.from("meetings").update({ status: "completed" }).eq("id", selectedMeeting.id);
    },
    onSuccess: () => {
      refetchTranscript();
      queryClient.invalidateQueries({ queryKey: ["meetings"] });
      setSummarizeTranscript("");
      toast.success("Transcripción guardada");
    },
    onError: (err: any) => toast.error(err.message),
  });

  // AI Summarize mutation
  const summarizeMutation = useMutation({
    mutationFn: async () => {
      if (!selectedMeeting?.id || !clinicId) throw new Error("Sin contexto");

      // Get transcript text
      let text = summarizeTranscript.trim();
      if (!text && selectedTranscript) {
        const entries = selectedTranscript.raw_transcript as any[];
        text = entries.map((e: any) => `${e.speaker}: ${e.text}`).join("\n");
      }
      if (!text) throw new Error("No hay transcripción para resumir");

      // Save transcript if it's new
      if (summarizeTranscript.trim() && !selectedTranscript) {
        await saveTranscriptMutation.mutateAsync(summarizeTranscript);
      }

      const { data, error } = await supabase.functions.invoke("summarize-meeting", {
        body: {
          meeting_id: selectedMeeting.id,
          clinic_id: clinicId,
          transcript_text: text,
          summary_types: selectedSummaryTypes,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      refetchSummary();
      queryClient.invalidateQueries({ queryKey: ["meetings"] });
      setShowSummarize(false);
      setSummarizeTranscript("");
      toast.success("Resumen generado con IA");
    },
    onError: (err: any) => toast.error(err.message),
  });

  // Create planning tasks mutation
  const createTasksMutation = useMutation({
    mutationFn: async () => {
      if (!clinicId || !user || !targetProjectId) throw new Error("Selecciona un proyecto");
      const actionItems = (selectedSummary?.action_items as any[]) || [];
      const selected = Array.from(selectedActions);
      if (selected.length === 0) throw new Error("Selecciona al menos un item");

      const firstColumn = planningColumns[0];
      if (!firstColumn) throw new Error("El proyecto no tiene columnas");

      const tasks = selected.map((idx, pos) => {
        const item = actionItems[idx];
        return {
          project_id: targetProjectId,
          column_id: firstColumn.id,
          clinic_id: clinicId,
          title: typeof item === "string" ? item : item.task || item.description || JSON.stringify(item),
          description: `Generado desde reunión: ${selectedMeeting?.title || "Sin título"}\n${item.assignee ? `Asignado a: ${item.assignee}` : ""}`,
          priority: item.priority || "medium",
          created_by: user.id,
          position: pos,
        };
      });

      const { error } = await supabase.from("planning_tasks").insert(tasks);
      if (error) throw error;
    },
    onSuccess: () => {
      setShowCreateTasks(false);
      setSelectedActions(new Set());
      queryClient.invalidateQueries({ queryKey: ["planning-tasks"] });
      toast.success("Tareas creadas en Planificación");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const openSummarizeDialog = () => {
    if (selectedTranscript) {
      const entries = selectedTranscript.raw_transcript as any[];
      setSummarizeTranscript(entries.map((e: any) => e.text).join("\n"));
    } else {
      setSummarizeTranscript("");
    }
    setShowSummarize(true);
  };

  const openCreateTasksDialog = () => {
    const items = (selectedSummary?.action_items as any[]) || [];
    setSelectedActions(new Set(items.map((_, i) => i)));
    setShowCreateTasks(true);
  };

  const toggleSummaryType = (id: string) => {
    setSelectedSummaryTypes(prev =>
      prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]
    );
  };

  const toggleAction = (idx: number) => {
    setSelectedActions(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx); else next.add(idx);
      return next;
    });
  };

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
                  <div className="flex gap-2 pt-2">
                    <Button size="sm" variant="outline" onClick={openSummarizeDialog} className="gap-2">
                      <Sparkles className="w-4 h-4" /> Resumir con IA
                    </Button>
                    {selectedSummary && (selectedSummary.action_items as any[])?.length > 0 && (
                      <Button size="sm" variant="outline" onClick={openCreateTasksDialog} className="gap-2">
                        <ListTodo className="w-4 h-4" /> Crear tareas
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="transcripcion" className="w-full">
                    <TabsList>
                      <TabsTrigger value="transcripcion">Transcripción</TabsTrigger>
                      <TabsTrigger value="resumen">Resumen</TabsTrigger>
                      <TabsTrigger value="acciones">Items de Acción</TabsTrigger>
                    </TabsList>

                    <TabsContent value="transcripcion" className="mt-4 space-y-4">
                      {selectedTranscript ? (
                        <div className="space-y-3 max-h-96 overflow-y-auto">
                          {Array.isArray(selectedTranscript.raw_transcript) ? (
                            (selectedTranscript.raw_transcript as any[]).map((entry: any, i: number) => (
                              <div key={i} className="flex gap-3">
                                <div className="shrink-0">
                                  <Badge variant="outline" className="text-[10px]">{entry.speaker || `P${i + 1}`}</Badge>
                                </div>
                                <div>
                                  {entry.timestamp && <p className="text-xs text-muted-foreground">{entry.timestamp}</p>}
                                  <p className="text-sm text-foreground">{entry.text}</p>
                                </div>
                              </div>
                            ))
                          ) : (
                            <p className="text-sm text-muted-foreground">Formato de transcripción no reconocido</p>
                          )}
                        </div>
                      ) : (
                        <div className="py-6 text-center space-y-3">
                          <ClipboardPaste className="w-8 h-8 mx-auto text-muted-foreground" />
                          <p className="text-sm text-muted-foreground">No hay transcripción aún</p>
                          <p className="text-xs text-muted-foreground">Usa el botón "Resumir con IA" para pegar una transcripción y generar el resumen automáticamente</p>
                        </div>
                      )}
                    </TabsContent>

                    <TabsContent value="resumen" className="mt-4 space-y-4">
                      {selectedSummary ? (
                        <>
                          <div>
                            <h3 className="text-sm font-semibold text-foreground mb-2">Resumen Ejecutivo</h3>
                            <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
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
                            Pega una transcripción y usa "Resumir con IA" para generar el análisis
                          </p>
                        </div>
                      )}
                    </TabsContent>

                    <TabsContent value="acciones" className="mt-4">
                      {selectedSummary && Array.isArray(selectedSummary.action_items) && (selectedSummary.action_items as any[]).length > 0 ? (
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <p className="text-sm text-muted-foreground">{(selectedSummary.action_items as any[]).length} items detectados</p>
                            <Button size="sm" onClick={openCreateTasksDialog} className="gap-2">
                              <ListTodo className="w-4 h-4" /> Crear en Planificación
                            </Button>
                          </div>
                          <div className="space-y-2">
                            {(selectedSummary.action_items as any[]).map((item: any, i: number) => (
                              <div key={i} className="flex items-start gap-3 p-3 rounded-lg border border-border bg-background">
                                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                                  {i + 1}
                                </div>
                                <div className="flex-1">
                                  <p className="text-sm text-foreground">{typeof item === "string" ? item : item.task || item.description || JSON.stringify(item)}</p>
                                  <div className="flex gap-2 mt-1">
                                    {item.assignee && <Badge variant="outline" className="text-[10px]">{item.assignee}</Badge>}
                                    {item.priority && <Badge variant={item.priority === "high" ? "destructive" : "secondary"} className="text-[10px]">{item.priority}</Badge>}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="py-8 text-center">
                          <Users className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                          <p className="text-sm text-muted-foreground">Sin items de acción. Genera un resumen primero.</p>
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

      {/* Create meeting dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Nueva Reunión</DialogTitle>
            <DialogDescription>Crea una reunión y opcionalmente pega la transcripción para analizarla con IA.</DialogDescription>
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
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <ClipboardPaste className="w-4 h-4" /> Pegar transcripción (opcional)
              </Label>
              <Textarea
                placeholder="Pega aquí la transcripción de tu reunión desde cualquier herramienta externa..."
                value={pasteTranscript}
                onChange={e => setPasteTranscript(e.target.value)}
                rows={8}
                className="resize-y font-mono text-xs"
              />
              <p className="text-xs text-muted-foreground">Puedes pegar la transcripción ahora o después desde el detalle de la reunión</p>
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

      {/* Summarize dialog */}
      <Dialog open={showSummarize} onOpenChange={setShowSummarize}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" /> Resumir reunión con IA
            </DialogTitle>
            <DialogDescription>
              {selectedTranscript
                ? "La transcripción existente se usará para generar el resumen. Puedes editarla o reemplazarla."
                : "Pega la transcripción de la reunión y selecciona qué tipo de análisis deseas."
              }
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Transcripción</Label>
              <Textarea
                placeholder="Pega aquí la transcripción completa de la reunión..."
                value={summarizeTranscript}
                onChange={e => setSummarizeTranscript(e.target.value)}
                rows={10}
                className="resize-y font-mono text-xs"
              />
              {!summarizeTranscript.trim() && !selectedTranscript && (
                <p className="text-xs text-destructive">Necesitas pegar una transcripción para generar el resumen</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Tipo de análisis</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {SUMMARY_TYPES.map(type => (
                  <label
                    key={type.id}
                    className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                      selectedSummaryTypes.includes(type.id)
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/30"
                    }`}
                  >
                    <Checkbox
                      checked={selectedSummaryTypes.includes(type.id)}
                      onCheckedChange={() => toggleSummaryType(type.id)}
                      className="mt-0.5"
                    />
                    <div>
                      <p className="text-sm font-medium text-foreground">{type.label}</p>
                      <p className="text-xs text-muted-foreground">{type.description}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSummarize(false)}>Cancelar</Button>
            <Button
              onClick={() => summarizeMutation.mutate()}
              disabled={summarizeMutation.isPending || (!summarizeTranscript.trim() && !selectedTranscript)}
              className="gap-2"
            >
              {summarizeMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Analizando...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" /> Generar resumen
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create tasks dialog */}
      <Dialog open={showCreateTasks} onOpenChange={setShowCreateTasks}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ListTodo className="w-5 h-5 text-primary" /> Crear tareas en Planificación
            </DialogTitle>
            <DialogDescription>Selecciona los items de acción que quieres convertir en tareas y el proyecto destino.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Proyecto destino</Label>
              <Select value={targetProjectId} onValueChange={setTargetProjectId}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar proyecto..." />
                </SelectTrigger>
                <SelectContent>
                  {planningProjects.map((p: any) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {planningProjects.length === 0 && (
                <p className="text-xs text-destructive">No tienes proyectos activos. Crea uno en Planificación primero.</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Items de acción ({selectedActions.size} seleccionados)</Label>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {(selectedSummary?.action_items as any[] || []).map((item: any, i: number) => (
                  <label
                    key={i}
                    className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                      selectedActions.has(i) ? "border-primary bg-primary/5" : "border-border"
                    }`}
                  >
                    <Checkbox
                      checked={selectedActions.has(i)}
                      onCheckedChange={() => toggleAction(i)}
                      className="mt-0.5"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground">{typeof item === "string" ? item : item.task || item.description}</p>
                      <div className="flex gap-2 mt-1">
                        {item.assignee && <Badge variant="outline" className="text-[10px]">{item.assignee}</Badge>}
                        {item.priority && <Badge variant={item.priority === "high" ? "destructive" : "secondary"} className="text-[10px]">{item.priority}</Badge>}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateTasks(false)}>Cancelar</Button>
            <Button
              onClick={() => createTasksMutation.mutate()}
              disabled={createTasksMutation.isPending || selectedActions.size === 0 || !targetProjectId}
              className="gap-2"
            >
              {createTasksMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )}
              Crear {selectedActions.size} tarea{selectedActions.size !== 1 ? "s" : ""}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default ReunionesPage;
