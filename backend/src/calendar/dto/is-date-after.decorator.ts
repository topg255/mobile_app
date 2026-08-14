import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

@ValidatorConstraint({ name: 'isDateAfter', async: false })
export class IsDateAfterConstraint implements ValidatorConstraintInterface {
  validate(value: unknown, args: ValidationArguments): boolean {
    if (value === undefined || value === null || value === '') return true;
    const related = (args.object as Record<string, unknown>)[
      args.constraints[0]
    ];
    if (related === undefined || related === null) return true;
    const date = new Date(value as string | Date);
    const other = new Date(related as string | Date);
    if (isNaN(date.getTime()) || isNaN(other.getTime())) return false;
    return date.getTime() > other.getTime();
  }

  defaultMessage(): string {
    return 'La date de fin doit etre apres la date de debut';
  }
}

export function IsDateAfter(
  property: string,
  validationOptions?: ValidationOptions,
) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options: validationOptions,
      constraints: [property],
      validator: IsDateAfterConstraint,
    });
  };
}