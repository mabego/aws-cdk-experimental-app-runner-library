import type * as AppRunnerAlpha from "@aws-cdk/aws-apprunner-alpha";
import {
  type App,
  aws_lambda_nodejs,
  custom_resources,
  CustomResource,
  Stack,
  type StackProps,
} from "aws-cdk-lib";
import { type HostedZone } from "aws-cdk-lib/aws-route53";
import { PolicyStatement } from "aws-cdk-lib/aws-iam";

export interface AppRunnerCertStackProps extends StackProps {
  hostedZone: HostedZone;
  serv: AppRunnerAlpha.Service;
}

export class AppRunnerCertStack extends Stack {
  constructor(scope: App, id: string, props: AppRunnerCertStackProps) {
    super(scope, id, props);

    const subDomain = this.node.tryGetContext("subDomain") as string;

    this.certValidation(subDomain, props.serv, props.hostedZone);
  }

  certValidation(subdomain: string, service: AppRunnerAlpha.Service, hostedZone: HostedZone): void {
    const provider = new custom_resources.Provider(this, "Provider", {
      onEventHandler: new aws_lambda_nodejs.NodejsFunction(this, "CertValidation", {
        initialPolicy: [
          new PolicyStatement({
            actions: ["route53:changeResourceRecordSets", "apprunner:DescribeCustomDomains"],
            resources: ["*"],
          }),
        ],
      }),
    });
    void new CustomResource(this, "CustomResource", {
      serviceToken: provider.serviceToken,
      properties: {
        subdomain,
        serviceArn: service.serviceArn,
        hostedZoneId: hostedZone.hostedZoneId,
      },
    });
  }
}
