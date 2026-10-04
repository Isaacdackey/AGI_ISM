import { ValidationArguments, ValidatorConstraint, ValidatorConstraintInterface } from 'class-validator';

/** Année entre 2000 et année courante + 1 (borne haute dynamique, plus de 2030 en dur). */
@ValidatorConstraint({ name: 'maxAcademicYear', async: false })
export class MaxAcademicYearConstraint implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    if (typeof value !== 'number' || !Number.isInteger(value)) return false;
    return value >= 2000 && value <= new Date().getFullYear() + 1;
  }

  defaultMessage(_args: ValidationArguments): string {
    return `Année invalide (2000–${new Date().getFullYear() + 1})`;
  }
}
