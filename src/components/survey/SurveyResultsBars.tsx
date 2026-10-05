import { ProgressBar } from "@/components/ui/ProgressBar";
import type { SurveyResultRow } from "@/types";

interface SurveyResultsBarsProps {
  /** Votos y porcentaje de cada opción (contexto.getSurveyResults). */
  results: SurveyResultRow[];
  /** Número de estudiantes que respondieron (contexto.getSurveyTotal). */
  total: number;
}

/**
 * Barras de resultados de una encuesta (las usan el estudiante y el admin).
 * Los datos llegan ya agregados: en modo Supabase los calcula la base
 * (vw_survey_results) y solo contiene conteos, nunca quién votó qué.
 * El porcentaje es sobre respuestas, porque cada estudiante puede marcar
 * varias comidas.
 */
export function SurveyResultsBars({ results, total }: SurveyResultsBarsProps) {
  if (total === 0) {
    return (
      <p className="rounded-lg bg-surface/70 px-3.5 py-3 text-sm text-muted">
        Aún no hay respuestas. ¡Sé la primera persona en votar!
      </p>
    );
  }

  const maxVotes = Math.max(...results.map((r) => r.votes));

  return (
    <div className="space-y-3.5">
      {results.map((row) => (
        <div key={row.optionId}>
          <div className="mb-1.5 flex items-center justify-between gap-3 text-sm">
            <span className="min-w-0 truncate font-medium text-ink">
              {row.label}
            </span>
            <span className="shrink-0 text-xs font-semibold text-muted">
              {row.votes} {row.votes === 1 ? "voto" : "votos"} · {row.percent}%
            </span>
          </div>
          <ProgressBar
            percent={row.percent}
            tone={maxVotes > 0 && row.votes === maxVotes ? "success" : "primary"}
          />
        </div>
      ))}

      <p className="pt-0.5 text-xs text-muted">
        {total} {total === 1 ? "respuesta" : "respuestas"} · Cada estudiante
        puede marcar varias comidas.
      </p>
    </div>
  );
}
