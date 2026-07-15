import { WebsiteAuditFindingStatus } from "@brandos/database";
import { IsIn } from "class-validator";

export class UpdateWebsiteAuditFindingDto {
  @IsIn([WebsiteAuditFindingStatus.RESOLVED, WebsiteAuditFindingStatus.IGNORED])
  status!: "RESOLVED" | "IGNORED";
}
