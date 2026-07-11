import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export interface Step {
  name: string;
  date?: string;
  /** CSS color for the node. Defaults to the done-green token. */
  color?: string;
}

export interface StepperProps extends HTMLAttributes<HTMLDivElement> {
  steps: Step[];
  current?: number;
  /** Torna cada etapa clicável (ex.: mudar a etapa do produto). */
  onStepClick?: (index: number) => void;
  /** Lista vertical (sheet de contexto no mobile). */
  vertical?: boolean;
}

/**
 * Horizontal product-stage bar. Steps before `current` render filled +
 * connected; the current step glows; future steps are hollow.
 * Node color rides on currentColor so per-step colors stay one inline style.
 * With `vertical`, renders as a top-down list (mobile context sheet).
 */
export function Stepper({
  steps,
  current = 0,
  onStepClick,
  vertical = false,
  className,
  ...rest
}: StepperProps) {
  const Cell = onStepClick ? "button" : "div";
  if (vertical) {
    return (
      <div className={cn("flex flex-col", className)} {...rest}>
        {steps.map((s, i) => {
          const isDone = i < current;
          const isCurrent = i === current;
          const color = s.color ?? "var(--color-status-done)";
          return (
            <Cell
              key={s.name}
              {...(onStepClick && {
                type: "button" as const,
                title: `Mover para ${s.name}`,
                onClick: () => onStepClick(i),
              })}
              className={cn(
                "flex min-h-11 items-stretch gap-3 text-left",
                onStepClick && "group cursor-pointer",
              )}
            >
              <div className="flex w-5 flex-col items-center" style={{ color }}>
                <div
                  className={cn(
                    "w-0.5 flex-1",
                    i === 0
                      ? "bg-transparent"
                      : i <= current
                        ? "bg-status-done/33"
                        : "bg-line-strong",
                  )}
                />
                <div
                  className={cn(
                    "shrink-0 rounded-full",
                    isDone &&
                      "size-[13px] bg-current [box-shadow:0_0_0_3px_color-mix(in_srgb,currentColor_12%,transparent)]",
                    isCurrent &&
                      "size-[17px] bg-current [box-shadow:0_0_0_4px_color-mix(in_srgb,currentColor_17%,transparent),0_0_14px_color-mix(in_srgb,currentColor_47%,transparent)]",
                    !isDone &&
                      !isCurrent &&
                      "size-[11px] border-[1.5px] border-line-hover bg-surface-3",
                  )}
                />
                <div
                  className={cn(
                    "w-0.5 flex-1",
                    i === steps.length - 1
                      ? "bg-transparent"
                      : i < current
                        ? "bg-status-done/33"
                        : "bg-line-strong",
                  )}
                />
              </div>
              <div className="flex min-w-0 flex-1 items-center gap-2 py-2.5">
                <span
                  className={cn(
                    "text-[13.5px]",
                    isCurrent
                      ? "font-semibold text-fg-1"
                      : isDone
                        ? "font-medium text-fg-6"
                        : "font-medium text-fg-8",
                    onStepClick && !isCurrent && "group-hover:text-fg-2",
                  )}
                >
                  {s.name}
                </span>
                {(isDone || isCurrent) && s.date && (
                  <span
                    className={cn(
                      "ml-auto text-[11.5px] font-medium",
                      isDone && "text-fg-6",
                    )}
                    style={isCurrent ? { color } : undefined}
                  >
                    {s.date}
                  </span>
                )}
              </div>
            </Cell>
          );
        })}
      </div>
    );
  }
  return (
    <div className={cn("flex items-start", className)} {...rest}>
      {steps.map((s, i) => {
        const isDone = i < current;
        const isCurrent = i === current;
        const color = s.color ?? "var(--color-status-done)";
        const lineDone = "bg-status-done/33";
        const lineIdle = "bg-line-strong";
        return (
          <Cell
            key={s.name}
            {...(onStepClick && {
              type: "button" as const,
              title: `Mover para ${s.name}`,
              onClick: () => onStepClick(i),
            })}
            className={cn(
              "flex min-w-0 flex-1 flex-col items-center gap-2.5",
              onStepClick && "group cursor-pointer",
            )}
          >
            <div
              className="flex h-5 w-full items-center justify-center"
              style={{ color }}
            >
              <div
                className={cn(
                  "h-0.5 flex-1",
                  i === 0
                    ? "bg-transparent"
                    : i <= current
                      ? lineDone
                      : lineIdle,
                )}
              />
              <div
                className={cn(
                  "shrink-0 rounded-full",
                  isDone &&
                    "size-[15px] bg-current [box-shadow:0_0_0_3px_color-mix(in_srgb,currentColor_12%,transparent)]",
                  isCurrent &&
                    "size-[19px] bg-current [box-shadow:0_0_0_5px_color-mix(in_srgb,currentColor_17%,transparent),0_0_16px_color-mix(in_srgb,currentColor_47%,transparent)]",
                  !isDone &&
                    !isCurrent &&
                    "size-[13px] border-[1.5px] border-line-hover bg-surface-3",
                )}
              />
              <div
                className={cn(
                  "h-0.5 flex-1",
                  i === steps.length - 1
                    ? "bg-transparent"
                    : i < current
                      ? lineDone
                      : lineIdle,
                )}
              />
            </div>
            <div
              className={cn(
                "whitespace-nowrap px-1.5 text-center text-xs",
                isCurrent
                  ? "font-semibold text-fg-1"
                  : isDone
                    ? "font-medium text-fg-6"
                    : "font-medium text-fg-8",
                onStepClick && !isCurrent && "group-hover:text-fg-2",
              )}
            >
              {s.name}
            </div>
            {(isDone || isCurrent) && s.date && (
              <div
                className={cn("text-[11px] font-medium", isDone && "text-fg-6")}
                style={isCurrent ? { color } : undefined}
              >
                {s.date}
              </div>
            )}
          </Cell>
        );
      })}
    </div>
  );
}
