import { useCallback, useEffect, useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { useNavigate, useParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import LevelRadio from "@/components/assessment/LevelRadio";
import SkillPicker from "@/components/assessment/SkillPicker";
import FieldError from "@/components/FieldError";
import LoadError from "@/components/LoadError";
import { vacanciesApi } from "@/services/vacancies";
import { getApiErrorMessage, getApiErrorStatus } from "@/lib/apiError";
import { MAX_TEXT_FIELD_LENGTH, requiredText } from "@/utils/validation";
import { ArrowLeft, Plus, X, Loader2 } from "lucide-react";
import type { VacancySkill } from "@/types";

interface VacancyFormValues {
  role_title: string;
  culture_dimensions: string;
  competency_expectations: string;
  skills: Partial<VacancySkill>[];
}

export default function VacancyEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  // Saved skills the assessor removed; the API only deletes nested rows marked _destroy.
  const [removedSkillIds, setRemovedSkillIds] = useState<number[]>([]);

  const {
    register,
    handleSubmit,
    control,
    setValue,
    getValues,
    watch,
    reset,
    formState: { errors },
  } = useForm<VacancyFormValues>({
    defaultValues: {
      role_title: "",
      culture_dimensions: "",
      competency_expectations: "",
      skills: [],
    },
  });
  const { fields, append, remove } = useFieldArray({ control, name: "skills" });

  const loadVacancy = useCallback(() => {
    setLoading(true);
    setLoadError(null);
    vacanciesApi
      .get(Number(id))
      .then((res) => {
        const v = res.data.vacancy;
        reset({
          role_title: v.role_title,
          culture_dimensions: v.culture_dimensions,
          competency_expectations: v.competency_expectations,
          skills: v.skills,
        });
        setRemovedSkillIds([]);
      })
      .catch((requestError: unknown) =>
        setLoadError(
          getApiErrorStatus(requestError) === 404
            ? "This vacancy doesn't exist or was deleted."
            : getApiErrorMessage(requestError, "Failed to load the vacancy."),
        ),
      )
      .finally(() => setLoading(false));
  }, [id, reset]);

  useEffect(() => {
    loadVacancy();
  }, [loadVacancy]);

  const removeSkill = (index: number) => {
    const savedId = getValues(`skills.${index}.id`);
    if (savedId) setRemovedSkillIds((prev) => [...prev, savedId]);
    remove(index);
  };

  const onSubmit = async (data: VacancyFormValues) => {
    setError(null);
    setSubmitting(true);
    try {
      await vacanciesApi.update(Number(id), {
        role_title: data.role_title.trim(),
        culture_dimensions: data.culture_dimensions,
        competency_expectations: data.competency_expectations,
        vacancy_skills_attributes: [
          ...data.skills,
          ...removedSkillIds.map((skillId) => ({ id: skillId, _destroy: true })),
        ],
      });
      navigate("/vacancies");
    } catch (requestError: unknown) {
      setError(getApiErrorMessage(requestError, "Failed to save vacancy."));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading)
    return (
      <div className="max-w-2xl mx-auto space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-full" />
      </div>
    );

  if (loadError)
    return (
      <div className="max-w-2xl mx-auto space-y-4">
        <Link to="/vacancies" className="text-sm text-muted-foreground hover:text-foreground">
          ← Back to vacancies
        </Link>
        <LoadError message={loadError} onRetry={loadVacancy} />
      </div>
    );

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-2 mb-6">
        <Link to="/vacancies" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <span className="text-sm font-medium">Edit Vacancy</span>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="space-y-1.5">
          <Label htmlFor="role_title">
            Role title <span className="text-destructive">*</span>
          </Label>
          <Input
            id="role_title"
            maxLength={MAX_TEXT_FIELD_LENGTH}
            aria-invalid={!!errors.role_title}
            {...register("role_title", requiredText("Role title is required"))}
          />
          <FieldError message={errors.role_title?.message} />
        </div>
        <Separator />
        <div className="space-y-3">
          <Label>Expected skills</Label>
          {fields.map((field, index) => (
            <div key={field.id} className="border rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{watch(`skills.${index}.skill_label`)}</span>
                <button
                  type="button"
                  onClick={() => removeSkill(index)}
                  className="text-muted-foreground hover:text-destructive"
                  aria-label="Remove skill"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <LevelRadio
                value={watch(`skills.${index}.expected_level`) ?? 3}
                onChange={(v) => setValue(`skills.${index}.expected_level`, v)}
              />
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" onClick={() => setPickerOpen(true)}>
            <Plus className="h-3.5 w-3.5 mr-1" /> Add skill
          </Button>
        </div>
        <Separator />
        <div className="space-y-1.5">
          <Label htmlFor="culture_dimensions">Company culture</Label>
          <Textarea id="culture_dimensions" rows={3} {...register("culture_dimensions")} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="competency_expectations">Competency expectations</Label>
          <Textarea
            id="competency_expectations"
            rows={3}
            {...register("competency_expectations")}
          />
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => navigate("/vacancies")}>
            Cancel
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Save Changes
          </Button>
        </div>
      </form>

      <SkillPicker
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        onSelect={(s) =>
          append({ skill_id: s.skill_id, skill_label: s.skill_label, expected_level: 3 })
        }
        addedLabels={watch("skills").map((s) => s.skill_label ?? "")}
      />
    </div>
  );
}
