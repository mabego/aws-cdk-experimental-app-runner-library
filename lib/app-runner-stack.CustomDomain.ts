import { AppRunner, type AWSError, Route53 } from "aws-sdk";
import { type PromiseResult, type Request } from "aws-sdk/lib/request";

const apprunner = new AppRunner();
const route53 = new Route53({ region: "us-east-1" });
const certRecordType: string = "CNAME";
const certRecordTTL: number = 300;
const changeAction: string = "UPSERT";

const addCustomDomain = async (
  subdomain: string,
  serviceArn: string,
): Promise<PromiseResult<AppRunner.Types.AssociateCustomDomainResponse, AWSError>> =>
  await apprunner
    .associateCustomDomain({
      DomainName: subdomain,
      ServiceArn: serviceArn,
      EnableWWWSubdomain: false,
    })
    .promise();

const removeCustomDomain = (
  subdomain: string,
  serviceArn: string,
): Request<AppRunner.DisassociateCustomDomainResponse, AWSError> =>
  apprunner.disassociateCustomDomain({
    DomainName: subdomain,
    ServiceArn: serviceArn,
  });

const updateRecord = async (
  hostedZoneId: string,
  name: string,
  value: string,
): Promise<Route53.Types.ChangeResourceRecordSetsResponse> =>
  await route53
    .changeResourceRecordSets({
      HostedZoneId: hostedZoneId,
      ChangeBatch: {
        Changes: [
          {
            Action: changeAction,
            ResourceRecordSet: {
              Name: name,
              Type: certRecordType,
              TTL: certRecordTTL,
              ResourceRecords: [{ Value: value }],
            },
          },
        ],
      },
    })
    .promise();

export async function handler(event: any): Promise<any> {
  const { hostedZoneId, subdomain, serviceArn } = event.ResourceProperties;

  if (event.RequestType === "Delete") {
    removeCustomDomain(subdomain, serviceArn);
    return;
  }

  const domain = await addCustomDomain(subdomain, serviceArn);
  await updateRecord(hostedZoneId, subdomain, domain.DNSTarget);
}
