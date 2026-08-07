import { WebsiteScanFrequency } from "@brandos/database";
import { IsBoolean, IsEnum, IsOptional, IsUrl, MaxLength } from "class-validator";

export class UpdateWebsiteDto {
  @IsOptional()
  @IsUrl({ require_protocol: true })
  @MaxLength(2048)
  url?: string;

  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;

  @IsOptional()
  @IsEnum(WebsiteScanFrequency)
  scanFrequency?: WebsiteScanFrequency;
}
