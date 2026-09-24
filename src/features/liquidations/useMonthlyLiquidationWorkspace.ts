import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-hot-toast';
import { liquidacionesService, type LiquidationPreparationRow, type MonthlyLiquidationPreparation } from '../../services/liquidaciones.service';
import { currentMonthInput, formatMonthYear } from '../../utils/date';

export const useMonthlyLiquidationWorkspace = () => {
  const [period, setPeriod] = useState(currentMonthInput);
  const [preparation, setPreparation] = useState<MonthlyLiquidationPreparation | null>(null);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [reviewing, setReviewing] = useState<LiquidationPreparationRow | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await liquidacionesService.getPreparation(`${period}-01`);
      setPreparation(data);
      setSelectedIds(data.data.filter(row => row.status === 'LISTA').map(row => row.contratoId));
      setReviewing(current => current ? data.data.find(row => row.contratoId === current.contratoId) || null : null);
    } catch (error) {
      setPreparation(null);
      toast.error(error instanceof Error ? error.message : 'No se pudo preparar el período');
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => { void load(); }, [load]);

  const monthOptions = useMemo(() => {
    const [year, month] = currentMonthInput().split('-').map(Number);
    return Array.from({ length: 25 }, (_, index) => {
      const date = new Date(Date.UTC(year, month - 1 + index - 12, 1));
      const value = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
      return { value, label: formatMonthYear(`${value}-01`) };
    });
  }, []);

  const toggle = (contractId: number) => setSelectedIds(current =>
    current.includes(contractId) ? current.filter(id => id !== contractId) : [...current, contractId]
  );

  const generateSelected = async () => {
    if (!preparation || selectedIds.length === 0) return;
    setWorking(true);
    try {
      const rows = preparation.data.filter(row => selectedIds.includes(row.contratoId));
      const result = await liquidacionesService.generatePeriod(`${period}-01`, undefined, rows.map(row => ({
        contratoId: row.contratoId,
        contratoVersion: row.contratoVersion
      })));
      toast.success(result.created.length === 1 ? 'Se generó 1 borrador' : `Se generaron ${result.created.length} borradores`);
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudieron generar los borradores');
    } finally {
      setWorking(false);
    }
  };

  const generateReviewed = async (row: LiquidationPreparationRow, overdueIds: number[]) => {
    setWorking(true);
    try {
      const result = await liquidacionesService.generatePeriod(`${period}-01`, undefined, [{
        contratoId: row.contratoId,
        contratoVersion: row.contratoVersion,
        cuotasVencidasRevisadas: true,
        cuotasVencidasIds: overdueIds
      }]);
      if (!result.created.length) throw new Error(result.skipped[0]?.motivos.join('. ') || 'No se pudo generar el borrador');
      toast.success('Borrador generado con la decisión de cuotas guardada');
      setReviewing(null);
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo generar el borrador');
    } finally {
      setWorking(false);
    }
  };

  const dismiss = async (row: LiquidationPreparationRow, reason: string) => {
    setWorking(true);
    try {
      await liquidacionesService.dismissPreparation(row.contratoId, `${period}-01`, reason);
      toast.success('El contrato fue omitido para este período');
      setReviewing(null);
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo guardar la decisión');
    } finally {
      setWorking(false);
    }
  };

  const reopen = async (row: LiquidationPreparationRow) => {
    setWorking(true);
    try {
      await liquidacionesService.reopenPreparation(row.contratoId, `${period}-01`);
      toast.success('El contrato volvió a la preparación mensual');
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo reabrir el caso');
    } finally {
      setWorking(false);
    }
  };

  return {
    period, setPeriod, preparation, selectedIds, loading, working, reviewing, setReviewing,
    monthOptions, toggle, load, generateSelected, generateReviewed, dismiss, reopen
  };
};
