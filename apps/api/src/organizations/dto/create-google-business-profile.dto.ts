import { IsOptional, IsString, IsUrl, MaxLength } from "class-validator";

export class CreateGoogleBusinessProfileDto {
  @IsUrl({ require_protocol: true })
  @MaxLength(2048)
  profileUrl!: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  placeId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  businessName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  address?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  city?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  country?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  phone?: string;

  @IsOptional()
  @IsUrl({ require_protocol: true })
  @MaxLength(2048)
  websiteUrl?: string;
}
