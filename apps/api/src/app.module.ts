import { Module } from "@nestjs/common";
import { AppController } from "./app.controller";
import { AuthModule } from "./auth/auth.module";
import { IntegrationsModule } from "./integrations/integrations.module";
import { WidgetsModule } from "./widgets/widgets.module";
import { AuditsModule } from "./audits/audits.module";
import { VisibilityModule } from "./visibility/visibility.module";
import { BusinessModule } from "./business/business.module";
import { CompetitorsModule } from "./competitors/competitors.module";
import { ReviewsModule } from "./reviews/reviews.module";
import { BillingModule } from "./billing/billing.module";
import { CopilotModule } from "./copilot/copilot.module";
import { WordpressModule } from "./wordpress/wordpress.module";
import { OAuthModule } from "./oauth/oauth.module";
import { MailModule } from "./mail/mail.module";

@Module({
  controllers: [AppController],
  imports: [
    AuthModule,
    MailModule,
    IntegrationsModule,
    OAuthModule,
    WidgetsModule,
    AuditsModule,
    VisibilityModule,
    BusinessModule,
    CompetitorsModule,
    ReviewsModule,
    BillingModule,
    CopilotModule,
    WordpressModule,
  ],
})
export class AppModule {}