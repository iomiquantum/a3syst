import { useState, useMemo, useCallback } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { MoreVertical, Eye, Shield, KeyRound, History, Trash2 } from "lucide-react";
import { UsuarioCompleto, roleLabelsAdmin, roleColors, estadoColors } from "@/hooks/useUsuariosAdmin";

interface UsersTableProps {
  usuarios: UsuarioCompleto[];
  isLoading: boolean;
  page: number;
  pageSize: number;
  onPageChange: (p: number) => void;
  onViewUser: (u: UsuarioCompleto) => void;
  onChangeRole: (u: UsuarioCompleto, roleId: string, currentRole: string) => void;
  onSuspend: (u: UsuarioCompleto) => void;
  onReactivate: (u: UsuarioCompleto) => void;
  onResetPassword: (email: string) => void;
  onViewHistory: (u: UsuarioCompleto) => void;
  onDelete: (u: UsuarioCompleto) => void;
}

const UsersTable = ({ usuarios, isLoading, page, pageSize, onPageChange, onViewUser, onChangeRole, onSuspend, onReactivate, onResetPassword, onViewHistory, onDelete }: UsersTableProps) => {
  const [deleteUser, setDeleteUser] = useState<UsuarioCompleto | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState("");

  const paginatedUsers = useMemo(() => {
    const start = (page - 1) * pageSize;
    return usuarios.slice(start, start + pageSize);
  }, [usuarios, page, pageSize]);

  const totalPages = Math.ceil(usuarios.length / pageSize);

  const initials = useCallback((name: string) => {
    const parts = name.split(" ");
    return parts.length >= 2 ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase() : name.substring(0, 2).toUpperCase();
  }, []);

  if (isLoading) {
    return (
      <Card><CardContent className="p-4 space-y-3">
        {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-14 w-full" />)}
      </CardContent></Card>
    );
  }

  if (usuarios.length === 0) {
    return (
      <Card><CardContent className="py-16 text-center">
        <p className="text-muted-foreground text-lg">No se encontraron usuarios</p>
        <p className="text-sm text-muted-foreground mt-1">Intenta cambiar los filtros de búsqueda</p>
      </CardContent></Card>
    );
  }

  return (
    <>
      {/* Desktop table */}
      <Card className="shadow-card hidden md:block">
        <CardContent className="p-0">
          <table className="w-full">
             <thead>
              <tr className="border-b border-border">
                <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-3">Usuario</th>
                <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-3">Empresa</th>
                <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-3">Rol</th>
                <th className="text-center text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-3">Activo</th>
                <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-3">Último acceso</th>
                <th className="text-right text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-3">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {paginatedUsers.map(u => (
                <tr key={u.user_id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <Avatar className="w-9 h-9">
                        <AvatarFallback className="text-xs bg-primary/10 text-primary">{initials(u.full_name)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">{u.full_name} {u.apellido}</p>
                        <p className="text-xs text-muted-foreground">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex flex-wrap gap-1">
                      {u.roles.length === 0 ? <span className="text-xs text-muted-foreground">—</span> :
                        u.roles.map(r => (
                          <Badge key={r.id} variant="outline" className="text-xs">{r.clinic_name}</Badge>
                        ))
                      }
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex flex-wrap gap-1">
                      {u.roles.length === 0 ? <span className="text-xs text-muted-foreground">—</span> :
                        u.roles.map(r => (
                          <Badge key={r.id} className={`text-xs ${roleColors[r.role] || "bg-muted"}`}>
                            {roleLabelsAdmin[r.role] || r.role}
                          </Badge>
                        ))
                      }
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-center">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="inline-flex items-center">
                            <Switch
                              checked={u.estado === "activo"}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  onReactivate(u);
                                } else {
                                  onSuspend(u);
                                }
                              }}
                            />
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          {u.estado === "activo" ? "Desactivar usuario" : "Activar usuario"}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </td>
                  <td className="px-5 py-3.5 text-sm text-muted-foreground">
                    {u.ultimo_acceso ? formatDistanceToNow(new Date(u.ultimo_acceso), { addSuffix: true, locale: es }) : "Nunca"}
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="w-4 h-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onViewUser(u)}><Eye className="w-4 h-4 mr-2" /> Ver perfil</DropdownMenuItem>
                        {u.roles.length > 0 && (
                          <DropdownMenuItem onClick={() => onChangeRole(u, u.roles[0].id, u.roles[0].role)}>
                            <Shield className="w-4 h-4 mr-2" /> Cambiar rol
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={() => onResetPassword(u.email)}><KeyRound className="w-4 h-4 mr-2" /> Reset contraseña</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onViewHistory(u)}><History className="w-4 h-4 mr-2" /> Historial</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive" onClick={() => setDeleteUser(u)}>
                          <Trash2 className="w-4 h-4 mr-2" /> Eliminar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {paginatedUsers.map(u => (
          <Card key={u.user_id} className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <Avatar className="w-10 h-10">
                  <AvatarFallback className="text-xs bg-primary/10 text-primary">{initials(u.full_name)}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium">{u.full_name} {u.apellido}</p>
                  <p className="text-xs text-muted-foreground">{u.email}</p>
                </div>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="w-4 h-4" /></Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onViewUser(u)}><Eye className="w-4 h-4 mr-2" /> Ver perfil</DropdownMenuItem>
                  {u.roles.length > 0 && (
                    <DropdownMenuItem onClick={() => onChangeRole(u, u.roles[0].id, u.roles[0].role)}>
                      <Shield className="w-4 h-4 mr-2" /> Cambiar rol
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem className="text-destructive" onClick={() => setDeleteUser(u)}>
                    <Trash2 className="w-4 h-4 mr-2" /> Eliminar
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <div className="flex flex-wrap gap-1 mt-2">
              {u.roles.map(r => (
                <Badge key={r.id} className={`text-xs ${roleColors[r.role] || "bg-muted"}`}>{roleLabelsAdmin[r.role] || r.role}</Badge>
              ))}
              <Badge className={`text-xs ${estadoColors[u.estado] || "bg-muted"}`}>{u.estado}</Badge>
            </div>
          </Card>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-muted-foreground">
            Mostrando {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, usuarios.length)} de {usuarios.length}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>Anterior</Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>Siguiente</Button>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteUser} onOpenChange={v => { if (!v) { setDeleteUser(null); setDeleteConfirm(""); } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar usuario?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción marcará al usuario como inactivo. Escribe el nombre del usuario para confirmar: <strong>{deleteUser?.full_name}</strong>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Input value={deleteConfirm} onChange={e => setDeleteConfirm(e.target.value)} placeholder="Escribe el nombre..." />
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleteConfirm !== deleteUser?.full_name}
              onClick={() => { if (deleteUser) { onDelete(deleteUser); setDeleteUser(null); setDeleteConfirm(""); } }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default UsersTable;
