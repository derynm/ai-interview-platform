import { useState, type ReactNode } from "react";
import { useForm } from "react-hook-form";
import { CheckCircle2 } from "lucide-react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import FieldError from "@/components/FieldError";
import { MAX_TEXT_FIELD_LENGTH, requiredText } from "@/utils/validation";

interface DemoRequestValues {
  name: string;
  email: string;
  company: string;
  message: string;
}

const EMPTY_VALUES: DemoRequestValues = { name: "", email: "", company: "", message: "" };

// Demo-only: the request is validated and acknowledged in the browser, never sent to the API.
// `trigger` must be a single focusable element, such as a button.
export default function DemoRequestDialog({ trigger }: { trigger: ReactNode }) {
  const [submitted, setSubmitted] = useState<DemoRequestValues | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<DemoRequestValues>({ defaultValues: EMPTY_VALUES });

  const handleOpenChange = (open: boolean) => {
    // Start from a blank form each time the dialog is reopened.
    if (!open) {
      setSubmitted(null);
      reset(EMPTY_VALUES);
    }
  };

  return (
    <Dialog onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[calc(100vh-2rem)] overflow-y-auto sm:max-w-md">
        {submitted ? (
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <CheckCircle2 className="h-12 w-12 text-primary duration-500 animate-in zoom-in-50 motion-reduce:animate-none" />
            <DialogTitle>Thanks, {submitted.name.trim()}!</DialogTitle>
            <DialogDescription>
              We'll reach out at {submitted.email.trim()} to set up a walkthrough for{" "}
              {submitted.company.trim()}.
            </DialogDescription>
            <DialogClose asChild>
              <Button className="mt-2">Done</Button>
            </DialogClose>
          </div>
        ) : (
          <form onSubmit={handleSubmit(setSubmitted)} noValidate className="space-y-4">
            <DialogHeader>
              <DialogTitle>Request a demo</DialogTitle>
              <DialogDescription>
                Tell us about your team and we'll walk you through an interview, the live coverage
                monitor, and the evidence behind each rating.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-2">
              <Label htmlFor="demo-name">
                Full name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="demo-name"
                autoComplete="name"
                maxLength={MAX_TEXT_FIELD_LENGTH}
                aria-invalid={!!errors.name}
                {...register("name", requiredText("Enter your name"))}
              />
              <FieldError message={errors.name?.message} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="demo-email">
                Work email <span className="text-destructive">*</span>
              </Label>
              <Input
                id="demo-email"
                type="email"
                autoComplete="email"
                maxLength={MAX_TEXT_FIELD_LENGTH}
                aria-invalid={!!errors.email}
                {...register("email", {
                  ...requiredText("Enter your work email"),
                  pattern: { value: /^\S+@\S+\.\S+$/, message: "Enter a valid email address" },
                })}
              />
              <FieldError message={errors.email?.message} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="demo-company">
                Company <span className="text-destructive">*</span>
              </Label>
              <Input
                id="demo-company"
                autoComplete="organization"
                maxLength={MAX_TEXT_FIELD_LENGTH}
                aria-invalid={!!errors.company}
                {...register("company", requiredText("Enter your company"))}
              />
              <FieldError message={errors.company?.message} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="demo-message">Which roles are you hiring for?</Label>
              <Textarea
                id="demo-message"
                rows={3}
                maxLength={1000}
                placeholder="e.g. Frontend and data engineers"
                {...register("message")}
              />
            </div>

            <DialogFooter className="gap-2 pt-2 sm:gap-0">
              <DialogClose asChild>
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </DialogClose>
              <Button type="submit">Send request</Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
