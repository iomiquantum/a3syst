import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Search, X } from "lucide-react";

interface UserFiltersProps {
  search: string;
  onSearchChange: (v: string) => void;
  empresa: string;
  onEmpresaChange: (v: string) => void;
  rol: string;
  onRolChange: (v: string) => void;
  estado: string;
  onEstadoChange: (v: string) => void;
  clinics: { id: string; name: string }[];
  onClear: () => void;
}

const UserFilters = ({ search, onSearchChange, empresa, onEmpresaChange, rol, onRolChange, estado, onEstadoChange, clinics, onClear }: UserFiltersProps) => {
  const hasFilters = search || empresa || rol || estado;

  return (
    <div className="flex flex-wrap gap-3 items-center">
      <div className="relative flex-1 min-w-[200px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nombre, email..."
          value={search}
          onChange={e => onSearchChange(e.target.value)}
          className="pl-9"
        />
      </div>
      <Select value={empresa} onValueChange={onEmpresaChange}>
        <SelectTrigger className="w-[180px]"><SelectValue placeholder="Empresa" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todas</SelectItem>
          {clinics.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
        </SelectContent>
      </Select>
      <Select value={rol} onValueChange={onRolChange}>
        <SelectTrigger className="w-[160px]"><SelectValue placeholder="Rol" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos</SelectItem>
          <SelectItem value="super_admin">Super Admin</SelectItem>
          <SelectItem value="admin">Administrador</SelectItem>
          <SelectItem value="manager">Gerente</SelectItem>
          <SelectItem value="empleado">Empleado</SelectItem>
          <SelectItem value="vendedor">Vendedor</SelectItem>
          <SelectItem value="secretary">Secretario/a</SelectItem>
          <SelectItem value="professional">Profesional</SelectItem>
        </SelectContent>
      </Select>
      <Select value={estado} onValueChange={onEstadoChange}>
        <SelectTrigger className="w-[140px]"><SelectValue placeholder="Estado" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos</SelectItem>
          <SelectItem value="activo">Activo</SelectItem>
          <SelectItem value="inactivo">Inactivo</SelectItem>
          <SelectItem value="suspendido">Suspendido</SelectItem>
          <SelectItem value="pendiente">Pendiente</SelectItem>
        </SelectContent>
      </Select>
      {hasFilters && (
        <Button variant="ghost" size="sm" onClick={onClear}>
          <X className="w-4 h-4 mr-1" /> Limpiar
        </Button>
      )}
    </div>
  );
};

export default UserFilters;
