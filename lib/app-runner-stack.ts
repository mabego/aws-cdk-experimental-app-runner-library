import * as AppRunnerAlpha from "@aws-cdk/aws-apprunner-alpha";
import {
  type App,
  aws_lambda_nodejs,
  custom_resources,
  CustomResource,
  Stack,
  type StackProps,
} from "aws-cdk-lib";
import { type ISecret } from "aws-cdk-lib/aws-secretsmanager";
import { type Vpc } from "aws-cdk-lib/aws-ec2";
import { type HostedZone } from "aws-cdk-lib/aws-route53";
import { PolicyStatement } from "aws-cdk-lib/aws-iam";

export interface AppRunnerStackProps extends StackProps {
  dbSecret: ISecret;
  vpc: Vpc;
  hostedZone: HostedZone;
}

export class AppRunnerStack extends Stack {
  readonly serv: AppRunnerAlpha.Service;

  constructor(scope: App, id: string, props: AppRunnerStackProps) {
    super(scope, id, props);

    const repositoryUrl = this.node.tryGetContext("repositoryUrl") as string;
    const branch = this.node.tryGetContext("branch") as string;
    const containerPort = this.node.tryGetContext("containerPort") as string;
    const subDomain = this.node.tryGetContext("subDomain") as string;

    const vpcConnector = new AppRunnerAlpha.VpcConnector(this, "VpcConnector", {
      vpc: props.vpc,
      vpcSubnets: props.vpc.selectSubnets({ onePerAz: true }),
      vpcConnectorName: "VpcConnector",
    });

    this.serv = new AppRunnerAlpha.Service(this, "Service", {
      source: AppRunnerAlpha.Source.fromGitHub({
        configurationSource: AppRunnerAlpha.ConfigurationSourceType.API,
        codeConfigurationValues: {
          runtime: AppRunnerAlpha.Runtime.GO_1, // The latest Go runtime version appears to be 1.18
          port: containerPort,
          environmentSecrets: {
            DSN: AppRunnerAlpha.Secret.fromSecretsManager(props.dbSecret),
          },
          buildCommand: "go build ./cmd/web/",
          startCommand: "./web",
        },
        connection: AppRunnerAlpha.GitHubConnection.fromConnectionArn(
          `${process.env.CONNECTION ?? ""}`
        ),
        repositoryUrl,
        branch,
      }),
      autoDeploymentsEnabled: true, // Enables continuous integration for the App Runner service
      vpcConnector,
    });

    this.customDomain(subDomain, this.serv.serviceArn, props.hostedZone);
  }

  customDomain(
    subdomain: string,
    serviceArn: string,
    hostedZone: HostedZone
  ): void {
    const provider = new custom_resources.Provider(this, "Provider", {
      onEventHandler: new aws_lambda_nodejs.NodejsFunction(
        this,
        "CustomDomain",
        {
          initialPolicy: [
            new PolicyStatement({
              actions: [
                "apprunner:AssociateCustomDomain",
                "apprunner:DisassociateCustomDomain",
                "route53:changeResourceRecordSets",
              ],
              resources: ["*"],
            }),
          ],
        }
      ),
    });
    void new CustomResource(this, "CustomResource", {
      serviceToken: provider.serviceToken,
      properties: {
        subdomain,
        serviceArn,
        hostedZoneId: hostedZone.hostedZoneId,
      },
    });
  }
}
