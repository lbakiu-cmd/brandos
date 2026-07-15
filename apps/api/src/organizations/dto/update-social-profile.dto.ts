import { SocialProfilePlatform } from "@brandos/database";
import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
} from "class-validator";

export class UpdateSocialProfileDto {
  @IsOptional()
  @IsEnum(SocialProfilePlatform)
  platform?: SocialProfilePlatform;

  @IsOptional()
  @IsUrl({ require_protocol: true })
  @MaxLength(2048)
  profileUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  handle?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  displayName?: string;

  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;
}
