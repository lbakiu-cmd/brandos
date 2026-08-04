import {
  BusinessTaskPriority,
  BusinessTaskStatus,
} from "@brandos/database";
import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from "class-validator";

export class UpdateBusinessTaskDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(180)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsOptional()
  @IsEnum(BusinessTaskStatus)
  status?: BusinessTaskStatus;

  @IsOptional()
  @IsEnum(BusinessTaskPriority)
  priority?: BusinessTaskPriority;

  @IsOptional()
  @IsDateString()
  dueDate?: string;
}
