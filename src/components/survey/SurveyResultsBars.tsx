import { computeSurveyResults } from "@/utils/surveyUtils";
import { ProgressBar } from "@/components/ui/ProgressBar";
import type { Survey, SurveyResponse } from "@/types";

interface SurveyResultsBarsProps {
  survey: Survey;
  responses: SurveyResponse[];
}

/**
 * Barras de resultados de una encuesta (las usan el estudiante y el admin).
 * El porcentaje es sobre respuestas, porque cada estudiante puede marcar
 * varias comidas.
 */
export function SurveyResultsBars({
  survey,
  responses,
}: SurveyResultsBarsProps) {
  const rows = computeSurveyResults(survey, responses);
  const total = responses.filter((r) => r.surveyId === survey.id).length;

  if (total === 0) {
    return (
      <p className="rounded-lg bg-surface/70 px-3.5 py-3 text-sm text-muted">
        Aún no hay respuestas. ¡Sé la primera persona en votar!
      </p>
    );
  }

  const maxVotes = Math.max(...rows.map((r) => r.votes));

  return (
    <div className="space-y-3.5">
      {rows.map((row) => (
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
