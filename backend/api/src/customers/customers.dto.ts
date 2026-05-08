import { IsArray, IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateCustomerDto {
  @IsString()
  @MinLength(2)
  fullName: string;

  @IsString()
  phone: string;

  @IsOptional() @IsEmail()
  email?: string;

  @IsOptional() @IsString()
  documentId?: string;

  @IsOptional() @IsString()
  notes?: string;

  @IsOptional() @IsArray() @IsString({ each: true })
  tags?: string[];
}

export class UpdateCustomerDto extends CreateCustomerDto {}
