import { useState } from "react";
import { ClipboardList, Plus, Trash, X } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { useToast } from "@/context/ToastContext";
import { PageHeader } from "@/components/ui/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Field, inputCls } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { Switch } from "@/components/ui/Switch";
import { SurveyResultsBars } from "@/components/survey/SurveyResultsBars";
import { countSurveyResponses } from "@/utils/surveyUtils";
import type { Survey } from "@/types";

const EMPTY_FORM = {
  title: "",
  question: "",
  options: ["", ""],
};

const MAX_OPTIONS = 10;

export function SurveyManagementPage() {
  const { surveys, surveyResponses, createSurvey, toggleSurvey, deleteSurvey } =
    useApp();
  const { push } = useToast();

  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState("");
  const [toDelete, setToDelete] = useState<Survey | null>(null);

  const ordered = [...surveys].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setFormError("");
    setCreateOpen(true);
  };

  const setOption = (index: number, value: string) => {
    setForm((f) => ({
      ...f,
      options: f.options.map((o, i) => (i === index ? value : o)),
    }));
  };

  const addOption = () => {
    setForm((f) =>
      f.options.length >= MAX_OPTIONS ? f : { ...f, options: [...f.options, ""] },
    );
  };

  const removeOption = (index: number) => {
    setForm((f) => ({ ...f, options: f.options.filter((_, i) => i !== index) }));
  };

  const handleCreate = async () => {
    const options = form.options.map((o) => o.trim());

    if (!form.title.trim() || !form.question.trim()) {
      setFormError("El título y la pregunta son obligatorios.");
      return;
    }
    if (options.some((o) => !o)) {
      setFormError("Completa o elimina las opciones vacías.");
      return;
    }

    const result = await createSurvey({
      title: form.title,
      question: form.question,
      options,
    });

    if (result.ok) {
      push("success", result.message);
      setCreateOpen(false);
    } else {
      setFormError(result.message);
    }
  };

  const handleToggle = async (survey: Survey) => {
    const result = await toggleSurvey(survey.id);
    push(result.ok ? "info" : "error", result.message);
  };

  const handleDelete = async () => {
    if (!toDelete) return;
    const result = await deleteSurvey(toDelete.id);
    if (result.ok) {
      push("success", result.message);
      setToDelete(null);
    } else {
      push("error", result.message);
    }
  };

  return (
    <div>
      <PageHeader
        title="Encuestas"
        subtitle="Crea encuestas sobre las comidas que desean los estudiantes y revisa los resultados."
        actions={
          <Button icon={<Plus size={16} />} onClick={openCreate}>
            Nueva encuesta
          </Button>
        }
      />

      {ordered.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="No hay encuestas creadas."
          description="Crea la primera encuesta para saber qué comidas quieren los estudiantes."
          action={
            <Button icon={<Plus size={16} />} onClick={openCreate}>
              Nueva encuesta
            </Button>
          }
        />
      ) : (
        <div className="space-y-6">
          {ordered.map((survey) => {
            const total = countSurveyResponses(surveyResponses, survey.id);

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
                      <span className="font-mono text-xs text-muted">
                        {survey.id}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-muted">{survey.question}</p>
                  </div>

                  <span className="shrink-0 rounded-lg bg-surface px-2.5 py-1 text-xs font-semibold text-muted ring-1 ring-line">
                    {total} {total === 1 ? "respuesta" : "respuestas"}
                  </span>
                </header>

                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">
                  Resultados ({survey.options.length}{" "}
                  {survey.options.length === 1 ? "opción" : "opciones"})
                </p>

                <SurveyResultsBars survey={survey} responses={surveyResponses} />

                <footer className="mt-5 flex flex-wrap items-center justify-between gap-4 border-t border-line pt-4">
                  <div className="min-w-[240px] flex-1">
                    <Switch
                      checked={survey.active}
                      onChange={() => handleToggle(survey)}
                      label={survey.active ? "Abierta para votar" : "Cerrada"}
                      description={
                        survey.active
                          ? "Los estudiantes pueden votar y editar su respuesta."
                          : "Solo se muestran los resultados."
                      }
                    />
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    icon={<Trash size={15} />}
                    onClick={() => setToDelete(survey)}
                  >
                    Eliminar
                  </Button>
                </footer>
              </article>
            );
          })}
        </div>
      )}

      {/* Crear encuesta */}
      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Nueva encuesta"
        description="Los estudiantes podrán marcar todas las comidas que deseen."
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreate}>Crear encuesta</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Título" htmlFor="enc-titulo">
            <input
              id="enc-titulo"
              type="text"
              className={inputCls}
              placeholder="Ej. Menú preferido de noviembre"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            />
          </Field>

          <Field
            label="Pregunta"
            htmlFor="enc-pregunta"
            hint="Se muestra tal cual a los estudiantes."
          >
            <input
              id="enc-pregunta"
              type="text"
              className={inputCls}
              placeholder="¿Qué comidas te gustaría ver este mes?"
              value={form.question}
              onChange={(e) =>
                setForm((f) => ({ ...f, question: e.target.value }))
              }
            />
          </Field>

          <div>
            <p className="mb-1.5 text-sm font-semibold text-ink">
              Opciones ({form.options.length}/{MAX_OPTIONS})
            </p>

            <div className="space-y-2">
              {form.options.map((option, index) => (
                <div key={index} className="flex items-center gap-2">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-surface text-xs font-bold text-muted ring-1 ring-line">
                    {index + 1}
                  </span>
                  <input
                    type="text"
                    className={inputCls}
                    placeholder={`Ej. Lomo saltado`}
                    aria-label={`Opción ${index + 1}`}
                    value={option}
                    onChange={(e) => setOption(index, e.target.value)}
                  />
                  <button
                    type="button"
                    aria-label={`Eliminar opción ${index + 1}`}
                    disabled={form.options.length <= 2}
                    onClick={() => removeOption(index)}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-line bg-white text-muted transition hover:border-danger/50 hover:text-danger disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}
            </div>

            <Button
              variant="ghost"
              size="sm"
              className="mt-2"
              icon={<Plus size={15} />}
              disabled={form.options.length >= MAX_OPTIONS}
              onClick={addOption}
            >
              Añadir opción
            </Button>
          </div>

          {formError && (
            <p className="rounded-lg bg-danger-50 px-3.5 py-2.5 text-sm font-medium text-danger-700">
              {formError}
            </p>
          )}
        </div>
      </Modal>

      {/* Confirmar eliminación */}
      <Modal
        open={toDelete !== null}
        onClose={() => setToDelete(null)}
        title="Eliminar encuesta"
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setToDelete(null)}>
              Cancelar
            </Button>
            <Button variant="danger" onClick={handleDelete}>
              Eliminar encuesta
            </Button>
          </>
        }
      >
        {toDelete && (
          <p className="text-sm text-muted">
            Se eliminará la encuesta{" "}
            <span className="font-semibold text-ink">«{toDelete.title}»</span>{" "}
            junto con sus{" "}
            {countSurveyResponses(surveyResponses, toDelete.id)}{" "}
            {countSurveyResponses(surveyResponses, toDelete.id) === 1
              ? "respuesta"
              : "respuestas"}
            . Esta acción no se puede deshacer.
          </p>
        )}
      </Modal>
    </div>
  );
}
