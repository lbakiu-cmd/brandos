import { IsBoolean, IsOptional, IsUrl, MaxLength } from "class-validator";

export class CreateWebsiteDto {
  @IsUrl({ require_protocol: true })
  @MaxLength(2048)
  url!: string;

  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;
}
