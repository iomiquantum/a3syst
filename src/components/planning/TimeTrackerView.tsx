import { useState, useEffect, useRef, useCallback } from "react";
import { Play, Square, Pause, Camera, Clock, Monitor, AppWindow, Settings2, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import {
  PlanningTask,
  PlanningColumn,
  useTimeEntries,
  useStartTimeEntry,
  useStopTimeEntry,
  useSaveScreenshot,
  useScreenshots,
} from "@/hooks/usePlanning";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";

interface Props {
  tasks: PlanningTask[];
  columns: PlanningColumn[];
  profiles: { user_id: string; full_name: string }[];
}

function formatDuration(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export default function TimeTrackerView({ tasks, columns, profiles }: Props) {
  const { user } = useAuth();
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [activeEntryId, setActiveEntryId] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [screenshotInterval, setScreenshotInterval] = useState(5); // minutes
  const [tabCapture, setTabCapture] = useState(true);
  const [screenCapture, setScreenCapture] = useState(false);
  const [viewingEntryId, setViewingEntryId] = useState<string | null>(null);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const screenshotRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const startTimeRef = useRef<number>(0);
  const pausedElapsedRef = useRef(0);

  const { data: timeEntries } = useTimeEntries();
  const startEntry = useStartTimeEntry();
  const stopEntry = useStopTimeEntry();
  const saveScreenshot = useSaveScreenshot();
  const { data: screenshots } = useScreenshots(viewingEntryId || undefined);

  const myEntries = (timeEntries || []).filter(e => e.user_id === user?.id);
  const todayEntries = myEntries.filter(e => new Date(e.started_at).toDateString() === new Date().toDateString());
  const totalToday = todayEntries.reduce((acc, e) => acc + (e.duration_seconds || 0), 0);

  const captureScreenshot = useCallback(async () => {
    if (!activeEntryId) return;
    try {
      if (tabCapture) {
        // @ts-ignore
        const stream = await navigator.mediaDevices.getDisplayMedia({ video: { displaySurface: "browser" }, preferCurrentTab: true });
        const track = stream.getVideoTracks()[0];
        // @ts-ignore
        const imageCapture = new ImageCapture(track);
        const bitmap = await imageCapture.grabFrame();
        track.stop();
        const canvas = document.createElement("canvas");
        canvas.width = bitmap.width;
        canvas.height = bitmap.height;
        canvas.getContext("2d")!.drawImage(bitmap, 0, 0);
        const blob = await new Promise<Blob>((res) => canvas.toBlob(b => res(b!), "image/png"));
        saveScreenshot.mutate({ timeEntryId: activeEntryId, blob, captureType: "tab" });
      }
      if (screenCapture) {
        const stream = await navigator.mediaDevices.getDisplayMedia({ video: { displaySurface: "monitor" } });
        const track = stream.getVideoTracks()[0];
        // @ts-ignore
        const imageCapture = new ImageCapture(track);
        const bitmap = await imageCapture.grabFrame();
        track.stop();
        const canvas = document.createElement("canvas");
        canvas.width = bitmap.width;
        canvas.height = bitmap.height;
        canvas.getContext("2d")!.drawImage(bitmap, 0, 0);
        const blob = await new Promise<Blob>((res) => canvas.toBlob(b => res(b!), "image/png"));
        saveScreenshot.mutate({ timeEntryId: activeEntryId, blob, captureType: "screen" });
      }
    } catch {
      toast({ title: "Captura rechazada", description: "El usuario canceló el permiso de captura", variant: "destructive" });
    }
  }, [activeEntryId, tabCapture, screenCapture, saveScreenshot]);

  const handleStart = () => {
    if (!selectedTaskId) return;
    startEntry.mutate(selectedTaskId, {
      onSuccess: (data) => {
        setActiveEntryId(data.id);
        startTimeRef.current = Date.now();
        pausedElapsedRef.current = 0;
        setElapsed(0);
        setIsPaused(false);

        intervalRef.current = setInterval(() => {
          setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000) + pausedElapsedRef.current);
        }, 1000);

        if ((tabCapture || screenCapture) && screenshotInterval > 0) {
          screenshotRef.current = setInterval(() => {
            captureScreenshot();
          }, screenshotInterval * 60 * 1000);
        }
      },
    });
  };

  const handlePause = () => {
    if (isPaused) {
      startTimeRef.current = Date.now();
      intervalRef.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000) + pausedElapsedRef.current);
      }, 1000);
      setIsPaused(false);
    } else {
      pausedElapsedRef.current = elapsed;
      if (intervalRef.current) clearInterval(intervalRef.current);
      setIsPaused(true);
    }
  };

  const handleStop = () => {
    if (!activeEntryId) return;
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (screenshotRef.current) clearInterval(screenshotRef.current);
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
    stopEntry.mutate({ id: activeEntryId, duration_seconds: elapsed }, {
      onSuccess: () => {
        setActiveEntryId(null);
        setElapsed(0);
        setIsPaused(false);
        toast({ title: "Tiempo registrado", description: formatDuration(elapsed) });
      },
    });
  };

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (screenshotRef.current) clearInterval(screenshotRef.current);
    };
  }, []);

  const getTaskName = (taskId: string) => tasks.find(t => t.id === taskId)?.title || "—";
  const getColName = (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return "";
    return columns.find(c => c.id === task.column_id)?.name || "";
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-foreground">Control de Tiempo</h2>

      {/* Timer Card */}
      <Card className="border-2 border-primary/20">
        <CardContent className="pt-6 space-y-4">
          <div className="text-center">
            <p className={cn("text-5xl font-mono font-bold tracking-wider", activeEntryId ? "text-primary" : "text-muted-foreground")}>
              {formatDuration(elapsed)}
            </p>
            {activeEntryId && selectedTaskId && (
              <p className="text-sm text-muted-foreground mt-1">{getTaskName(selectedTaskId)}</p>
            )}
          </div>

          <div className="flex items-center gap-3 justify-center">
            {!activeEntryId ? (
              <>
                <Select value={selectedTaskId || ""} onValueChange={setSelectedTaskId}>
                  <SelectTrigger className="w-64"><SelectValue placeholder="Seleccionar tarea..." /></SelectTrigger>
                  <SelectContent>
                    {tasks.map(t => (
                      <SelectItem key={t.id} value={t.id}>
                        <span className="truncate">{t.title}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button onClick={handleStart} disabled={!selectedTaskId || startEntry.isPending} className="gap-2 gradient-primary text-primary-foreground">
                  <Play className="w-4 h-4" /> Iniciar
                </Button>
              </>
            ) : (
              <>
                <Button onClick={handlePause} variant="outline" size="icon" className="w-12 h-12 rounded-full">
                  {isPaused ? <Play className="w-5 h-5" /> : <Pause className="w-5 h-5" />}
                </Button>
                <Button onClick={handleStop} variant="destructive" size="icon" className="w-12 h-12 rounded-full">
                  <Square className="w-5 h-5" />
                </Button>
                <Button onClick={captureScreenshot} variant="outline" size="icon" className="w-12 h-12 rounded-full" disabled={!tabCapture && !screenCapture}>
                  <Camera className="w-5 h-5" />
                </Button>
              </>
            )}
          </div>

          {/* Settings */}
          <div className="border-t border-border pt-4 mt-4">
            <div className="flex items-center gap-2 mb-3">
              <Settings2 className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">Configuración de capturas</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="flex items-center gap-3">
                <Switch checked={tabCapture} onCheckedChange={setTabCapture} />
                <div className="flex items-center gap-1.5">
                  <AppWindow className="w-4 h-4 text-muted-foreground" />
                  <Label className="text-xs">Pestaña del navegador</Label>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Switch checked={screenCapture} onCheckedChange={setScreenCapture} />
                <div className="flex items-center gap-1.5">
                  <Monitor className="w-4 h-4 text-muted-foreground" />
                  <Label className="text-xs">Pantalla completa</Label>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-xs whitespace-nowrap">Cada</Label>
                <Input
                  type="number"
                  min={1}
                  max={60}
                  value={screenshotInterval}
                  onChange={e => setScreenshotInterval(Number(e.target.value))}
                  className="w-16 h-7 text-xs"
                />
                <Label className="text-xs">min</Label>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Today summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Hoy</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold font-mono">{formatDuration(totalToday + (activeEntryId ? elapsed : 0))}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Sesiones hoy</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{todayEntries.length + (activeEntryId ? 1 : 0)}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total registros</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{myEntries.length}</p></CardContent>
        </Card>
      </div>

      {/* Recent entries */}
      <Card>
        <CardHeader><CardTitle className="text-sm">Registros recientes</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-2">
            {myEntries.slice(0, 20).map(entry => (
              <div key={entry.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                <Clock className="w-4 h-4 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{getTaskName(entry.task_id)}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(entry.started_at).toLocaleString("es", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                    {" · "}{getColName(entry.task_id)}
                  </p>
                </div>
                <Badge variant="secondary" className="font-mono text-xs">{formatDuration(entry.duration_seconds)}</Badge>
                <Button variant="ghost" size="icon" className="w-7 h-7" onClick={() => setViewingEntryId(entry.id)}>
                  <ImageIcon className="w-3.5 h-3.5" />
                </Button>
              </div>
            ))}
            {myEntries.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">Sin registros de tiempo</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Screenshots viewer */}
      <Dialog open={!!viewingEntryId} onOpenChange={open => !open && setViewingEntryId(null)}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader><DialogTitle>Capturas de pantalla</DialogTitle></DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            <div className="grid grid-cols-2 gap-3">
              {(screenshots || []).map(ss => (
                <div key={ss.id} className="border border-border rounded-lg overflow-hidden">
                  <img src={ss.image_url} alt="Screenshot" className="w-full h-auto" />
                  <div className="px-2 py-1 bg-muted/50 flex items-center justify-between">
                    <span className="text-[10px] text-muted-foreground">{new Date(ss.captured_at).toLocaleTimeString("es")}</span>
                    <Badge variant="outline" className="text-[10px]">{ss.capture_type === "tab" ? "Pestaña" : "Pantalla"}</Badge>
                  </div>
                </div>
              ))}
              {(!screenshots || screenshots.length === 0) && (
                <p className="text-sm text-muted-foreground col-span-2 text-center py-8">Sin capturas para esta sesión</p>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
