import { useState } from "react";
import { Search, Plus, MoreHorizontal, Phone, Mail } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const patientsData = [
  { id: 1, name: "María García", email: "maria@email.com", phone: "+52 555 123 4567", age: 34, lastVisit: "2025-02-05", status: "Activo", initials: "MG" },
  { id: 2, name: "Carlos López", email: "carlos@email.com", phone: "+52 555 234 5678", age: 45, lastVisit: "2025-02-04", status: "Activo", initials: "CL" },
  { id: 3, name: "Ana Martínez", email: "ana@email.com", phone: "+52 555 345 6789", age: 28, lastVisit: "2025-02-03", status: "Activo", initials: "AM" },
  { id: 4, name: "Roberto Díaz", email: "roberto@email.com", phone: "+52 555 456 7890", age: 52, lastVisit: "2025-02-02", status: "Inactivo", initials: "RD" },
  { id: 5, name: "Lucía Fernández", email: "lucia@email.com", phone: "+52 555 567 8901", age: 39, lastVisit: "2025-01-28", status: "Activo", initials: "LF" },
  { id: 6, name: "Pedro Sánchez", email: "pedro@email.com", phone: "+52 555 678 9012", age: 61, lastVisit: "2025-01-25", status: "Activo", initials: "PS" },
  { id: 7, name: "Carmen Ruiz", email: "carmen@email.com", phone: "+52 555 789 0123", age: 43, lastVisit: "2025-01-20", status: "Inactivo", initials: "CR" },
  { id: 8, name: "Diego Torres", email: "diego@email.com", phone: "+52 555 890 1234", age: 37, lastVisit: "2025-01-18", status: "Activo", initials: "DT" },
];

const PacientesPage = () => {
  const [search, setSearch] = useState("");

  const filtered = patientsData.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Pacientes</h1>
            <p className="text-muted-foreground">Gestiona tu lista de pacientes</p>
          </div>
          <Button className="gradient-primary text-primary-foreground hover:opacity-90">
            <Plus className="w-4 h-4 mr-2" />
            Nuevo Paciente
          </Button>
        </div>

        <Card className="shadow-card">
          <CardContent className="p-0">
            {/* Search */}
            <div className="p-4 border-b border-border">
              <div className="relative w-80">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar paciente..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10 bg-background h-9"
                />
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-3">Paciente</th>
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-3">Contacto</th>
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-3">Edad</th>
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-3">Última Visita</th>
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-3">Estado</th>
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((patient) => (
                    <tr key={patient.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full gradient-primary flex items-center justify-center shrink-0">
                            <span className="text-xs font-semibold text-primary-foreground">{patient.initials}</span>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-foreground">{patient.name}</p>
                            <p className="text-xs text-muted-foreground">{patient.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <button className="p-1.5 rounded-md hover:bg-muted transition-colors">
                            <Phone className="w-3.5 h-3.5 text-muted-foreground" />
                          </button>
                          <button className="p-1.5 rounded-md hover:bg-muted transition-colors">
                            <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                          </button>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-sm text-foreground">{patient.age} años</td>
                      <td className="px-5 py-3.5 text-sm text-muted-foreground">{patient.lastVisit}</td>
                      <td className="px-5 py-3.5">
                        <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                          patient.status === "Activo"
                            ? "bg-success/10 text-success"
                            : "bg-muted text-muted-foreground"
                        }`}>
                          {patient.status}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <button className="p-1.5 rounded-md hover:bg-muted transition-colors">
                          <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default PacientesPage;
