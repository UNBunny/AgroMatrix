import { Check } from 'lucide-react'

export interface StepperStep {
  num: number
  label: string
}

interface StepperProps {
  steps: StepperStep[]
  current: number
}

/**
 * Пошаговый индикатор для wizard-форм.
 * Извлечён из FieldWizardPage для переиспользования.
 */
export function Stepper({ steps, current }: StepperProps) {
  return (
    <div className="stepper">
      {steps.map((step, i) => {
        const isCompleted = current > step.num
        const isActive = current === step.num

        return (
          <div
            key={step.num}
            className={`stepper-step${isCompleted ? ' completed' : ''}${isActive ? ' active' : ''}`}
            style={{ flex: i < steps.length - 1 ? 1 : 0 }}
          >
            <div className="stepper-indicator">
              {isCompleted ? <Check size={14} /> : step.num}
            </div>
            <span className="stepper-label">{step.label}</span>
            {i < steps.length - 1 && (
              <div className={`stepper-line${isCompleted ? ' completed' : ''}`} />
            )}
          </div>
        )
      })}
    </div>
  )
}

