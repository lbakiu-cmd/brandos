import { BusinessRecommendationStatus } from "@brandos/database";
import { IsIn } from "class-validator";

export class UpdateBusinessRecommendationDto {
  @IsIn([
    BusinessRecommendationStatus.OPEN,
    BusinessRecommendationStatus.DONE,
    BusinessRecommendationStatus.IGNORED,
  ])
  status!: "OPEN" | "DONE" | "IGNORED";
}
