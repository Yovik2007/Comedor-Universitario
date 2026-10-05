/**
 * Utilidades de las encuestas de comidas.
 * Agrega los votos por opción y localiza la respuesta de un estudiante.
 */

import type { Survey, SurveyResponse, SurveyResultRow } from "@/types";

/**
 * Devuelve los votos de cada opción de la encuesta.
 * El porcentaje se calcula sobre el número de respuestas (no sobre votos
 * totales), porque cada estudiante puede marcar varias comidas.
 */
export function computeSurveyResults(
  survey: Survey,
  responses: SurveyResponse[],
): SurveyResultRow[] {
  const votes = responses.filter((r) => r.surveyId === survey.id);
  const total = votes.length;

  return survey.options.map((option) => {
    const count = votes.filter((r) => r.optionIds.includes(option.id)).length;
    return {
      optionId: option.id,
      label: option.label,
      votes: count,
      percent: total === 0 ? 0 : Math.round((count / total) * 100),
    };
  });
}

/** Respuesta de un estudiante a una encuesta (null si aún no ha votado). */
export function findMySurveyResponse(
  responses: SurveyResponse[],
  surveyId: string,
  studentId: string | undefined,
): SurveyResponse | null {
  if (!studentId) return null;
  return (
    responses.find(
      (r) => r.surveyId === surveyId && r.studentId === studentId,
    ) ?? null
  );
}

/** Número de respuestas recibidas por una encuesta. */
export function countSurveyResponses(
  responses: SurveyResponse[],
  surveyId: string,
): number {
  return responses.filter((r) => r.surveyId === surveyId).length;
}
