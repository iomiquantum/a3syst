import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { Trophy, ArrowUp, ArrowDown, Minus, ArrowLeft, Gift, Users, Star, Crown, ChevronLeft, ChevronRight } from 'lucide-react';

const ITEMS_PER_PAGE = 30;

const RankingPage = () => {
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    document.title = 'Ranking de Referidos — A3 SYS by IOMI';
    const fetchLeaderboard = async () => {
      const { data } = await supabase
        .rpc('get_launch_leaderboard');
      if (data) {
        const ranked = data.map((r: any, i: number) => ({
          ...r,
          rank: i + 1,
          posChange: r.previous_position ? r.previous_position - (i + 1) : 0,
        }));
        setLeaderboard(ranked);
      }
      setLoading(false);
    };
    fetchLeaderboard();
  }, []);

  const totalPages = Math.ceil(leaderboard.length / ITEMS_PER_PAGE);
  const paginatedData = leaderboard.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-[hsl(215,80%,8%)] via-[hsl(215,60%,12%)] to-[hsl(215,50%,6%)] text-white">
      {/* Header */}
      <header className="border-b border-white/10 bg-white/5 backdrop-blur-md">
        <div className="mx-auto max-w-5xl px-4 py-4 flex items-center justify-between">
          <Link to="/lanzamiento">
            <Button variant="ghost" className="text-white/70 hover:text-white hover:bg-white/10">
              <ArrowLeft className="mr-2 h-4 w-4" /> Volver al lanzamiento
            </Button>
          </Link>
          <span className="text-sm font-bold tracking-wider text-white/50">A3 SYS</span>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-12">
        {/* Title */}
        <div className="text-center mb-10">
          <Trophy className="mx-auto mb-4 h-12 w-12 text-[hsl(38,92%,55%)]" />
          <h1 className="text-3xl md:text-4xl font-bold mb-3" style={{ fontFamily: 'Sora, sans-serif' }}>
            Ranking de Referidos en Tiempo Real
          </h1>
          <p className="text-white/60 max-w-2xl mx-auto">
            Compite por premios increíbles. Comparte tu código, suma referidos y escala en el ranking.
          </p>
        </div>

        {/* Contest Info */}
        <div className="grid gap-4 sm:grid-cols-3 mb-10">
          <Card className="bg-[hsl(38,92%,55%)]/10 border-[hsl(38,92%,55%)]/20 backdrop-blur-md">
            <CardContent className="p-5 text-center">
              <Crown className="mx-auto mb-2 h-8 w-8 text-[hsl(38,92%,55%)]" />
              <p className="text-2xl font-bold text-[hsl(38,92%,55%)]">🥇 1er Lugar</p>
              <p className="text-sm text-white/70 mt-1">1 Año GRATIS del Plan FULL</p>
              <p className="text-xs text-white/40 mt-0.5">Valorado en $2,388</p>
            </CardContent>
          </Card>
          <Card className="bg-[hsl(215,30%,60%)]/10 border-[hsl(215,30%,60%)]/20 backdrop-blur-md">
            <CardContent className="p-5 text-center">
              <Star className="mx-auto mb-2 h-8 w-8 text-[hsl(215,30%,60%)]" />
              <p className="text-2xl font-bold text-[hsl(215,30%,60%)]">🥈 2do Lugar</p>
              <p className="text-sm text-white/70 mt-1">6 Meses GRATIS del Plan FULL</p>
              <p className="text-xs text-white/40 mt-0.5">Valorado en $1,194</p>
            </CardContent>
          </Card>
          <Card className="bg-[hsl(25,60%,50%)]/10 border-[hsl(25,60%,50%)]/20 backdrop-blur-md">
            <CardContent className="p-5 text-center">
              <Gift className="mx-auto mb-2 h-8 w-8 text-[hsl(25,60%,50%)]" />
              <p className="text-2xl font-bold text-[hsl(25,60%,50%)]">🥉 3er Lugar</p>
              <p className="text-sm text-white/70 mt-1">3 Meses GRATIS del Plan FULL</p>
              <p className="text-xs text-white/40 mt-0.5">Valorado en $597</p>
            </CardContent>
          </Card>
        </div>

        <div className="text-center mb-6">
          <Badge className="bg-[hsl(160,55%,42%)]/20 text-[hsl(160,55%,55%)] border-[hsl(160,55%,42%)]/30 text-sm px-4 py-1.5">
            <Users className="mr-2 h-4 w-4" />
            Todos los que consigan 4+ referidos reciben su 1er mes GRATIS
          </Badge>
        </div>

        {/* Full Table */}
        <Card className="bg-white/5 border-white/10 backdrop-blur-md overflow-hidden">
          <CardContent className="p-0">
            {loading ? (
              <p className="p-12 text-center text-white/40">Cargando ranking...</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10 bg-white/5">
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-white/50">#</th>
                      <th className="px-3 py-3 text-center text-xs font-semibold uppercase tracking-wider text-white/50 w-10"></th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-white/50">Participante</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-white/50 hidden sm:table-cell">Negocio</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-white/50">Referidos</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-white/50">Premio</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedData.map((p) => (
                      <tr
                        key={p.id}
                        className={`border-b border-white/5 transition-colors hover:bg-white/5 ${
                          p.rank === 1 ? 'bg-[hsl(38,92%,55%)]/10' : p.rank === 2 ? 'bg-[hsl(215,30%,60%)]/5' : p.rank === 3 ? 'bg-[hsl(25,60%,50%)]/5' : ''
                        }`}
                      >
                        <td className="px-4 py-3 font-bold text-white/80">
                          {p.rank <= 3 ? (
                            <span className="text-lg">{p.rank === 1 ? '🥇' : p.rank === 2 ? '🥈' : '🥉'}</span>
                          ) : (
                            <span className="text-white/40">{p.rank}</span>
                          )}
                        </td>
                        <td className="px-3 py-3 text-center">
                          {p.posChange > 0 ? (
                            <ArrowUp className="h-3.5 w-3.5 text-[hsl(160,55%,55%)] mx-auto" />
                          ) : p.posChange < 0 ? (
                            <ArrowDown className="h-3.5 w-3.5 text-red-400 mx-auto" />
                          ) : (
                            <Minus className="h-3.5 w-3.5 text-white/20 mx-auto" />
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`font-medium ${p.rank <= 3 ? 'text-white' : 'text-white/70'}`}>{p.full_name}</span>
                        </td>
                        <td className="px-4 py-3 text-white/50 hidden sm:table-cell">{p.business_name}</td>
                        <td className="px-4 py-3 text-right">
                          <span className={`font-bold text-lg ${p.rank <= 3 ? 'text-[hsl(160,55%,55%)]' : 'text-white/70'}`}>
                            {p.referral_count}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {p.rank === 1 && <Badge className="bg-[hsl(38,92%,55%)] text-[hsl(38,92%,15%)] text-xs">1 Año</Badge>}
                          {p.rank === 2 && <Badge className="bg-[hsl(215,30%,60%)] text-white text-xs">6 Meses</Badge>}
                          {p.rank === 3 && <Badge className="bg-[hsl(25,60%,50%)] text-white text-xs">3 Meses</Badge>}
                          {p.rank > 3 && p.referral_count >= 4 && <Badge variant="outline" className="border-[hsl(160,55%,42%)]/50 text-[hsl(160,55%,55%)] text-xs">1 Mes</Badge>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-6">
            <Button
              variant="ghost"
              size="sm"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(p => p - 1)}
              className="text-white/60 hover:text-white hover:bg-white/10 disabled:opacity-30"
            >
              <ChevronLeft className="h-4 w-4 mr-1" /> Anterior
            </Button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
              <Button
                key={page}
                variant="ghost"
                size="sm"
                onClick={() => setCurrentPage(page)}
                className={`w-9 h-9 ${currentPage === page ? 'bg-white/15 text-white font-bold' : 'text-white/40 hover:text-white hover:bg-white/10'}`}
              >
                {page}
              </Button>
            ))}
            <Button
              variant="ghost"
              size="sm"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(p => p + 1)}
              className="text-white/60 hover:text-white hover:bg-white/10 disabled:opacity-30"
            >
              Siguiente <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        )}

        <p className="text-center text-xs text-white/30 mt-4">
          * Ranking actualizado diariamente. El ganador se define al momento del lanzamiento (1° de Abril 2026).
        </p>

        {/* CTA */}
        <div className="text-center mt-10 px-4">
          <Link to="/lanzamiento#register">
            <Button size="lg" className="bg-[hsl(160,55%,42%)] hover:bg-[hsl(160,55%,36%)] text-white font-bold text-base md:text-lg px-10 md:px-14 py-6 md:py-7 w-full sm:w-auto max-w-md">
              ¡Regístrate y compite! 🚀
            </Button>
          </Link>
        </div>
      </main>
    </div>
  );
};

export default RankingPage;
