import { BusinessTaskPriority, BusinessTaskSourceType } from "@brandos/database";
import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from "class-validator";

export class CreateBusinessTaskDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(180)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsOptional()
  @IsEnum(BusinessTaskPriority)
  priority?: BusinessTaskPriority;

  @IsOptional()
  @IsEnum(BusinessTaskSourceType)
  sourceType?: BusinessTaskSourceType;

  @IsOptional()
  @IsDateString()
  dueDate?: string;
}
