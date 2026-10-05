import { useState } from "react";
import { Check, ListChecks, Vote } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { useToast } from "@/context/ToastContext";
import { PageHeader } from "@/components/ui/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { SurveyResultsBars } from "@/components/survey/SurveyResultsBars";
import { findMySurveyResponse } from "@/utils/surveyUtils";
import { formatShort } from "@/utils/dates";

export function SurveysPage() {
  const {
    surveys,
    surveyResponses,
    currentStudent,
    submitSurveyResponse,
    getSurveyResults,
    getSurveyTotal,
  } = useApp();
  const { push } = useToast();

  // Selección en curso por encuesta (si no se tocó, se usa la respuesta guardada).
  const [selections, setSelections] = useState<Record<string, string[]>>({});

  // Abiertas primero; dentro de cada grupo, las más recientes.
  const ordered = [...surveys].sort((a, b) => {
    if (a.active !== b.active) return a.active ? -1 : 1;
    return a.createdAt < b.createdAt ? 1 : -1;
  });

  const toggleOption = (surveyId: string, optionId: string, saved: string[]) => {
    setSelections((prev) => {
      // Parte de lo ya votado para que al editar no se pierdan las marcas.
      const current = prev[surveyId] ?? saved;
      return {
        ...prev,
        [surveyId]: current.includes(optionId)
          ? current.filter((id) => id !== optionId)
          : [...current, optionId],
      };
    });
  };

  const handleSubmit = async (surveyId: string, chosen: string[]) => {
    const result = await submitSurveyResponse(surveyId, chosen);
    if (result.ok) {
      push("success", result.message);
      // Se limpia la selección para que vuelva a leer la respuesta guardada.
      setSelections((prev) => {
        const next = { ...prev };
        delete next[surveyId];
        return next;
      });
    } else {
      push("error", result.message);
    }
  };

  return (
    <div>
      <PageHeader
        title="Encuestas de comidas"
        subtitle="Vota qué te gustaría ver en el comedor y consulta los resultados en vivo."
      />

      {ordered.length === 0 ? (
        <EmptyState
          icon={Vote}
          title="No hay encuestas disponibles."
          description="Cuando el administrador publique una encuesta, aparecerá aquí."
        />
      ) : (
        <div className="space-y-6">
          {ordered.map((survey) => {
            const myResponse = findMySurveyResponse(
              surveyResponses,
              survey.id,
              currentStudent?.id,
            );
            const selected = selections[survey.id] ?? myResponse?.optionIds ?? [];
            const total = getSurveyTotal(survey.id);
            const showResults = Boolean(myResponse) || !survey.active;

            return (
              <article key={survey.id} className="card p-5 sm:p-6">
                <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-bold text-ink">
                        {survey.title}
                      </h2>
                      <Badge variant={survey.active ? "success" : "neutral"} dot>
                        {survey.active ? "Abierta" : "Cerrada"}
                      </Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted">{survey.question}</p>
                  </div>

                  <span className="shrink-0 rounded-lg bg-surface px-2.5 py-1 text-xs font-semibold text-muted ring-1 ring-line">
                    {total} {total === 1 ? "respuesta" : "respuestas"}
                  </span>
                </header>

                {survey.active ? (
                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
                      Marca las comidas que te gustaría ver
                    </p>

                    <div className="grid gap-2 sm:grid-cols-2">
                      {survey.options.map((option) => {
                        const active = selected.includes(option.id);
                        return (
                          <button
                            key={option.id}
                            type="button"
                            aria-pressed={active}
                            onClick={() =>
                              toggleOption(
                                survey.id,
                                option.id,
                                myResponse?.optionIds ?? [],
                              )
                            }
                            className={`flex items-center gap-2.5 rounded-lg border px-3.5 py-2.5 text-left text-sm font-semibold transition ${
                              active
                                ? "border-secondary bg-secondary-50 text-secondary ring-1 ring-secondary/30"
                                : "border-line bg-white text-ink hover:border-slate-300 hover:bg-surface/70"
                            }`}
                          >
                            <span
                              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${
                                active
                                  ? "border-secondary bg-secondary text-white"
                                  : "border-slate-300 bg-white"
                              }`}
                            >
                              {active && <Check size={13} />}
                            </span>
                            <span className="min-w-0">{option.label}</span>
                          </button>
                        );
                      })}
                    </div>

                    <div className="mt-4 flex flex-wrap items-center gap-3">
                      <Button
                        icon={<Vote size={16} />}
                        disabled={selected.length === 0}
                        onClick={() => handleSubmit(survey.id, selected)}
                      >
                        {myResponse ? "Actualizar mi respuesta" : "Enviar respuesta"}
                      </Button>

                      {myResponse && (
                        <span className="text-xs text-muted">
                          Votaste el{" "}
                          {formatShort(myResponse.updatedAt.slice(0, 10))}
                        </span>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="rounded-lg bg-surface/70 px-3.5 py-3 text-sm text-muted">
                    Esta encuesta está cerrada. Estos son los resultados
                    finales.
                  </p>
                )}

                <div className="mt-5 border-t border-line pt-4">
                  <p className="mb-3 flex items-center gap-2 text-sm font-bold text-ink">
                    <ListChecks size={16} className="text-secondary" />
                    Resultados
                  </p>

                  {showResults ? (
                    <SurveyResultsBars
                      results={getSurveyResults(survey.id)}
                      total={getSurveyTotal(survey.id)}
                    />
                  ) : (
                    <p className="rounded-lg bg-surface/70 px-3.5 py-3 text-sm text-muted">
                      Envía tu respuesta para ver los resultados en vivo.
                    </p>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
